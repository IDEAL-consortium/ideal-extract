import { getJob } from "./job-manager";
import { getBatchResults } from "./openai-service";
import Papa from "papaparse";

export async function downloadCSV(jobId: number): Promise<void> {
  // Get job details
  const job = await getJob(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  if (!job.batchId) {
    throw new Error("Batch ID not found for this job");
  }

  // Get all papers for this job
  const results = await getBatchResults(job.batchId);
  if (results.length === 0) {
    throw new Error("No papers found for this job");
  }

  // Prepare data for papaparse
  const data = results.map((result: any) => {
    const paper = result.custom_id;
    const extracted = result.response.body.choices[0].message.tool_calls[0].function.arguments;

    const row: { [key: string]: string | undefined } = {
      Title: paper.title,
      Abstract: paper.abstract,
      Authors: paper.authors,
      Keywords: paper.keywords,
      DOI: paper.doi,
    };

    if (job.fields.design) {
      row["Design"] = extracted.design || "";
    }

    if (job.fields.method) {
      row["Method"] = extracted.method || "";
    }

    job.fields.custom.forEach((field) => {
      row[field.name] = extracted[field.name] || "";
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
