import { ChatCompletion } from "openai/resources/index.mjs";
import Papa from "papaparse";
import { getFilesByJobId } from "./files-manager";
import { getJob } from "./job-manager";
import { getBatchResults, nameToKey } from "./openai-service";
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

  if (!job.batchId) {
    throw new Error("Batch ID not found for this job");
  }

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
    if (!job?.options) {
      return true;
    }
    return job?.options?.logprobs || false;
  };
  const showLogprobsFlag = shouldIncludeLogprobs();



  // Get extraction results from OpenAI batch
  const results = await getBatchResults(job.batchId);
  if (results.length === 0) {
    throw new Error("No extraction results found for this job");
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
    // Add custom fields
    job.fields.custom.forEach((field) => {
      const fieldKey = nameToKey(field.name);
      mergedRow[field.name] = stringify(extracted[fieldKey] || "");
      if (showLogprobsFlag) {
        mergedRow[`${field.name} Probability`] = extracted.field_logprobs?.[fieldKey] || "";
      }
    });

    return mergedRow;
  });

  // Create CSV content using papaparse
  const csvContent = Papa.unparse(mergedData);

  // Create and download the CSV file
  downloadFile(`extracted_fields_${jobId}.csv`, csvContent, "text/csv;charset=utf-8;");
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
    const key = nameToKey(field.name);
    const logprob = firstValueTokenLogprobByKey(tokens, key, { ignoreOpeningQuote: true });
    // convert log prob to linear prob
    if (logprob !== undefined) {
      fieldProbs[key] = Math.exp(logprob);
    }
  }
  return fieldProbs;
}