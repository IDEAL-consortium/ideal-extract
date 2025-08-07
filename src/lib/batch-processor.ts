import { Job, Paper } from "@/types";
import { createBatch, getBatchStatus, getBatchResults } from "./openai-service";
import { getJob, updateJob } from "./job-manager";

export const processBatch = {
  start: async (jobId: number, papers: Paper[]) => {
    const job = await getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const batchId = await createBatch(papers, job.fields);
    await updateJob(jobId, { status: "in_progress", batchId });
  },

  checkStatus: async (jobId: number) => {
    const job = await getJob(jobId);
    if (!job || !job.batchId) {
      throw new Error("Job or batch ID not found");
    }

    const batch = await getBatchStatus(job.batchId);

    await updateJob(jobId, { status: batch.status, progress: batch.request_counts?.completed });
  },
};