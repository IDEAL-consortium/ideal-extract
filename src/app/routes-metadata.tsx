// Menu items

import { Download, FileText, Settings, BookOpen } from "lucide-react"

// Get the base path from Vite's import.meta.env.BASE_URL or use default
const basePath = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "")

const routesMetadata = [
  {
    title: "Extract Fields",
    url: `${basePath}/#/extract`,
    icon: FileText,
    description: "Upload and extract fields from papers",
  },
  {
    title: "Job Management",
    url: `${basePath}/#/job-management`,
    icon: Settings,
    description: "Manage extraction jobs and progress",
  },
  {
    title: "LLM Eval",
    url: `${basePath}/#/llm-eval`,
    icon: FileText,
    description: "Evaluate LLM predictions vs human labels",
  },
  {
    title: "PDF Download",
    icon: Download,
    url: `${basePath}/#/download`,
    description: "Download PDFs for full-text extraction",
  },
  {
    title: "Settings",
    url: `${basePath}/#/settings`,
    icon: Settings,
    description: "Configure application settings",
  },
  {
    title: "Manual",
    url: `${basePath}/#/manual`,
    icon: BookOpen,
    description: "User manual and instructions",
  },
]

export default routesMetadata