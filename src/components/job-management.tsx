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
  const [checkingStatus, setCheckingStatus] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadJobs();

    // Set up interval to refresh job status, but only if there are active jobs
    const interval = setInterval(() => {
      // Only poll if there are jobs in active states
      if (jobs.some(job => ["validating", "in_progress", "finalizing", "canceling"].includes(job.status))) {
        loadJobs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [jobs]);

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
    // Prevent multiple concurrent status checks for the same job
    if (checkingStatus.has(jobId)) {
      return;
    }

    setCheckingStatus(prev => new Set(prev).add(jobId));
    
    try {
      await processBatch.checkStatus(jobId);
      await loadJobs();
      toast("Job status updated.");
    } catch (error) {
      console.error("Error checking job status:", error);
      toast("Failed to check job status.");
    } finally {
      setCheckingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
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
      if (job.status !== "completed") {
        if (job.batches && job.batches.length > 0) {
          for (const b of job.batches) {
            try { await cancelBatch(b.batchId); } catch {}
          }
        } else if (job.batchId) {
          try { await cancelBatch(job.batchId); } catch {}
        }
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

  const handleDownloadBatch = async (jobId: number, batchId: string, model: string, onlyProcessed: boolean) => {
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast("Job not found");
        return;
      }

      await downloadCSV(jobId, onlyProcessed);
      toast(`Results for ${model} downloaded successfully`);
    } catch (error) {
      console.error("Error downloading results:", error);
      toast("Failed to download results");
    }
  };

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const batches = (job.batches && job.batches.length > 0) 
          ? job.batches 
          : job.batchId 
            ? [{ model: job.options?.model || "default", batchId: job.batchId, status: job.status, completed: job.progress, total: job.total }]
            : [];
        
        return (
          <div key={job.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{job.filename}</h3>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(job.created).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Mode: {job.mode === "fulltext" ? "Full Text" : "Abstract Only"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={job.status !== "completed"}
                  onClick={() => handleDownloadCustomFields(job.id)}
                >
                  <Download className="h-4 w-4 mr-1" /> Custom Fields
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteJob(job)}
                  title="Delete entire job"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {batches.map((batch) => (
                <div key={batch.batchId} className="border-l-2 border-primary/20 pl-4 py-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium">{batch.model}</h4>
                      <p className="text-xs text-muted-foreground">
                        Status: {(batch.status || 'in_progress').split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {["validating", "in_progress", "finalizing", "canceling"].includes(batch.status || job.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckStatus(job.id)}
                          disabled={checkingStatus.has(job.id)}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${checkingStatus.has(job.id) ? 'animate-spin' : ''}`} /> 
                          {checkingStatus.has(job.id) ? 'Checking...' : 'Check Status'}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(batch.status || job.status) !== "completed"}
                        onClick={() => handleDownloadBatch(job.id, batch.batchId, batch.model, true)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Processed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(batch.status || job.status) !== "completed"}
                        onClick={() => handleDownloadBatch(job.id, batch.batchId, batch.model, false)}
                      >
                        <Download className="h-4 w-4 mr-1" /> All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        Progress: {batch.completed ?? 0} of {batch.total ?? job.total}
                      </span>
                      <span>
                        {(batch.total ?? job.total) > 0
                          ? Math.round(((batch.completed ?? 0) / (batch.total ?? job.total)) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(batch.total ?? job.total) > 0 ? ((batch.completed ?? 0) / (batch.total ?? job.total)) * 100 : 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
