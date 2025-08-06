"use client";

import { Paper, ExtractedFields } from "@/types";
import OpenAI from "openai";

// Function to get OpenAI client with API key from localStorage
function getOpenAIClient(): OpenAI {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set it in Settings.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export async function createBatch(
  papers: Paper[],
  fields: {
    design: boolean;
    method: boolean;
    custom: Array<{ name: string; instruction: string }>;
  }
) {
  const openai = getOpenAIClient();
  
  const requests = papers.map((paper, index) => {
    const prompt = createPrompt(paper, fields);
    return {
      custom_id: `request-${index}`,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts information from research papers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      },
    };
  });

  const jsonl = requests.map((req) => JSON.stringify(req)).join("\n");
  const file = await openai.files.create({
    file: new File([jsonl], "batch.jsonl", { type: "application/jsonl" }),
    purpose: "batch",
  });

  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  return batch.id;
}

export async function getBatchStatus(batchId: string) {
  const openai = getOpenAIClient();
  const batch = await openai.batches.retrieve(batchId);
  return batch;
}

export async function getBatchResults(batchId: string) {
  const openai = getOpenAIClient();
  const batch = await openai.batches.retrieve(batchId);
  if (batch.status === "completed" && batch.output_file_id) {
    const file = await openai.files.content(batch.output_file_id);
    const results = await file.text();
    return results
      .split("\n")
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));
  }
  return [];
}

function createPrompt(
  paper: Paper,
  fields: {
    design: boolean;
    method: boolean;
    custom: Array<{ name: string; instruction: string }>;
  }
): string {
  let prompt = `Paper Title: ${paper.title}\n\nAbstract: ${paper.abstract}\n\n`;
  prompt += "Please extract the following fields from the paper in JSON format:\n";

  const extractionFields: { [key: string]: string } = {};

  if (fields.design) {
    extractionFields.design = "The study design (e.g., Randomized Controlled Trial, Cohort Study).";
  }

  if (fields.method) {
    extractionFields.method = "The research method (e.g., Qualitative Analysis, Survey).";
  }

  fields.custom.forEach((field) => {
    extractionFields[field.name] = field.instruction;
  });

  prompt += JSON.stringify(extractionFields, null, 2);

  return prompt;
}