import { CustomField } from "@/types";
import { ChatCompletion } from "openai/resources/index.mjs";
import Papa from "papaparse";
import { getFilesByJobId } from "./files-manager";
import { getJob } from "./job-manager";
import { firstValueTokenLogprobByKey } from "./logprob";
import { createSystemPrompt, getBatchResults, nameToKey } from "./openai-service";
import { downloadFile } from "./utils";


function makeString(data: any): string {
  if (typeof data === "string") {
    return data;
  }
  return String(data);
}
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
  console.log("📥 [CSV Export] Starting CSV export process", {
    jobId,
    onlyProcessed,
    timestamp: new Date().toISOString()
  });

  // Get job details
  console.log("📋 [CSV Export] Fetching job details for jobId:", jobId);
  const job = await getJob(jobId);
  
  if (!job) {
    console.error("❌ [CSV Export] Job not found for jobId:", jobId);
    throw new Error("Job not found");
  }

  console.log("✅ [CSV Export] Job retrieved successfully", {
    jobId: job.id,
    filename: job.filename,
    status: job.status,
    total: job.total,
    progress: job.progress,
    fields: {
      design: job.fields.design,
      method: job.fields.method,
      customCount: job.fields.custom?.length || 0
    },
    batches: job.batches?.length || 0,
    batchId: job.batchId
  });

  const batches = (job.batches && job.batches.length > 0)
    ? job.batches
    : (job.batchId ? [{ model: job.options?.model || "model", batchId: job.batchId }] : []);
  
  if (!batches.length) {
    console.error("❌ [CSV Export] No batches found for job", { jobId, batches: job.batches, batchId: job.batchId });
    throw new Error("Batch ID not found for this job");
  }

  console.log("📦 [CSV Export] Batches to process:", batches.map(b => ({ 
    batchId: b.batchId, 
    model: b.model, 
    status: b.status,
    completed: b.completed,
    total: b.total
  })));

  // Get the original CSV file for this job
  console.log("📁 [CSV Export] Fetching original CSV file for jobId:", jobId);
  const files = await getFilesByJobId(jobId);
  console.log("📁 [CSV Export] Files found:", files.length, files.map(f => ({ id: f.id, filename: f.filename })));
  
  if (files.length === 0) {
    console.error("❌ [CSV Export] No original CSV file found for job", { jobId });
    throw new Error("No original CSV file found for this job");
  }
  
  // Assume the first file is the CSV file
  const originalFile = files[0];
  console.log("📄 [CSV Export] Using original file:", { id: originalFile.id, filename: originalFile.filename });

  if (!originalFile.file) {
    console.error("❌ [CSV Export] File blob is missing", { fileId: originalFile.id });
    throw new Error("File blob is missing");
  }

  console.log("📖 [CSV Export] Reading CSV file content...");
  const csvText = await (async () => {
    try {
      const text = await originalFile.file.text();
      console.log("✅ [CSV Export] CSV file read successfully", { 
        size: text.length, 
        preview: text.substring(0, 200) + "..." 
      });
      return text;
    } catch (error) {
      console.error("❌ [CSV Export] Error reading CSV file from indexedDB:", error);
      throw new Error("Failed to read the original CSV file");
    }
  })();
  
  // Parse the original CSV to get the paper data
  console.log("🔍 [CSV Export] Parsing original CSV data...");
  const originalCsvData = await new Promise<any[]>((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error("❌ [CSV Export] CSV parsing errors:", results.errors);
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
        } else {
          console.log("✅ [CSV Export] Original CSV parsed successfully", {
            rowCount: results.data.length,
            columns: Object.keys(results.data[0] || {}),
            sampleRow: results.data[0]
          });
          resolve(results.data);
        }
      },
      error: (error: any) => {
        console.error("❌ [CSV Export] CSV parsing error:", error);
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
  console.log("🔢 [CSV Export] Logprobs configuration:", { showLogprobsFlag, jobOptions: job.options });

  for (const { batchId, model } of batches) {
    console.log("🔄 [CSV Export] Processing batch", { batchId, model });
    
    // Get extraction results from OpenAI batch
    console.log("📥 [CSV Export] Fetching batch results from OpenAI...", { batchId });
    const results = await getBatchResults(batchId);
    console.log("📊 [CSV Export] Batch results retrieved", {
      batchId,
      resultCount: results.length,
      sampleResult: results[0] ? {
        custom_id: results[0].custom_id,
        hasResponse: !!results[0].response,
        hasBody: !!results[0].response?.body
      } : null
    });
    
    if (results.length === 0) {
      console.warn(`⚠️ [CSV Export] No extraction results found for batch ${batchId}`);
      continue;
    }

    // Create a map of extraction results by paper ID
    const extractionMap = new Map<string, any>();
    console.log("🗺️ [CSV Export] Creating extraction map from batch results...");
    
    for (const result of results) {
      // Extract paper ID from custom_id (format: "request-{paperId}")
      const customId = result.custom_id as string;
      const paperId = customId.split("-").pop();
      if (!paperId) {
        console.error("❌ [CSV Export] Invalid custom_id format, cannot extract paperId", { customId });
        continue;
      }
      console.log("📝 [CSV Export] Processing result", { customId, paperId });
      
      // Extract the response content
      const responseContent = (result.response?.body as ChatCompletion)?.choices || [];
      console.log("💬 [CSV Export] Response content", {
        paperId,
        choiceCount: responseContent.length,
        choices: responseContent.map(c => ({
          role: c.message?.role,
          hasContent: !!c.message?.content,
          contentLength: c.message?.content?.length || 0,
          hasLogprobs: !!c.logprobs?.content
        }))
      });
      
      let extracted: any = {};
      let extractionSuccess = false;
      
      for (const choice of responseContent) {
        if (choice.message?.role === "assistant") {
          let content = choice.message?.content || "";
          const originalContentLength = content.length;
          content = content.trim();
          
          console.log("🔍 [CSV Export] Processing assistant choice", {
            paperId,
            originalLength: originalContentLength,
            trimmedLength: content.length,
            startsWithJson: content.startsWith("```json"),
            preview: content.substring(0, 100)
          });
          
          // Compute logprobs analysis
          const logprobsAnalysis = computeLogprobsAnalysis(choice);
          const fieldProbs = getCustomFieldProbs(choice, job.fields.custom);
          console.log("📊 [CSV Export] Logprobs analysis", {
            paperId,
            hasLogprobsAnalysis: !!logprobsAnalysis,
            perplexityScore: logprobsAnalysis?.perplexityScore,
            fieldProbs: fieldProbs
          });
          
          // Remove markdown code block formatting
          if (content.startsWith("```json")) {
            content = content.substring(7).trim();
            console.log("🧹 [CSV Export] Removed ```json prefix", { paperId, newLength: content.length });
          }
          content = content.split("```")[0];
          
          try {
            extracted = JSON.parse(content);
            console.log("✅ [CSV Export] JSON parsed successfully", {
              paperId,
              keys: Object.keys(extracted),
              extractedData: extracted
            });
            
            if (showLogprobsFlag) {
              extracted["perplexity_score"] = logprobsAnalysis?.perplexityScore || "N/A";
              extracted["field_logprobs"] = fieldProbs || {};
              console.log("➕ [CSV Export] Added logprobs metadata", {
                paperId,
                perplexity_score: extracted["perplexity_score"],
                field_logprobs: extracted["field_logprobs"]
              });
            }
            
            extractionSuccess = true;
            break; // Use the first valid assistant response
          } catch (error) {
            console.error("❌ [CSV Export] Failed to parse JSON content", {
              paperId,
              error: error instanceof Error ? error.message : String(error),
              content: content.substring(0, 500)
            });
          }
        }
      }
      
      if (!extractionSuccess) {
        console.warn("⚠️ [CSV Export] No valid extraction found for paper", { paperId });
      }
      
      extractionMap.set(paperId, extracted);
      console.log("💾 [CSV Export] Stored extraction in map", {
        paperId,
        hasExtracted: Object.keys(extracted).length > 0,
        extractionMapSize: extractionMap.size
      });
    }
    
    console.log("✅ [CSV Export] Extraction map complete", {
      batchId,
      mapSize: extractionMap.size,
      paperIds: Array.from(extractionMap.keys())
    });

  // Merge original CSV data with extraction results
  console.log("🔄 [CSV Export] Merging original CSV data with extraction results...");
  
  // Check if original CSV has an 'id' column (case-insensitive) that might have been used in batch creation
  // This handles backward compatibility with jobs created before the fix where CSV's id column was used
  const firstRow = originalCsvData[0] || {};
  const hasIdColumn = Object.keys(firstRow).some(key => key.toLowerCase() === 'id');
  const idColumnKey = hasIdColumn ? Object.keys(firstRow).find(key => key.toLowerCase() === 'id') : null;
  
  console.log("🔍 [CSV Export] ID column detection:", { hasIdColumn, idColumnKey });
  
  const originalDataWithIds = originalCsvData.map((row, index) => {
    // If the CSV has an 'id' column that was likely used in batch creation (for backward compatibility),
    // try to use that. Otherwise use sequential index-based IDs.
    let paperId: number;
    if (idColumnKey && row[idColumnKey]) {
      const csvId = Number(row[idColumnKey]);
      // Use CSV's id if it's a valid number, otherwise fall back to index
      paperId = !isNaN(csvId) ? csvId : index + 1;
    } else {
      paperId = index + 1;
    }
    return { ...row, id: paperId };
  });
  console.log("📋 [CSV Export] Original data with IDs", {
    totalRows: originalDataWithIds.length,
    sampleRow: originalDataWithIds[0],
    columns: Object.keys(originalDataWithIds[0] || {})
  });
  
  let dataToMerge = originalDataWithIds;
  if (onlyProcessed) {
    // Filter original data to only include processed papers
    const processedPaperIndexes = Array.from(extractionMap.keys());
    dataToMerge = originalDataWithIds.filter((row) => processedPaperIndexes.includes(row.id));
    console.log("✅ [CSV Export] Filtered data", {
      filteredCount: dataToMerge.length,
      removedCount: originalDataWithIds.length - dataToMerge.length
    });
  } else {
    console.log("📊 [CSV Export] Including all papers (not filtering)", {
      totalRows: dataToMerge.length
    });
  }
  console.log("🔀 [CSV Export] Starting data merge process...");
  const mergedData = dataToMerge.map((originalRow, index) => {
    // Use the row's assigned ID (which handles both new sequential IDs and legacy CSV IDs)
    const paperId = originalRow.id;
    const extracted = extractionMap.get(paperId);
    
    if (index === 0) {
      console.log("🔀 [CSV Export] Processing first row as example", {
        paperId,
        hasExtracted: !!extracted,
        originalRowKeys: Object.keys(originalRow),
        extractedKeys: extracted ? Object.keys(extracted) : []
      });
    }
    
    if (!extracted) {
      console.log("⚠️ [CSV Export] No extraction result for paper", { paperId });
      // if (index < 5) {
      //   console.log("⚠️ [CSV Export] No extraction result found for paper", { paperId, index });
      // }
      return originalRow; // Return original row if no extraction result
    }
    
    // Start with the original row data
    const mergedRow = { ...originalRow };
    
    // Map of known field keys to their display column names (for backward compatibility)
    const knownFieldMap: Record<string, string> = {
      "design": "Design",
      "method": "Method",
      "flags": "Flags",
      "reason_for_flags": "Reasons"
    };
    
    // Track which custom field keys we've seen to avoid duplicates
    const customFieldKeys = new Set(
      job.fields.custom.map(field => nameToKey(field.name))
    );
    
    if (index === 0) {
      console.log("🔀 [CSV Export] Field mapping configuration", {
        knownFieldMap,
        customFieldKeys: Array.from(customFieldKeys),
        customFields: job.fields.custom.map(f => ({ name: f.name, key: nameToKey(f.name) }))
      });
    }
    
    const fieldsProcessed: string[] = [];
    const fieldsSkipped: string[] = [];
    
    // Export all fields from the LLM JSON response
    // This is more robust than selectively exporting fields - captures everything the LLM returns
    Object.keys(extracted).forEach((key) => {
      // Skip internal metadata fields that are handled specially
      if (key === "perplexity_score" || key === "field_logprobs") {
        fieldsSkipped.push(key);
        return;
      }
      
      // Determine column name
      let columnName: string;
      if (knownFieldMap[key]) {
        // Use known display name for standard fields
        columnName = knownFieldMap[key];
        if (index === 0) {
          console.log("📌 [CSV Export] Mapped known field", { key, columnName });
        }
      } else if (customFieldKeys.has(key)) {
        // For custom fields, find the original field name (not the key)
        const customField = job.fields.custom.find(f => nameToKey(f.name) === key);
        columnName = customField?.name || key;
        if (index === 0) {
          console.log("📌 [CSV Export] Mapped custom field", { key, columnName, customField });
        }
      } else {
        // For any unexpected fields, use the key and convert snake_case to Title Case
        columnName = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (index === 0) {
          console.log("📌 [CSV Export] Mapped unexpected field", { key, columnName });
        }
      }
      
      const stringifiedValue = stringify(extracted[key] || "");
      mergedRow[columnName] = stringifiedValue;
      fieldsProcessed.push(`${key} → ${columnName}`);
      
      if (index === 0) {
        console.log("➕ [CSV Export] Added field to merged row", {
          key,
          columnName,
          rawValue: extracted[key],
          stringifiedValue,
          valueType: typeof extracted[key]
        });
      }
    });
    
    if (index === 0) {
      console.log("📊 [CSV Export] Field processing summary for first row", {
        totalFields: Object.keys(extracted).length,
        fieldsProcessed,
        fieldsSkipped
      });
    }
    
    // Add special computed fields
    if (showLogprobsFlag) {
      mergedRow["Perplexity Score"] = extracted.perplexity_score || "N/A";
      
      // Handle field_logprobs for custom boolean fields
      if (extracted.field_logprobs) {
        job.fields.custom.forEach((field) => {
          const fieldKey = nameToKey(field.name);
          const isBooleanField = (field.type || 'boolean') === 'boolean';
          if (isBooleanField && extracted.field_logprobs[fieldKey] !== undefined) {
            const probColumnName = `${field.name} Probability`;
            mergedRow[probColumnName] = extracted.field_logprobs[fieldKey];
            if (index === 0) {
              console.log("📊 [CSV Export] Added probability field", {
                fieldName: field.name,
                fieldKey,
                probability: extracted.field_logprobs[fieldKey],
                columnName: probColumnName
              });
            }
          }
        });
      }
    }
    
    // Include the system prompt used
    const systemPrompt = job.options?.systemPromptOverride || createSystemPrompt({
      design: job.fields.design,
      method: job.fields.method,
      custom: job.fields.custom.map((f: CustomField) => ({ name: f.name, instruction: f.instruction, type: f.type }))
    });
    mergedRow["System Prompt"] = systemPrompt;
    
    if (index === 0) {
      console.log("✅ [CSV Export] Completed merge for first row", {
        paperId,
        finalColumns: Object.keys(mergedRow),
        columnCount: Object.keys(mergedRow).length
      });
    }

    return mergedRow;
  });
  
  console.log("✅ [CSV Export] Data merge complete", {
    totalRows: mergedData.length,
    sampleRowColumns: Object.keys(mergedData[0] || {}),
    sampleRow: mergedData[0]
  });

  // Create CSV content using papaparse
    console.log("📝 [CSV Export] Generating CSV content...", {
      rowCount: mergedData.length,
      columnCount: mergedData[0] ? Object.keys(mergedData[0]).length : 0
    });
    
    const csvContent = Papa.unparse(mergedData);
    console.log("✅ [CSV Export] CSV content generated", {
      contentLength: csvContent.length,
      preview: csvContent.substring(0, 500) + "...",
      lineCount: csvContent.split('\n').length
    });

    // Create and download the CSV file, include model in name
    const safeModel = String(model || "model").replace(/[^a-z0-9._-]/gi, "_");
    const filename = `extracted_fields_${jobId}_${safeModel}.csv`;
    console.log("💾 [CSV Export] Downloading CSV file", {
      filename,
      model,
      safeModel,
      jobId,
      onlyProcessed
    });
    
    downloadFile(filename, csvContent, "text/csv;charset=utf-8;");
    console.log("✅ [CSV Export] CSV file download initiated", { filename });
  }
  
  console.log("🎉 [CSV Export] Export process complete for all batches", {
    jobId,
    batchesProcessed: batches.length,
    timestamp: new Date().toISOString()
  });
}


const stringify = (data: any): string => {
  // if string data, return as is
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    // if array, convert each item to string
    const result = data.map(item => stringify(item)).join(", ");
    // Only log arrays (less common case)
    if (data.length > 0) {
      console.log("🔄 [CSV Export] Stringified array", { arrayLength: data.length, preview: result.substring(0, 100) });
    }
    return result;
  }
  if (data && typeof data === "object") {
    const result = Object.entries(data)
      .filter(([key, value]) => !!value) // filter out empty values
      .map(([key, value]) => `${key}`)
      .join(", ");
    // Only log objects (less common case)
    if (Object.keys(data).length > 0) {
      console.log("🔄 [CSV Export] Stringified object", { 
        keys: Object.keys(data), 
        filteredKeys: Object.entries(data).filter(([k, v]) => !!v).map(([k]) => k),
        result 
      });
    }
    return result;
  }
  // Only log non-string primitives (less common)
  if (typeof data !== "string") {
    console.log("🔄 [CSV Export] Stringified non-string primitive", { data, type: typeof data, result: String(data) });
  }
  return String(data);
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