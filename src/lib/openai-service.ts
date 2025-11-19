"use client";

import { AIOptions, CustomField, Paper } from "@/types";
import OpenAI from "openai";

// Import prompt files
import basePrompt from "@/components/prompts/base-prompt.md?raw";
import designPrompt from "@/components/prompts/design-prompt.md?raw";
import flagsPrompt from "@/components/prompts/flags-prompt.md?raw";
import methodPrompt from "@/components/prompts/method-prompt.md?raw";
import { downloadFile } from "./utils";

// Function to get OpenAI client with API key from localStorage
let openAIClient: OpenAI | null = null;
const isDryRun = false

function getOpenAIClient(): OpenAI {
  if (openAIClient) return openAIClient;

  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set it in Settings.');
  }

  openAIClient = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  return openAIClient;
}

// Cache helper for models list
type ModelsCache = { models: string[]; cachedAt: number };

export async function listAvailableModels(forceRefresh: boolean = false): Promise<string[]> {
  // Hardcoded list of supported models
  return [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
  ];
}

export async function cancelBatch(batchId?: string): Promise<void> {
  if (!batchId) {
    throw new Error("Batch ID is required to cancel the batch.");
  }
  const openai = getOpenAIClient();
  try {
    await openai.batches.cancel(batchId);
  } catch (error) {
    console.error("Failed to cancel batch:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      throw new Error("Batch not found. It may have already been completed or deleted.");
    } else if (errorMessage.includes("already") || errorMessage.includes("completed")) {
      throw new Error("Batch has already been completed and cannot be cancelled.");
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      throw new Error("Network error: Unable to connect to OpenAI. Please check your internet connection.");
    } else {
      throw new Error(`Failed to cancel batch: ${errorMessage}`);
    }
  }
}
const getAIOptions = (options?: AIOptions) => {
  const model = options?.model || "gpt-4.1";
  const isGpt5 = model.toLowerCase().startsWith("gpt-5");
  const isGpt41 = model.toLowerCase().startsWith("gpt-4.1");
  const enableLogprobs = localStorage.getItem('enable_logprobs') === 'true';
  
  // GPT-5 models have stricter parameter requirements and don't support logprobs
  if (isGpt5) {
    return {
      model,
      // GPT-5 doesn't support logprobs - never include them
    };
  }
  
  // GPT-4.1 models - automatically enable logprobs if setting is enabled
  if (isGpt41 && enableLogprobs) {
    return {
      model,
      logprobs: true,
      top_logprobs: 4,
      temperature: 1,
      max_completion_tokens: 300,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
  }
  
  // Other models or logprobs disabled - default behavior without logprobs
  return {
    model,
    temperature: 1,
    max_completion_tokens: 300,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
}
export async function createBatch(
  papers: Paper[],
  fields: {
    design: boolean;
    method: boolean;
    custom: Array<CustomField>;
  },
  options: AIOptions = {}
) {
  try {
    const openai = getOpenAIClient();
    const systemPrompt = options.systemPromptOverride?.trim()?.length ? options.systemPromptOverride! : createSystemPrompt(fields);
    const aiOptions = getAIOptions(options);
    const requests = papers.map((paper) => {
      const userPrompt = createUserPrompt(paper);
      return {
        custom_id: `request-${paper.id}`,
        method: "POST",
        url: "/v1/chat/completions",
        body: {
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          response_format: { type: "json_object" },
          ...aiOptions
        },
      };
    });
    const jsonl = requests.map((req) => JSON.stringify(req)).join("\n");
    const safeModel = (aiOptions.model || "model").replace(/[^a-z0-9._-]/gi, "_");
    
    // Download JSONL if requested
    if (options.downloadJsonl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      downloadFile(`batch_${safeModel}_${timestamp}.jsonl`, jsonl, "application/jsonl");
    }
    
    if (isDryRun) {
      console.log("Dry run mode: Batch creation skipped.");
      downloadFile(`batch_${safeModel}.jsonl`, jsonl, "application/jsonl");
      return "dry-run-batch-id";
    }
    
    const file = await openai.files.create({
      file: new File([jsonl], `batch_${safeModel}.jsonl`, { type: "application/jsonl" }),
      purpose: "batch",
    });

    const batch = await openai.batches.create({
      input_file_id: file.id,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
    });

    return batch.id;
  } catch (error) {
    console.error("Failed to create batch:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("API key")) {
      throw new Error("OpenAI API key not configured or invalid. Please check Settings.");
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("insufficient")) {
      throw new Error("OpenAI API quota exceeded or rate limit reached. Please check your OpenAI account or try again later.");
    } else if (errorMessage.includes("model") && errorMessage.includes("not found")) {
      throw new Error(`Selected model is not available. Please choose a different model.`);
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("ECONNREFUSED")) {
      throw new Error("Network error: Unable to connect to OpenAI. Please check your internet connection.");
    } else {
      throw new Error(`Failed to create batch: ${errorMessage}`);
    }
  }
}

export async function getBatchStatus(batchId: string) {
  try {
    const openai = getOpenAIClient();
    const batch = await openai.batches.retrieve(batchId);
    return batch;
  } catch (error) {
    console.error("Failed to get batch status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      throw new Error("Batch not found. It may have been deleted.");
    } else if (errorMessage.includes("API key")) {
      throw new Error("OpenAI API key not configured or invalid. Please check Settings.");
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      throw new Error("Network error: Unable to connect to OpenAI. Please check your internet connection.");
    } else {
      throw new Error(`Failed to get batch status: ${errorMessage}`);
    }
  }
}
export async function getBatchResults(batchId: string) {
  try {
    const openai = getOpenAIClient();
    const batch = await openai.batches.retrieve(batchId);
    // Allow downloading results if output_file_id exists, regardless of status
    // This enables downloading from expired/canceled batches that have partial results
    if (batch.output_file_id) {
      const file = await openai.files.content(batch.output_file_id);
      const results = await file.text();
      return results
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line));
    }
    return [];
  } catch (error) {
    console.error("Failed to get batch results:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      throw new Error("Batch not found or results no longer available.");
    } else if (errorMessage.includes("API key")) {
      throw new Error("OpenAI API key not configured or invalid. Please check Settings.");
    } else if (errorMessage.includes("JSON")) {
      throw new Error("Failed to parse batch results. The results file may be corrupted.");
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      throw new Error("Network error: Unable to connect to OpenAI. Please check your internet connection.");
    } else {
      throw new Error(`Failed to get batch results: ${errorMessage}`);
    }
  }
}

function createUserPrompt(paper: Paper): string {
  return `Paper Title: ${paper.title}\n\n` +
    `Paper Abstract: ${paper.abstract}\n\n` +
    `Paper Authors: ${paper.authors}\n\n` +
    `Paper Keywords: ${paper.keywords}\n\n` +
    `Paper DOI: ${paper.doi}\n\n` +
    `Paper Fulltext: ${paper.fulltext || "Fulltext not available"}\n\n`
}
export function createSystemPrompt(
  fields: {
    design: boolean;
    method: boolean;
    custom: Array<{ name: string; instruction: string; type?: "boolean" | "text" }>;
  }
): string {
  // Start with the base prompt
  let prompt = basePrompt + "\n\n";

  prompt += "Please extract the following fields from the paper in JSON format:\n";

  const keys = ["design", "method", "flags", "reasons_for_flags(short explanation if any flags are used)"];
  for (const field of fields.custom) {
    keys.push(nameToKey(field.name));
  }
  prompt += "\n" + designPrompt
  prompt += "\n\n" + methodPrompt;
  prompt += "\n\n" + flagsPrompt;

  if (fields.custom && fields.custom.length > 0) {
    const booleanFields = fields.custom.filter((f) => (f.type || "boolean") === "boolean");
    const textFields = fields.custom.filter((f) => (f.type || "boolean") === "text");

    if (booleanFields.length > 0) {
      prompt += "\n\n" + "For the following fields follow the instruction closely and provide a yes/no/maybe answer. An answer should be based on the content of the paper. If you are not sure output should be maybe\n";
      const fieldprompts = booleanFields.map((field) => {
        return `Field Key : ${nameToKey(field.name)} \nInstruction: ${field.instruction}`;
      });
      prompt += fieldprompts.join("\n\n");
    }

    if (textFields.length > 0) {
      prompt += "\n\n" + "For the following fields follow the instruction closely and provide a concise free-text answer based only on the paper content. Keep answers short and factual.\n";
      const textPrompts = textFields.map((field) => {
        return `Field Key : ${nameToKey(field.name)} \nInstruction: ${field.instruction}`;
      });
      prompt += textPrompts.join("\n\n");
    }
  }
  prompt += "\n\n" + "Output should be a JSON object with the following keys and nothing else:";
  prompt += "\n" + keys.map((key) => `- ${key}`).join("\n") + "\n\n";

  return prompt;
}

export function nameToKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}