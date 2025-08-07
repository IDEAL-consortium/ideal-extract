import { JobFile } from "@/types";
import { db } from "./db";

export async function addFile(jobId: number, file: Blob, filename: string): Promise<JobFile> {
    const jobFile = {
        jobId,
        filename,
        file,
    } as JobFile;

    const id = await db.files.add(jobFile);
    return { ...jobFile, id };
}

export async function getFilesByJobId(jobId: number): Promise<JobFile[]> {
    return db.files.where("jobId").equals(jobId).toArray();
}

export async function deleteFile(id: number): Promise<void> {
    await db.files.delete(id);
}