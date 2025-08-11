import OpenAI from "openai";
export interface Job {
  id: number;
  filename: string;
  mode: "fulltext" | "abstract";
  fields: {
    design: boolean;
    method: boolean;
    custom: Array<CustomField>;
  };
  status: OpenAI.Batch["status"];
  progress: number;
  total: number;
  created: Date;
  updated: Date;
  batchId?: string;
  pdfFiles?: FileList;
}

export interface CustomField{
  name: string;
  instruction: string;
  recheck_yes?: boolean;
  recheck_no?: boolean;
  check_blanks_and_others?: boolean;
}

export interface JobFile {
  id: number;
  jobId: number;
  filename: string;
  file: Blob
}

export interface ExtractedFields {
  [key: string]: string;
}

export interface Paper {
  id?: number;
  jobId?: number;
  title: string;
  abstract: string;
  authors: string;
  keywords: string;
  doi: string;
  fulltext?: string;
}

export interface PDFData {
    title?: string;
    authors?: string;
    year?: string;
    doi?: string;
    filename?: string;
    fulltext?: string;
}