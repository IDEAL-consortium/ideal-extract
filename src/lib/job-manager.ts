import { Job } from "@/types";
import { db } from "./db"

export async function createJob(jobData: Omit<Job, "id">): Promise<Job> {
  const id = await db.jobs.add(jobData as Job);
  return { id, ...jobData } as Job;
}

export async function getJob(id: number): Promise<Job | undefined> {
  return await db.jobs.get(id);
}

export async function updateJob(id: number, updates: Partial<Job>): Promise<Job> {
  await db.jobs.update(id, updates);
  return (await db.jobs.get(id))!;
}

export async function getAllJobs(): Promise<Job[]> {
  return await db.jobs.orderBy("created").reverse().toArray();
}
