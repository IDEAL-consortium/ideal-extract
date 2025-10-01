import { ChatCompletion } from "openai/resources/index.mjs";
import Papa from "papaparse";
import { getFilesByJobId } from "./files-manager";
import { getJob } from "./job-manager";
import { getBatchResults, nameToKey, createSystemPrompt } from "./openai-service";
import { downloadFile } from "./utils";
import { firstValueTokenLogprobByKey } from "./logprob";
import { CustomField } from "@/types";

// Helper function to compute logprobs and perplexity
function computeLogprobsAnalysis(choice: ChatCompletion.Choice) {
  if (!choice.logprobs?.content) {
    return null;
  }
  const logprobs = choice.logprobs.content.map((token) => token.logprob);
  const perplexityScore = Math.exp(-logprobs.reduce((a, b) => a + b, 0) / logprobs.length);
  return {
    logprobs,
    perplexityScore
  };
}
export async function downloadCSV(jobId: number, onlyProcessed?: boolean): Promise<void> {
  // Get job details
  const job = await getJob(jobId);
  
  if (!job) {
    throw new Error("Job not found");
  }

  const batches = (job.batches && job.batches.length > 0)
    ? job.batches
    : (job.batchId ? [{ model: job.options?.model || "model", batchId: job.batchId }] : []);
  if (!batches.length) throw new Error("Batch ID not found for this job");

  // Get the original CSV file for this job
  const files = await getFilesByJobId(jobId);
  if (files.length === 0) {
    throw new Error("No original CSV file found for this job");
  }
  
  // Assume the first file is the CSV file
  const originalFile = files[0];

  if (!originalFile.file) {
    throw new Error("File blob is missing");
  }

  
  const csvText = await (async () => {
    try {
      return await originalFile.file.text();
    } catch (error) {
      console.error("Error reading CSV file from indexedDB:", error);
      throw new Error("Failed to read the original CSV file");
    }
  })();
  
  // Parse the original CSV to get the paper data
  const originalCsvData = await new Promise<any[]>((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error: any) => {
        console.error("CSV parsing error:", error);
        reject(error);
      }
    });
  });
  const shouldIncludeLogprobs = () => {
    // to support older jobs created before logprobs option was added
    if (!job?.options || job.options.logprobs === undefined) {
      return true;
    }
    return job.options.logprobs;
  };
  const showLogprobsFlag = shouldIncludeLogprobs();



  for (const { batchId, model } of batches) {
    // Get extraction results from OpenAI batch
    const results = await getBatchResults(batchId);
    if (results.length === 0) {
      console.warn(`No extraction results found for batch ${batchId}`);
      continue;
    }

    // Create a map of extraction results by paper ID
    const extractionMap = new Map<number, any>();
    
    for (const result of results) {
    // Extract paper ID from custom_id (format: "request-{paperId}")
    const paperId = Number((result.custom_id as string).split("-").pop())
    
    // Extract the response content
    const responseContent = (result.response?.body as ChatCompletion)?.choices || [];
    let extracted: any = {};
    
    for (const choice of responseContent) {
      if (choice.message?.role === "assistant") {
        let content = choice.message?.content || "";
        content = content.trim();
        
        // Compute logprobs analysis
        const logprobsAnalysis = computeLogprobsAnalysis(choice);
        const fieldProbs = getCustomFieldProbs(choice, job.fields.custom);
        console.log(fieldProbs);
        // Remove markdown code block formatting
        if (content.startsWith("```json")) {
          content = content.substring(7).trim();
        }
        content = content.split("```")[0];
        
        try {
          extracted = JSON.parse(content);
          if (showLogprobsFlag) {
            extracted["perplexity_score"] = logprobsAnalysis?.perplexityScore || "N/A"
            extracted["field_logprobs"] = fieldProbs || {}
          }
          console.log("Extracted content for paper %s: %O", paperId, extracted);
          break; // Use the first valid assistant response
        } catch (error) {
          console.error("Failed to parse JSON content:", content);
        }
      }
    }
    
      extractionMap.set(paperId, extracted);
    }

  // Merge original CSV data with extraction results
  const originalDataWithIds = originalCsvData.map((row, index) => {
    // Use the row index as paper ID (assuming papers were processed in order)
    const paperId = index + 1 ; // Assuming paper IDs start from 1
    return { ...row, id: paperId };
  });
    let dataToMerge = originalDataWithIds;

  if (onlyProcessed) {
    // Filter original data to only include processed papers
    const processedPaperIndexes = Array.from(extractionMap.keys());
    dataToMerge = originalDataWithIds.filter((row) => processedPaperIndexes.includes(row.id));
  }
  const mergedData = dataToMerge.map((originalRow, index) => {
    // Use the row index as paper ID (assuming papers were processed in order)
    const paperId = index+1;
    const extracted = extractionMap.get(paperId);
    
    if (!extracted) {
      // console.warn(`No extraction result found for paper ID ${paperId}`);
      return originalRow; // Return original row if no extraction result
    }
    // Start with the original row data
    const mergedRow = { ...originalRow };
    
    // Add extracted fields
    if (job.fields.design) {
      mergedRow["Design"] = extracted.design || "";
    }

    if (job.fields.method) {
      mergedRow["Method"] = stringify(extracted.method || "");
    }

    if (job.fields.design 
      || job.fields.method
    ){
      mergedRow["Flags"] = stringify(extracted.flags || "");
    }
    if (showLogprobsFlag) {
      mergedRow["Perplexity Score"] = extracted.perplexity_score
    }
    mergedRow["Reasons"] = extracted.reason_for_flags || ""
    // Include the system prompt used
    mergedRow["System Prompt"] = job.options?.systemPromptOverride || createSystemPrompt({
      design: job.fields.design,
      method: job.fields.method,
      custom: job.fields.custom.map((f: CustomField) => ({ name: f.name, instruction: f.instruction, type: f.type }))
    });
    // Add custom fields
    job.fields.custom.forEach((field) => {
      const fieldKey = nameToKey(field.name);
      mergedRow[field.name] = stringify(extracted[fieldKey] || "");
      const isBooleanField = (field.type || 'boolean') === 'boolean';
      if (showLogprobsFlag && isBooleanField) {
        mergedRow[`${field.name} Probability`] = extracted.field_logprobs?.[fieldKey] || "";
      }
    });

      return mergedRow;
    });

  // Create CSV content using papaparse
    const csvContent = Papa.unparse(mergedData);

    // Create and download the CSV file, include model in name
    const safeModel = String(model || "model").replace(/[^a-z0-9._-]/gi, "_");
    downloadFile(`extracted_fields_${jobId}_${safeModel}.csv`, csvContent, "text/csv;charset=utf-8;");
  }
}


const stringify = (data: any): string => {
  // if string data, return as is
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    // if array, convert each item to string
    return data.map(item => stringify(item)).join(", ");
  }
  return Object.entries(data)
    .filter(([key, value]) => !!value) // filter out empty values
    .map(([key, value]) => `${key}`)
    .join(", ");
}

function getCustomFieldProbs(choice: ChatCompletion.Choice, fields: Array<CustomField>) {
  if (!choice.logprobs?.content) {
    return null;
  }
  const tokens = choice.logprobs.content;
  let fieldProbs: Record<string, number | undefined> = {};
  for (const field of fields) {
    // Only compute probabilities for boolean fields
    if ((field.type || 'boolean') !== 'boolean') {
      continue;
    }
    const key = nameToKey(field.name);
    const logprob = firstValueTokenLogprobByKey(tokens, key, { ignoreOpeningQuote: true });
    // convert log prob to linear prob
    if (logprob !== undefined) {
      fieldProbs[key] = Math.exp(logprob);
    }
  }
  return fieldProbs;
}