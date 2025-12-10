"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { deleteJob, getAllJobs, getJob, createJob } from "@/lib/job-manager";
import { downloadCSV } from "@/lib/csv-utils";
import { processBatch } from "@/lib/batch-processor";
import type { Job } from "@/types";
import { Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cancelBatch } from "@/lib/openai-service";
import { downloadCustomFields } from "@/hooks/use-custom-fields";
import { HelpText } from "./help-text";
import { useNavigate } from "react-router-dom";
import FeedbackModal from "./feedback-modal";

export default function JobManagement() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<Set<number>>(new Set());
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{
    jobId: number;
    batchId?: string;
    model?: string;
    onlyProcessed: boolean;
  } | null>(null);

  // Add fake job for testing on localhost
  useEffect(() => {
    const addFakeJobForTesting = async () => {
      if (window.location.hostname === "localhost") {
        const existingJobs = await getAllJobs();
        const hasFakeJob = existingJobs.some(j => j.filename === "test_papers.csv" && j.batchId === "fake_batch_123");
        if (!hasFakeJob) {
          await createJob({
            filename: "test_papers.csv",
            mode: "abstract",
            fields: {
              design: true,
              method: true,
              custom: [
                { name: "Has Control Group", instruction: "Does the study include a control group?", type: "boolean" },
                { name: "Sample Size", instruction: "What is the sample size of the study?", type: "text" },
              ],
            },
            status: "completed",
            progress: 25,
            total: 25,
            created: new Date(),
            updated: new Date(),
            batchId: "fake_batch_123",
            batches: [{
              model: "gpt-4.1-mini",
              batchId: "fake_batch_123",
              status: "completed",
              completed: 25,
              total: 25,
              output_file_id: "fake_output_123"
            }],
            options: {
              model: "gpt-4.1-mini",
              models: ["gpt-4.1-mini"],
            }
          });
        }
      }
    };
    addFakeJobForTesting();
  }, []);

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
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to load jobs: ${errorMessage}`);
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
      toast.success("Job status updated.");
    } catch (error) {
      console.error("Error checking job status:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("Job or batch ID not found")) {
        toast.error("Job or batch not found. The job may have been deleted.");
      } else if (errorMessage.includes("API key")) {
        toast.error("OpenAI API key not configured or invalid. Please check Settings.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        toast.error("Network error: Unable to connect to OpenAI. Please check your internet connection.");
      } else {
        toast.error(`Failed to check job status: ${errorMessage}`);
      }
    } finally {
      setCheckingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleDownload = async (jobId: number, onlyProcessed: boolean) => {
    // Open feedback modal before download
    setPendingDownload({ jobId, onlyProcessed });
    setFeedbackModalOpen(true);
  };

  const executeDownload = async () => {
    if (!pendingDownload) return;
    
    const { jobId, onlyProcessed } = pendingDownload;
    
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast.error("Job not found. It may have been deleted.");
        return;
      }

      await downloadCSV(jobId, onlyProcessed);
      toast.success("Results downloaded successfully");
    } catch (error) {
      console.error("Error downloading results:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        toast.error("Results not found. The batch may not have completed yet or results may have been deleted.");
      } else if (errorMessage.includes("API key")) {
        toast.error("OpenAI API key not configured or invalid. Please check Settings.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        toast.error("Network error: Unable to download results. Please check your internet connection.");
      } else {
        toast.error(`Failed to download results: ${errorMessage}`);
      }
    } finally {
      setPendingDownload(null);
    }
  };

  const handleFeedbackComplete = () => {
    setFeedbackModalOpen(false);
    if (pendingDownload?.model) {
      executeDownloadBatch();
    } else {
      executeDownload();
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      await deleteJob(job.id);
      setJobs(jobs.filter((j) => j.id !== job.id));
      toast.success("Job deleted successfully");
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to delete job: ${errorMessage}`);
    }
  };
  const handleDownloadCustomFields = async (jobId: number) => {
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast.error("Job not found. It may have been deleted.");
        return;
      }
      downloadCustomFields(job.fields.custom || []);
      toast.success("Custom fields downloaded successfully");
    } catch (error) {
      console.error("Error downloading custom fields:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to download custom fields: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading jobs...</div>;
  }

  if (jobs.length === 0) {
    return <div className="text-center py-4">No screening jobs found</div>;
  }

  const handleDownloadBatch = async (jobId: number, batchId: string, model: string, onlyProcessed: boolean) => {
    // Open feedback modal before download
    setPendingDownload({ jobId, batchId, model, onlyProcessed });
    setFeedbackModalOpen(true);
  };

  const executeDownloadBatch = async () => {
    if (!pendingDownload || !pendingDownload.model) return;
    
    const { jobId, model, onlyProcessed } = pendingDownload;
    
    try {
      const job = await getJob(jobId);
      if (!job) {
        toast.error("Job not found. It may have been deleted.");
        return;
      }

      await downloadCSV(jobId, onlyProcessed);
      toast.success(`Results for ${model} downloaded successfully`);
    } catch (error) {
      console.error("Error downloading results:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        toast.error(`Results for ${model} not found. The batch may not have completed yet or results may have been deleted.`);
      } else if (errorMessage.includes("API key")) {
        toast.error("OpenAI API key not configured or invalid. Please check Settings.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        toast.error("Network error: Unable to download results. Please check your internet connection.");
      } else {
        toast.error(`Failed to download results for ${model}: ${errorMessage}`);
      }
    } finally {
      setPendingDownload(null);
    }
  };

  return (
    <div className="space-y-4">
      <FeedbackModal
        open={feedbackModalOpen}
        onComplete={handleFeedbackComplete}
        jobId={pendingDownload?.jobId || 0}
      />
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Job Management</h1>
        <HelpText 
          text="Monitor screening jobs, check status, and download results. Jobs automatically refresh every 5 seconds when active. Each model in a multi-model job has its own batch with separate progress."
          linkTo="/#/manual#job-management"
          linkText="Learn more about job management"
        />
      </div>
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 mb-4">
        <h4 className="font-semibold text-sm">Getting Started</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Create screening jobs in <a href="/#/extract" onClick={(e) => { e.preventDefault(); navigate('/extract'); }} className="text-blue-600 hover:underline cursor-pointer">Screen Fields</a></li>
          <li>Jobs appear here automatically and refresh every 5 seconds</li>
          <li>Monitor progress: Validating → In Progress → Finalizing → Completed</li>
          <li>When completed, download results CSV (file name starts with "extracted_fields")</li>
          <li>Use downloaded CSV in <a href="/#/llm-eval" onClick={(e) => { e.preventDefault(); navigate('/llm-eval'); }} className="text-blue-600 hover:underline cursor-pointer">LLM Eval</a> for evaluation</li>
        </ol>
      </div>
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
                      {["validating", "in_progress", "finalizing", "canceling", "expired", "canceled", "failed"].includes(batch.status || job.status) && (
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
                        disabled={!((batch.status || job.status) === "completed" || batch.output_file_id)}
                        onClick={() => handleDownloadBatch(job.id, batch.batchId, batch.model, true)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Processed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!((batch.status || job.status) === "completed" || batch.output_file_id)}
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
