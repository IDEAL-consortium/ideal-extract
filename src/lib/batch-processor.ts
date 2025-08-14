import { Paper, PDFData } from "@/types";
import { getJob, updateJob } from "./job-manager";
import { createBatch, getBatchStatus } from "./openai-service";
import { PDFMatch } from "./pdf-utils";

export const processBatch = {
  start: async (jobId: number, papers: Paper[], pdfParams?: {
    pdfData: Array<PDFData>,
    matches: Array<PDFMatch>
  }) => {
    const job = await getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    if (pdfParams){
      addFullTextToPapers(papers, pdfParams);
    }
    // if pdfParams is provided, use only papers with full text
    const filteredPapers = pdfParams ? papers.filter(paper => paper.fulltext) : papers;
    if (filteredPapers.length === 0) {
      throw new Error("No papers with full text found for batch processing.");
    }
    // Create batch with the filtered papers
    const batchId = await createBatch(filteredPapers, job.fields);
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