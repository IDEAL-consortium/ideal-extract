"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useJobContext } from "@/context/job-context"
import { getAllJobs, getJob, deleteJob } from "@/lib/job-manager"
import { downloadCSV } from "@/lib/csv-utils"
import type { Job } from "@/types"
import { Play, Pause, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"


export default function JobManagement() {
  const { activeJobId, pauseJob, resumeJob } = useJobContext()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()

    // Set up interval to refresh job status
    const interval = setInterval(loadJobs, 2000)
    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const allJobs = await getAllJobs()
      setJobs(allJobs)
      setLoading(false)
    } catch (error) {
      console.error("Error loading jobs:", error)
      setLoading(false)
    }
  }

  const handleDownload = async (jobId: number) => {
    try {
      const job = await getJob(jobId)
      if (!job) {
        toast("Job not found")
        return
      }

      await downloadCSV(jobId)
      toast("Results downloaded successfully")
    } catch (error) {
      console.error("Error downloading results:", error)
      toast("Failed to download results")
    }
  }

  const handleDeleteJob = async (jobId: number) => {
    try {
      await deleteJob(jobId)
      setJobs(jobs.filter((job) => job.id !== jobId))
      toast("Job deleted successfully")
    } catch (error) {
      console.error("Error deleting job:", error)
      toast("Failed to delete job")
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading jobs...</div>
  }

  if (jobs.length === 0) {
    return <div className="text-center py-4">No extraction jobs found</div>
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{job.filename}</h3>
              <p className="text-sm text-muted-foreground">Created: {new Date(job.created).toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-2">
              {job.status === "in_progress" && job.id === activeJobId ? (
                <Button variant="outline" size="sm" onClick={() => pauseJob()}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              ) : job.status === "paused" ? (
                <Button variant="outline" size="sm" onClick={() => resumeJob(job.id)}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : null}

              <Button variant="outline" size="sm" onClick={() => handleDownload(job.id)}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>

              <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>
                Progress: {job.progress} of {job.total}
              </span>
              <span>{job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0}%</span>
            </div>
            <Progress value={job.total > 0 ? (job.progress / job.total) * 100 : 0} />
          </div>

          <div className="text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                job.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : job.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : job.status === "paused"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {job.status === "in_progress"
                ? "In Progress"
                : job.status === "completed"
                  ? "Completed"
                  : job.status === "paused"
                    ? "Paused"
                    : "Pending"}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
