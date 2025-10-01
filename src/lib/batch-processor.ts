import { CustomField, Paper, PaperWithFields, PDFData } from "@/types";
import { getJob, updateJob } from "./job-manager";
import { createBatch, getBatchStatus } from "./openai-service";
import { PDFMatch } from "./pdf-utils";
import { isPaperIncluded } from "./filter-utils";

export const processBatch = {
  start: async (jobId: number, papers: PaperWithFields[], pdfParams?: {
    pdfData: Array<PDFData>,
    matches: Array<PDFMatch>
  }, customFields?: Array<CustomField>) => {
    const job = await getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    if (pdfParams){
      addFullTextToPapers(papers, pdfParams);
    }
    // if pdfParams is provided, use only papers with full text
    const filteredPapers = pdfParams ? papers.filter(paper => paper.fulltext && isPaperIncluded(paper, job.fields.custom)) : papers;
    if (filteredPapers.length === 0) {
      throw new Error("No papers with full text found for batch processing.");
    }
    // Determine models to use (multi-model support)
    const models: string[] = (job.options?.models && job.options.models.length > 0)
      ? job.options.models
      : [job.options?.model || "gpt-4.1"];

    const batches: Array<{ model: string; batchId: string; status?: string; completed?: number; total?: number }> = [];
    const computedTotal = filteredPapers.length * models.length;
    for (const model of models) {
      const batchId = await createBatch(filteredPapers, job.fields, { ...(job.options || {}), model });
      batches.push({ model, batchId, total: filteredPapers.length, completed: 0, status: "in_progress" });
    }

    // Backward-compatible single batchId (first)
    const firstBatchId = batches[0]?.batchId;
    await updateJob(jobId, { status: "in_progress", batchId: firstBatchId, batches, total: computedTotal });
  },

  checkStatus: async (jobId: number) => {
    const job = await getJob(jobId);
    if (!job || !job.batchId) {
      // If multi-batch, allow missing legacy batchId as long as batches exist
      if (!job || !job.batches || job.batches.length === 0) {
        throw new Error("Job or batch ID not found");
      }
    }

    try {
      if (job.batches && job.batches.length > 0) {
        let summedCompleted = 0;
        let aggregateStatus: string = "in_progress";
        let anyFailed = false;
        let allCompleted = true;
        const updatedBatches = [] as typeof job.batches;
        for (const b of job.batches) {
          const batch = await getBatchStatus(b.batchId);
          const completed = batch.request_counts?.completed || 0;
          summedCompleted += completed;
          updatedBatches.push({ ...b, status: batch.status, completed });
          if (batch.status !== "completed") allCompleted = false;
          if (batch.status === "failed") anyFailed = true;
        }
        if (anyFailed) aggregateStatus = "failed";
        else if (allCompleted) aggregateStatus = "completed";
        else aggregateStatus = "in_progress";

        const validatedProgress = Math.min(summedCompleted, job.total);
        await updateJob(jobId, {
          status: aggregateStatus as any,
          progress: validatedProgress,
          updated: new Date(),
          batches: updatedBatches,
        });
      } else {
        const batch = await getBatchStatus(job.batchId);
        // Validate progress doesn't exceed total
        const progress = batch.request_counts?.completed || 0;
        const validatedProgress = Math.min(progress, job.total);
        await updateJob(jobId, {
          status: batch.status as any,
          progress: validatedProgress,
          updated: new Date(),
        });
      }
    } catch (error) {
      console.error(`Failed to check status for job ${jobId}:`, error);
      // Don't update job status on API failures to avoid overwriting valid states
      throw new Error(`Failed to check batch status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

function addFullTextToPapers(papers: Paper[], pdfParams: {
  pdfData: Array<PDFData>,
  matches: Array<PDFMatch>
}) {
  const {pdfData, matches} = pdfParams
  for (const match of matches){
    const {paperIndex, pdfIndex} = match
    const paper = papers[paperIndex];
    if (paper && pdfData[pdfIndex]) {
      console.log(`Adding full text to paper ${paper.id}: ${pdfData[pdfIndex].fulltext?.split("\n")[0]}`);
      paper.fulltext = pdfData[pdfIndex].fulltext;
    }
  }
  }