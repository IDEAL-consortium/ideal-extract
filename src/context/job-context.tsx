"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { updateJob, getJob } from "@/lib/job-manager"
import { processPapers } from "@/lib/paper-processor"
import { useToast } from "@/hooks/use-toast"

interface JobContextType {
  activeJobId: number | null
  startJob: (jobId: number, csvData: string) => void
  pauseJob: () => void
  resumeJob: (jobId: number) => void
  cancelJob: (jobId: number) => void
}

const JobContext = createContext<JobContextType | undefined>(undefined)

export function JobProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [activeJobId, setActiveJobId] = useState<number | null>(null)
  const [processingQueue, setProcessingQueue] = useState<Array<{ id: number; index: number }>>([])
  const [isPaused, setIsPaused] = useState(false)

  const startJob = async (jobId: number, csvData: string) => {
    try {
      // Parse CSV and prepare papers for processing
      const papers = await processPapers.parseCSV(csvData)

      // Update job with total count
      await updateJob(jobId, {
        status: "in_progress",
        total: papers.length,
        progress: 0,
      })

      setActiveJobId(jobId)
      setIsPaused(false)

      // Start processing papers
      processPapers.startProcessing(jobId, papers, {
        onProgress: async (processed) => {
          await updateJob(jobId, { progress: processed })
        },
        onComplete: async () => {
          await updateJob(jobId, { status: "completed" })
          setActiveJobId(null)
          toast({
            title: "Job completed",
            description: "Your extraction job has been completed",
          })
        },
        onError: (error) => {
          console.error("Processing error:", error)
          toast({
            title: "Processing error",
            description: "An error occurred during extraction",
            variant: "destructive",
          })
        },
      })
    } catch (error) {
      console.error("Error starting job:", error)
      toast({
        title: "Error",
        description: "Failed to start job",
        variant: "destructive",
      })
    }
  }

  const pauseJob = async () => {
    if (activeJobId) {
      try {
        processPapers.pauseProcessing()
        await updateJob(activeJobId, { status: "paused" })
        setIsPaused(true)
        toast({
          title: "Job paused",
          description: "Your extraction job has been paused",
        })
      } catch (error) {
        console.error("Error pausing job:", error)
        toast({
          title: "Error",
          description: "Failed to pause job",
          variant: "destructive",
        })
      }
    }
  }

  const resumeJob = async (jobId: number) => {
    try {
      const job = await getJob(jobId)
      if (!job) {
        toast({
          title: "Error",
          description: "Job not found",
          variant: "destructive",
        })
        return
      }

      await updateJob(jobId, { status: "in_progress" })
      setActiveJobId(jobId)
      setIsPaused(false)

      processPapers.resumeProcessing(jobId, {
        onProgress: async (processed) => {
          await updateJob(jobId, { progress: processed })
        },
        onComplete: async () => {
          await updateJob(jobId, { status: "completed" })
          setActiveJobId(null)
          toast({
            title: "Job completed",
            description: "Your extraction job has been completed",
          })
        },
        onError: (error) => {
          console.error("Processing error:", error)
          toast({
            title: "Processing error",
            description: "An error occurred during extraction",
            variant: "destructive",
          })
        },
      })

      toast({
        title: "Job resumed",
        description: "Your extraction job has been resumed",
      })
    } catch (error) {
      console.error("Error resuming job:", error)
      toast({
        title: "Error",
        description: "Failed to resume job",
        variant: "destructive",
      })
    }
  }

  const cancelJob = async (jobId: number) => {
    try {
      if (activeJobId === jobId) {
        processPapers.cancelProcessing()
        setActiveJobId(null)
      }

      await updateJob(jobId, { status: "cancelled" })
      toast({
        title: "Job cancelled",
        description: "Your extraction job has been cancelled",
      })
    } catch (error) {
      console.error("Error cancelling job:", error)
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      })
    }
  }

  return (
    <JobContext.Provider value={{ activeJobId, startJob, pauseJob, resumeJob, cancelJob }}>
      {children}
    </JobContext.Provider>
  )
}

export function useJobContext() {
  const context = useContext(JobContext)
  if (context === undefined) {
    throw new Error("useJobContext must be used within a JobProvider")
  }
  return context
}
