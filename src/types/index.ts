export interface Job {
  id: number
  filename: string
  mode: "fulltext" | "abstract"
  fields: {
    design: boolean
    method: boolean
    custom: Array<{
      name: string
      instruction: string
    }>
  }
  status: "pending" | "in_progress" | "paused" | "completed" | "cancelled"
  progress: number
  total: number
  created: Date
  updated: Date
}

export interface ExtractedFields {
  [key: string]: string
}

export interface Paper {
  id?: number
  jobId?: number
  title: string
  abstract: string
  authors: string
  keywords: string
  doi: string
  extracted: ExtractedFields
}
