"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { processBatch } from "@/lib/batch-processor";
import { createJob } from "@/lib/job-manager";
import { extractPdfData, extractPdfDataBatch, matchPdfsToPapers, PDFMatch } from "@/lib/pdf-utils";
import { CustomField, Paper } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";
import { addFile } from "@/lib/files-manager";

export default function ExtractFields() {
  const [mode, setMode] = useState<"fulltext" | "abstract">("abstract");
  const [file, setFile] = useState<File | null>(null);
  const [pdfFolder, setPdfFolder] = useState<FileList | null>(null);
  const [pdfData, setPdfData] = useState<Array<{
    title?: string;
    authors?: string;
    year?: string;
    doi?: string;
    filename?: string;
    fulltext?: string;
  }>>([]);
  const [extractDesign, setExtractDesign] = useState(true);
  const [extractMethod, setExtractMethod] = useState(true);
  const [customFields, setCustomFields] = useState<Array<CustomField>>([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [pdfMatches, setPdfMatches] = useState<PDFMatch[]>([]);

  const validateCsvColumns = (csvData: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const requiredColumns = ['title', 'abstract', "doi"];
          const missingColumns = requiredColumns.filter(
            col => !headers.some(header => header.toLowerCase() === col.toLowerCase())
          );

          if (missingColumns.length > 0) {
            toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
            resolve(false);
          } else {
            const paperCount = results.data.length;
            toast.success(`CSV file validated successfully! Found ${paperCount} papers.`);
            resolve(true);
          }
        },
        error: (error: any) => {
          toast.error("Error parsing CSV file");
          reject(error);
        }
      });
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        // Validate CSV columns
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            const csvData = event.target.result as string;
            const isValid = await validateCsvColumns(csvData);
            if (isValid) {
              setFile(selectedFile);

              // If we have PDFs selected, try to match them
              if (pdfFolder && pdfFolder.length > 0) {
                await performMatching(pdfFolder);
              }
            } else {
              setFile(null);
            }
          }
        };
        reader.readAsText(selectedFile);
      } else {
        toast.error("Invalid file format. Please upload a CSV file.");
      }
    }
  };

    const handlePdfFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const pdfFiles = Array.from(e.target.files);
      
      setProcessingPdfs(true);
      setProcessingProgress({ current: 0, total: pdfFiles.length });
      
      toast("Extracting PDF data, please wait...");
      console.time("Extracting PDF data");
      
      try {
        // Use batch processing to avoid multiple worker instances
        const pdfDataResults = await extractPdfDataBatch(
          pdfFiles,
          (current, total, fileName) => {
            // Update progress
            setProcessingProgress({ current, total });
            const progress = Math.round((current / total) * 100);
            console.log(`Processing ${fileName} (${current}/${total} - ${progress}%)`);
          }
        );
        
        console.timeEnd("Extracting PDF data");
        setPdfData(pdfDataResults);
        setPdfFolder(e.target.files);
        toast.success(`Successfully processed ${e.target.files.length} PDF files`);

        // If we have a CSV file selected, try to match the PDFs
        if (file) {
          await performMatching(e.target.files);
        }
      } catch (error) {
        console.error("Error processing PDFs:", error);
        toast.error("Error processing PDF files");
      } finally {
        setProcessingPdfs(false);
        setProcessingProgress({ current: 0, total: 0 });
      }
    }
  };

  const performMatching = async (pdfFiles: FileList) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string;
          const results = await new Promise<Papa.ParseResult<any>>(
            (resolve, reject) => {
              Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results),
                error: (error: any) => reject(error),
              });
            }
          );

          const papers = (results.data as any[]).map((row, index) => {
            const normalizedRow: { [key: string]: string } = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase()] = row[key] || "";
            });

            return {
              id: index + 1,
              title: normalizedRow.title || "",
              abstract: normalizedRow.abstract || "",
              authors: normalizedRow.authors || "",
              doi: normalizedRow.doi || "",
              keywords: normalizedRow.keywords || "",
            };
          }) as Paper[];

          // Perform the matching using the extracted PDF data and CSV papers
          if (pdfData.length > 0) {
            const matches = matchPdfsToPapers(pdfData, papers);
            setPdfMatches(matches);

            if (matches.length > 0) {
              toast.success(`Successfully matched ${matches.length} PDF files to CSV entries`);
              console.log('PDF Matches:', matches);
            } else {
              toast.warning("No PDF files could be matched to CSV entries. Files will be processed based on filename similarity.");
            }
          }
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error matching PDFs:", error);
      toast.error("Error matching PDF files to CSV entries");
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: "", instruction: "" }]);
  };

  const updateCustomField = (
    index: number,
    field: "name" | "instruction",
    value: string
  ) => {
    const updatedFields = [...customFields];
    updatedFields[index][field] = value;
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast("No file selected. Please upload a CSV file.");
      return;
    }

    if (mode === "fulltext" && (!pdfFolder || pdfFolder.length === 0)) {
      toast.error("Please select a folder with PDF files for full text mode.");
      return;
    }

    try {
      // Create fields configuration
      const fields = {
        design: extractDesign,
        method: extractMethod,
        custom: customFields.map((field) => ({
          name: field.name,
          instruction: field.instruction,
        })),
      };
      // Create and start the job

      // Process the CSV file
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string;
          const results = await new Promise<Papa.ParseResult<any>>(
            (resolve, reject) => {
              Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results),
                error: (error: any) => reject(error),
              });
            }
          );

          const papers = (results.data as any[]).map((row, index) => {
            // Create a case-insensitive mapping of the row data
            const normalizedRow: { [key: string]: string } = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase()] = row[key] || "";
            });

            return {
              id: index + 1, // Simple ID generation based on index
              title: normalizedRow.title || "",
              abstract: normalizedRow.abstract || "",
              authors: normalizedRow.authors || "",
              doi: normalizedRow.doi || "",
              keywords: normalizedRow.keywords || "",
            };
          }) as Paper[];
          const p = papers.splice(0, 10)
          const job = await createJob({
            filename: file.name,
            mode,
            fields,
            status: "in_progress",
            progress: 0,
            total: p.length,
            created: new Date(),
            updated: new Date(),
            ...(mode === "fulltext" && pdfFolder && { pdfFiles: pdfFolder }),
          });
          await addFile(job.id, file, file.name);
          await processBatch.start(job.id, p); // Process first 10 papers

          toast("Job started. Your extraction job has been started.");
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error starting job:", error);
      toast("Failed to start extraction job");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Extraction Mode</h3>
          <p className="text-sm text-muted-foreground">
            Choose how to extract information from papers
          </p>
        </div>

        <RadioGroup
          value={mode}
          onValueChange={(value) => {
            setMode(value as "fulltext" | "abstract");
            // Clear PDF-related state when switching to abstract mode
            if (value === "abstract") {
              setPdfFolder(null);
              setPdfMatches([]);
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="abstract" id="abstract" />
            <Label htmlFor="abstract">Title and Abstract Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fulltext" id="fulltext" />
            <Label htmlFor="fulltext">Full Text (Requires PDF download)</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Upload Papers</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with the following required columns: Title, Abstract, Authors, Keywords, DOI
          </p>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="csv">CSV File</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
          {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
        </div>

        {mode === "fulltext" && (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="pdf-folder">PDF Files</Label>
            <Input
              id="pdf-folder"
              type="file"
              accept=".pdf"
              multiple
              {...({ webkitdirectory: "" } as any)}
              onChange={handlePdfFolderChange}
              disabled={processingPdfs}
            />
            {processingPdfs && (
              <div className="text-sm text-muted-foreground">
                Processing PDFs: {processingProgress.current}/{processingProgress.total}
              </div>
            )}
            {pdfFolder && pdfFolder.length > 0 && !processingPdfs && (
              <p className="text-sm text-muted-foreground">
                {pdfFolder.length} PDF files selected and processed
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Select a folder containing PDF files. Files will be matched to CSV entries using metadata.
            </p>
          </div>
        )}

        {mode === "fulltext"  && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">PDF Matching Results</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pdfFolder && performMatching(pdfFolder)}
                className="text-xs"
              >
                Re-match Files
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {pdfMatches.slice(0, 5).map((match, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <div className="font-medium">{match.pdfData.filename}</div>
                  <div className="text-muted-foreground">
                    → {match.paper.title.substring(0, 50)}...
                  </div>
                  <div className="text-green-600">
                    {Math.round(match.confidence * 100)}% confidence ({match.matchType} match)
                  </div>
                </div>
              ))}
              {pdfMatches.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  ...and {pdfMatches.length - 5} more matches
                </div>
              )}
              {pdfMatches.length === 0 && pdfData.length > 0 && (
                <div className="text-xs text-muted-foreground p-2 bg-yellow-50 rounded">
                  No matches found. PDFs will be processed independently.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Fields to Extract</h3>
          <p className="text-sm text-muted-foreground">
            Select which fields to extract from papers
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Default Fields</h4>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              id="design"
              checked={extractDesign}
              onCheckedChange={(checked) => setExtractDesign(checked === true)}
            />
            <Label htmlFor="design">Design</Label>
          </div>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              id="method"
              checked={extractMethod}
              onCheckedChange={(checked) => setExtractMethod(checked === true)}
            />
            <Label htmlFor="method">Method</Label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Custom Fields (Yes/No Questions)
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomField}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Field
            </Button>
          </div>

          {customFields.map((field, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
            >
              <div>
                <Label htmlFor={`field-name-${index}`} className="text-xs">
                  Column Title
                </Label>
                <Input
                  id={`field-name-${index}`}
                  value={field.name}
                  onChange={(e) =>
                    updateCustomField(index, "name", e.target.value)
                  }
                  placeholder="e.g., Has Control Group"
                />
              </div>
              <div>
                <Label
                  htmlFor={`field-instruction-${index}`}
                  className="text-xs"
                >
                  Instruction
                </Label>
                <Input
                  id={`field-instruction-${index}`}
                  value={field.instruction}
                  onChange={(e) =>
                    updateCustomField(index, "instruction", e.target.value)
                  }
                  placeholder="e.g., Does the paper include a control group?"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 cursor-pointer"
                onClick={() => removeCustomField(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full cursor-pointer">
        Start Extraction
      </Button>
    </form>
  );
}
