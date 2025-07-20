"use client"

import { getPapersByJobId } from "./paper-manager"
import { getJob } from "./job-manager"

export async function downloadCSV(jobId: number): Promise<void> {
  // Get job details
  const job = await getJob(jobId)
  if (!job) {
    throw new Error("Job not found")
  }

  // Get all papers for this job
  const papers = await getPapersByJobId(jobId)
  if (papers.length === 0) {
    throw new Error("No papers found for this job")
  }

  // Determine all possible columns
  const columns = ["Title", "Abstract", "Authors", "Keywords", "DOI"]

  // Add extracted field columns
  if (job.fields.design) {
    columns.push("Design")
  }

  if (job.fields.method) {
    columns.push("Method")
  }

  // Add custom field columns
  job.fields.custom.forEach((field) => {
    columns.push(field.name)
  })

  // Create CSV content
  let csvContent = columns.join(",") + "\n"

  papers.forEach((paper) => {
    const row = [
      `"${escapeCSV(paper.title)}"`,
      `"${escapeCSV(paper.abstract)}"`,
      `"${escapeCSV(paper.authors)}"`,
      `"${escapeCSV(paper.keywords)}"`,
      paper.doi,
    ]

    // Add extracted fields
    if (job.fields.design) {
      row.push(`"${escapeCSV(paper.extracted.design || "")}"`)
    }

    if (job.fields.method) {
      row.push(`"${escapeCSV(paper.extracted.method || "")}"`)
    }

    // Add custom fields
    job.fields.custom.forEach((field) => {
      row.push(`"${escapeCSV(paper.extracted[field.name] || "")}"`)
    })

    csvContent += row.join(",") + "\n"
  })

  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `extraction-results-${jobId}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function escapeCSV(text: string): string {
  return text.replace(/"/g, '""')
}
