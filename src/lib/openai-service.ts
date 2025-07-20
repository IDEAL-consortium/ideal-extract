"use client"

import type { Paper, ExtractedFields } from "@/types"

// This is a mock implementation since we can't actually call OpenAI's API from the client
// In a real application, you would use a server action or API route to call OpenAI
export async function extractFieldsWithAI(
  paper: Paper,
  fields: { design: boolean; method: boolean; custom: Array<{ name: string; instruction: string }> },
  mode: "fulltext" | "abstract",
): Promise<ExtractedFields> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const extractedFields: ExtractedFields = {}

  // In a real implementation, you would:
  // 1. Construct a prompt based on the paper content and fields to extract
  // 2. Call OpenAI's API with the prompt
  // 3. Parse the response to extract the fields

  // Mock implementation for demonstration
  if (fields.design) {
    extractedFields.design = mockExtractDesign(paper)
  }

  if (fields.method) {
    extractedFields.method = mockExtractMethod(paper)
  }

  // Extract custom fields
  fields.custom.forEach((customField) => {
    extractedFields[customField.name] = mockExtractCustomField(paper, customField.instruction)
  })

  return extractedFields
}

// Mock extraction functions
function mockExtractDesign(paper: Paper): string {
  const abstract = paper.abstract.toLowerCase()

  if (abstract.includes("randomized") || abstract.includes("rct")) {
    return "Randomized Controlled Trial"
  } else if (abstract.includes("cohort")) {
    return "Cohort Study"
  } else if (abstract.includes("case-control")) {
    return "Case-Control Study"
  } else if (abstract.includes("cross-sectional")) {
    return "Cross-Sectional Study"
  } else {
    return "Not clearly specified in abstract"
  }
}

function mockExtractMethod(paper: Paper): string {
  const abstract = paper.abstract.toLowerCase()

  if (abstract.includes("qualitative")) {
    return "Qualitative Analysis"
  } else if (abstract.includes("survey") || abstract.includes("questionnaire")) {
    return "Survey/Questionnaire"
  } else if (abstract.includes("interview")) {
    return "Interviews"
  } else if (abstract.includes("statistical") || abstract.includes("regression")) {
    return "Statistical Analysis"
  } else {
    return "Not clearly specified in abstract"
  }
}

function mockExtractCustomField(paper: Paper, instruction: string): string {
  // Simple yes/no extraction based on keyword matching
  const abstract = paper.abstract.toLowerCase()
  const instructionLower = instruction.toLowerCase()

  // Extract key terms from the instruction
  const keyTerms = instructionLower
    .replace(/does the paper|is there|are there|does it|do they/g, "")
    .split(" ")
    .filter((term) => term.length > 4)
    .map((term) => term.replace(/[^a-z]/g, ""))

  // Check if any key terms are in the abstract
  const hasMatch = keyTerms.some((term) => abstract.includes(term))

  return hasMatch ? "Yes" : "No"
}
