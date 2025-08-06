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
import { CustomField, Paper } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";

export default function ExtractFields() {
  const [mode, setMode] = useState<"fulltext" | "abstract">("abstract");
  const [file, setFile] = useState<File | null>(null);
  const [extractDesign, setExtractDesign] = useState(true);
  const [extractMethod, setExtractMethod] = useState(true);
  const [customFields, setCustomFields] = useState<Array<CustomField>>([]);

  const validateCsvColumns = (csvData: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const requiredColumns = ['title', 'abstract', 'authors'];
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
      const job = await createJob({
        filename: file.name,
        mode,
        fields,
        status: "in_progress",
        progress: 0,
        total: 0,
        created: new Date(),
        updated: new Date(),
      });

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

          const papers = (results.data as any[]).map((row) => {
            // Create a case-insensitive mapping of the row data
            const normalizedRow: { [key: string]: string } = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase()] = row[key] || "";
            });

            return {
              title: normalizedRow.title || "",
              abstract: normalizedRow.abstract || "",
              authors: normalizedRow.authors || "",
              doi: normalizedRow.doi || "",
              keywords: normalizedRow.keywords || "",
              fulltext: "",
              extracted: {}
            };
          }) as Paper[];

          await processBatch.start(job.id, papers);

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
          onValueChange={(value) => setMode(value as "fulltext" | "abstract")}
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
