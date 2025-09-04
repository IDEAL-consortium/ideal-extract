"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { processBatch } from "@/lib/batch-processor";
import { addFile } from "@/lib/files-manager";
import { createJob, updateJob } from "@/lib/job-manager";
import { extractPdfDataBatch, matchPdfsToPapersAsync, PDFMatch } from "@/lib/pdf-utils";
import { downloadFile } from "@/lib/utils";
import { Paper, PDFData } from "@/types";
import { Download, Eye, Loader2, Plus, Trash2, Upload } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSystemPrompt } from "@/lib/openai-service";
import SystemPromptViewer from "./SystemPromptViewer";
import { useNavigate } from 'react-router-dom';

export default function ExtractFields() {
  const [mode, setMode] = useState<"fulltext" | "abstract">("abstract");
  const [file, setFile] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [pdfFolder, setPdfFolder] = useState<FileList | null>(null);
  const [pdfData, setPdfData] = useState<Array<PDFData>>([]);
  const [extractDesign, setExtractDesign] = useState(true);
  const [extractMethod, setExtractMethod] = useState(true);
  const { customFields, addCustomField, removeCustomField, updateCustomField, downloadCustomFields, handleUploadCustomFields } = useCustomFields();
  const [processingPdfs, setProcessingPdfs] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [pdfMatches, setPdfMatches] = useState<PDFMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();


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
            setFileErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
            resolve(false);
          } else {
            const paperCount = results.data.length;
            toast.success(`CSV file validated successfully! Found ${paperCount} papers.`);
            setFileErrors([]);
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
                try {
                  await performMatching((a) => setIsMatching(a));
                } catch (error) {
                  console.error("Error during matching:", error);
                  toast.error("Error matching PDF files to CSV entries");
                }
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
          try {
            await performMatching((a) => setIsMatching(a), pdfDataResults);
          } catch (error) {
            console.error("Error during matching:", error);
            toast.error("Error matching PDF files to CSV entries");
          }
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

  const performMatching = async (isProcessing: (a: boolean) => void, pdfDataToUse?: PDFData[]) => {
    if (!file) {
      console.error("No CSV file selected for matching");
      return;
    }
    const dataToMatch = pdfDataToUse || pdfData;
    if (!dataToMatch || dataToMatch.length === 0) {
      toast.error("No PDF files available for matching. Please upload PDF files.");
      return;
    }
    try {
      const readCsvAsText = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read CSV file"));
            }
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });

      isProcessing(true);
      console.log("Matching PDFs to CSV entries...");

      try {
        const csvData = await readCsvAsText(file);
        // take first 2000 rows for testing
        const tempResults = await new Promise<Papa.ParseResult<any>>(
          (resolve, reject) => {
            Papa.parse(csvData, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results),
              error: (error: any) => reject(error),
            });
          }
        );
        const papers = (tempResults.data.slice(0, 2000) as any[]).map((row, index) => {
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
        const matches = await matchPdfsToPapersAsync(dataToMatch, papers, 0.5, (...args) => {
          console.log("Matching PDFs to CSV entries...", ...args);
        });
        setPdfMatches(matches);

        if (matches.length > 0) {
          toast.success(`Successfully matched ${matches.length} PDF files to CSV entries`);
          console.log('PDF Matches:', matches);
        } else {
          toast.warning("No PDF files could be matched to CSV entries. Files will be processed based on filename similarity.");
        }
      } catch (error) {
        console.error("Error parsing CSV data:", error);
        toast.error("Error parsing CSV data");
      }
      isProcessing(false);
    } catch (error) {
      console.error("Error matching PDFs:", error);
      toast.error("Error matching PDF files to CSV entries");
      isProcessing(false);
    }
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

    setIsSubmitting(true);
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
          const job = await createJob({
            filename: file.name,
            mode,
            fields,
            status: "in_progress",
            progress: 0,
            total: papers.length,
            created: new Date(),
            updated: new Date(),
          });
          try {

            await addFile(job.id, file, file.name);
            const pdfParams = mode === "fulltext" ? {
              pdfData: Array.from(pdfData),
              matches: pdfMatches,
            } : undefined;
            await processBatch.start(job.id, papers, pdfParams); // Process first 10 papers
  
            toast("Job started. Your extraction job has been started.");
            // go to job management page
          }
          catch (error) {
            // update job status to failed
            await updateJob(job.id, {
              status: "failed",
            });
            console.error("Error creating or starting job:", error);
            toast.error("Error creating or starting the extraction job");
          }
          navigate('/job-management');

        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error starting job:", error);
      toast("Failed to start extraction job");
    } finally {
      setIsSubmitting(false);
    }
  };
  const downloadUnmatchedPdfs = () => {
    if (!pdfData || pdfData.length === 0) {
      toast.error("No PDF's to download");
      return;
    }
    const matchedIndexes = new Set(pdfMatches.map(match => match.pdfIndex));
    const unmatchedPdfsFileNames = pdfData.filter((_, index) => !matchedIndexes.has(index)).map(pdf => pdf.filename);
    if (unmatchedPdfsFileNames.length === 0) {
      toast.info("All PDFs are matched.");
      return;
    }
    downloadFile("unmatched_pdfs.txt", unmatchedPdfsFileNames.join("\n"), "text/plain");
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
        {fileErrors.length > 0 && (
          <div className="text-sm text-red-500">
            {fileErrors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}

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

        {mode === "fulltext" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">PDF Matching Results</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (pdfFolder) {
                    console.log("Re-matching PDFs to CSV entries...");
                    try {
                      await performMatching((a) => setIsMatching(a));
                    } catch (error) {
                      console.error("Error during re-matching:", error);
                      toast.error("Error re-matching PDF files to CSV entries");
                    }
                  }
                }}
                disabled={isMatching}
                className="text-xs"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Matching...
                  </>
                ) : (
                  "Re-match Files"
                )}
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {/* Total matches: {pdfMatches.length} */}
              {pdfMatches.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Matched: {pdfMatches.length} out of {pdfData.length} PDFs
                </div>
              )}
              {/* Button to download unmatched PDFs list */}
              {pdfMatches.length < pdfData.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadUnmatchedPdfs}
                  className="text-xs"
                  disabled={isMatching}
                >
                  Download Unmatched PDFs
                </Button>
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
            <div className="flex items-center gap-2">
              <SystemPromptViewer
                extractDesign={extractDesign}
                extractMethod={extractMethod}
                customFields={customFields}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCustomFields}
                className="cursor-pointer"
                title="Download custom fields as JSON"
              >
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('upload-custom-fields')?.click()}
                className="cursor-pointer"
                title="Upload custom fields from JSON"
              >
                <Upload className="h-4 w-4 mr-1" /> Upload
              </Button>
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
          </div>

          {/* Hidden file input for uploading custom fields */}
          <input
            id="upload-custom-fields"
            type="file"
            accept=".json"
            onChange={handleUploadCustomFields}
            style={{ display: 'none' }}
          />

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

      <Button type="submit" className="w-full cursor-pointer" disabled={!file || (mode === "fulltext" && (!pdfFolder || pdfFolder.length === 0)) || isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Starting Extraction...
          </>
        ) : (
          "Start Extraction"
        )}
      </Button>
    </form>
  );
}
