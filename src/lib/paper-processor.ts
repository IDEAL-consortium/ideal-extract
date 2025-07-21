import { Job, Paper } from "@/types"
import { getJob } from "./job-manager"
import { extractFieldsWithAI } from "./openai-service"
import { savePaper, getPapersByJobId } from "./paper-manager"
import Papa from "papaparse"

interface ProcessingCallbacks {
  onProgress: (processed: number) => void
  onComplete: () => void
  onError: (error: Error) => void
}

let isProcessing = false
let isPaused = false
let isCancelled = false
let currentJobId: number | null = null
let currentPapers: Paper[] = []
let currentIndex = 0
let callbacks: ProcessingCallbacks | null = null

export const processPapers = {
  parseCSV: async (csvData: string): Promise<Omit<Paper, 'id' | 'jobId' | 'extractedData' | 'fullText'>[]> => {
    try {
      const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (error: any) => reject(error),
        })
      })

      // Validate required columns
      const requiredColumns = ["title", "abstract", "authors", "doi"]
      const missingColumns = requiredColumns.filter(
        (col) => !(results.meta.fields && results.meta.fields.includes(col))
      )
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(", ")}`)
      }

      const papers = (results.data as any[]).map((row) => ({
        title: row.title || "",
        abstract: row.abstract || "",
        authors: row.authors || "",
        doi: row.doi || "",
      })) as Omit<Paper, 'id' | 'jobId' | 'extractedData' | 'fullText'>[]

      return papers
    } catch (error) {
      throw error
    }
  },

  startProcessing: async (jobId: number, papers: Paper[], processingCallbacks: ProcessingCallbacks) => {
    if (isProcessing) {
      throw new Error("Another job is already processing")
    }

    currentJobId = jobId
    currentPapers = papers
    currentIndex = 0
    callbacks = processingCallbacks
    isProcessing = true
    isPaused = false
    isCancelled = false

    // Get job details to determine extraction fields
    const job = await getJob(jobId)
    if (!job) {
      throw new Error("Job not found")
    }

    processPaper(job)
  },

  pauseProcessing: () => {
    if (isProcessing) {
      isPaused = true
    }
  },

  resumeProcessing: async (jobId: number, processingCallbacks: ProcessingCallbacks) => {
    if (isProcessing) {
      throw new Error("Another job is already processing")
    }

    // Get job details
    const job = await getJob(jobId)
    if (!job) {
      throw new Error("Job not found")
    }

    // Get papers that have already been processed
    const processedPapers = await getPapersByJobId(jobId)

    // Get all papers from the original CSV
    // For simplicity, we'll need to reprocess the CSV
    // In a real app, you'd store the original CSV or papers list

    currentJobId = jobId
    currentIndex = processedPapers.length;
    callbacks = processingCallbacks
    isProcessing = true
    isPaused = false
    isCancelled = false

    // Resume processing
    processPaper(job)
  },

  cancelProcessing: () => {
    if (isProcessing) {
      isCancelled = true
      isProcessing = false
      currentJobId = null
      currentPapers = []
      currentIndex = 0
      callbacks = null
    }
  },
}

async function processPaper(job: Job) {
  if (!isProcessing || isPaused || isCancelled || !currentJobId || !callbacks) {
    return
  }

  if (currentIndex >= currentPapers.length) {
    // All papers processed
    isProcessing = false
    callbacks.onComplete()
    return
  }

  const paper = currentPapers[currentIndex]

  try {
    // Extract fields using AI
    const extractedFields = await extractFieldsWithAI(paper, (job as any).fields, (job as any).mode)

    // Save the paper with extracted fields
    await savePaper({
      ...paper,
      jobId: currentJobId,
      extracted: extractedFields,
    })

    // Update progress
    currentIndex++
    callbacks.onProgress(currentIndex)

    // Process next paper
    setTimeout(() => processPaper(job), 100)
  } catch (error) {
    console.error("Error processing paper:", error)
    if (callbacks) {
      callbacks.onError(error as Error)
    }

    // Continue with next paper despite error
    currentIndex++
    setTimeout(() => processPaper(job), 100)
  }
}