// Menu items

import { Download, FileText, Settings } from "lucide-react"

const routesMetadata = [
  {
    title: "Extract Fields",
    url: "/#/extract",
    icon: FileText,
    description: "Upload and extract fields from papers",
  },
  {
    title: "Job Management",
    url: "/#/job-management",
    icon: Settings,
    description: "Manage extraction jobs and progress",
  },
  {
    title: "PDF Download",
    icon: Download,
    url: "/#/download",
    description: "Download PDFs for full-text extraction",
  },
  {
    title: "Settings",
    url: "/#/settings",
    icon: Settings,
    description: "Configure application settings",
  },
]

export default routesMetadata