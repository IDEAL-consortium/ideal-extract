import { getPapersByJobId } from "./paper-manager";
import { getJob } from "./job-manager";
import Papa from "papaparse";

export async function downloadCSV(jobId: number): Promise<void> {
  // Get job details
  const job = await getJob(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  // Get all papers for this job
  const papers = await getPapersByJobId(jobId);
  if (papers.length === 0) {
    throw new Error("No papers found for this job");
  }

  // Prepare data for papaparse
  const data = papers.map((paper) => {
    const row: { [key: string]: string | undefined } = {
      Title: paper.title,
      Abstract: paper.abstract,
      Authors: paper.authors,
      Keywords: paper.keywords,
      DOI: paper.doi,
    };

    if (job.fields.design) {
      row["Design"] = paper.extracted.design || "";
    }

    if (job.fields.method) {
      row["Method"] = paper.extracted.method || "";
    }

    job.fields.custom.forEach((field) => {
      row[field.name] = paper.extracted[field.name] || "";
    });

    return row;
  });

  // Create CSV content using papaparse
  const csvContent = Papa.unparse(data);

  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `extraction-results-${jobId}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
