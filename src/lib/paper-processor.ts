"use client"

import { getDB, STORES } from "./db"
import type { Paper, Job } from "@/types"
import { extractFieldsWithAI } from "./openai-service"
import { savePaper, getPapersByJobId } from "./paper-manager"

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
  parseCSV: async (csvData: string): Promise<Paper[]> => {
    return new Promise((resolve) => {
      const lines = csvData.split("\n")
      const headers = lines[0].split(",").map((h) => h.trim())

      const papers: Paper[] = []

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue

        const values = lines[i].split(",").map((v) => v.trim())
        const paper: any = {}

        headers.forEach((header, index) => {
          paper[header.toLowerCase()] = values[index] || ""
        })

        papers.push({
          title: paper.title || "",
          abstract: paper.abstract || "",
          authors: paper.authors || "",
          keywords: paper.keywords || "",
          doi: paper.doi || "",
          extracted: {},
        })
      }

      resolve(papers)
    })
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
    currentIndex = job.progress
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

async function getJob(id: number): Promise<Job | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS], "readonly")
    const store = transaction.objectStore(STORES.JOBS)

    const request = store.get(id)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
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
    const extractedFields = await extractFieldsWithAI(paper, job.fields, job.mode)

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
