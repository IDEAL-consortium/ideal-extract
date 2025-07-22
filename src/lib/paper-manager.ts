"use client"

import { Paper } from "@/types";
import { db } from "./db"

export async function savePaper(paper: Paper): Promise<Paper> {
  const id = await db.papers.add(paper);
  return { ...paper, id };
}

export async function getPapersByJobId(jobId: number): Promise<Paper[]> {
  return await db.papers.where('jobId').equals(jobId).toArray();
}

export async function getPaperByDoi(doi: string): Promise<Paper | undefined> {
  return await db.papers.where('doi').equals(doi).first();
}