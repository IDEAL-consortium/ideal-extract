"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { deleteJob, getAllJobs, getJob } from "@/lib/job-manager";
import { downloadCSV } from "@/lib/csv-utils";
import { processBatch } from "@/lib/batch-processor";
import type { Job } from "@/types";
import { Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cancelBatch } from "@/lib/openai-service";
import { downloadCustomFields } from "@/hooks/use-custom-fields";

export default function JobManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();

    // Set up interval to refresh job status
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const allJobs = await getAllJobs();
      setJobs(allJobs);
      setLoading(false);
    } catch (error) {
      console.error("Error loading jobs:", error);
      setLoading(false);
    }
  };

  const handleCheckStatus = async (jobId: number) => {
    try {
      await processBatch.checkStatus(jobId);
      loadJobs();
      toast("Job status updated.");
    } catch (error) {
      console.error("Error checking job status:", error);
      toast("Failed to check job status.");
    }
  };

  const handleDownload = async (jobId: number, onlyProcessed: boolean) => {
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast("Job not found");
        return;
      }

      await downloadCSV(jobId, onlyProcessed);
      toast("Results downloaded successfully");
    } catch (error) {
      console.error("Error downloading results:", error);
      toast("Failed to download results");
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      await deleteJob(job.id);
      setJobs(jobs.filter((j) => j.id !== job.id));
      toast("Job deleted successfully");
      if (job.status !== "completed" && job.batchId) {
        cancelBatch(job.batchId); // Optionally cancel the batch if needed
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast("Failed to delete job");
    }
  };
  const handleDownloadCustomFields = async (jobId: number) => {
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast("Job not found");
        return;
      }
      downloadCustomFields(job.fields.custom || []);
    } catch (error) {
      console.error("Error downloading custom fields:", error);
      toast("Failed to download custom fields");
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading jobs...</div>;
  }

  if (jobs.length === 0) {
    return <div className="text-center py-4">No extraction jobs found</div>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{job.filename}</h3>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(job.created).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {job.status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {job.status === "in_progress" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckStatus(job.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Check Status
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={job.status !== "completed"}
                onClick={() => handleDownloadCustomFields(job.id)}
              >
                <Download className="h-4 w-4 mr-1" /> Download Custom Fields
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={job.status !== "completed"}
                onClick={() => handleDownload(job.id, true)}
              >
                <Download className="h-4 w-4 mr-1" /> Download only processed results
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={job.status !== "completed"}
                onClick={() => handleDownload(job.id, false)}
              >
                <Download className="h-4 w-4 mr-1" /> Download All papers
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteJob(job)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>
                Progress: {job.progress} of {job.total}
              </span>
              <span>
                {job.total > 0
                  ? Math.round((job.progress / job.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <Progress
              value={job.total > 0 ? (job.progress / job.total) * 100 : 0}
            />
          </div>

          {/* <div className="text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                job.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : job.status === "in_progress"
                  ? "bg-blue-100 text-blue-800"
                  : job.status === ""
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
          </div> */}
        </div>
      ))}
    </div>
  );
}
