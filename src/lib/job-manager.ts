"use client"

import { getDB, STORES } from "./db"
import type { Job } from "@/types"

export async function createJob(jobData: Omit<Job, "id">): Promise<Job> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS], "readwrite")
    const store = transaction.objectStore(STORES.JOBS)

    const request = store.add(jobData)

    request.onsuccess = (event) => {
      const id = (event.target as IDBRequest<number>).result
      resolve({ id, ...jobData })
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getJob(id: number): Promise<Job | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS], "readonly")
    const store = transaction.objectStore(STORES.JOBS)

    const request = store.get(id)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function updateJob(id: number, updates: Partial<Job>): Promise<Job> {
  const db = await getDB()

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS], "readwrite")
    const store = transaction.objectStore(STORES.JOBS)

    // First get the current job
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      if (!getRequest.result) {
        reject(new Error(`Job with id ${id} not found`))
        return
      }

      // Update the job with new values
      const updatedJob = {
        ...getRequest.result,
        ...updates,
        updated: new Date(),
      }

      const updateRequest = store.put(updatedJob)

      updateRequest.onsuccess = () => {
        resolve(updatedJob)
      }

      updateRequest.onerror = () => {
        reject(updateRequest.error)
      }
    }

    getRequest.onerror = () => {
      reject(getRequest.error)
    }
  })
}

export async function getAllJobs(): Promise<Job[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS], "readonly")
    const store = transaction.objectStore(STORES.JOBS)
    const index = store.index("created")

    const request = index.openCursor(null, "prev") // Sort by created date, newest first
    const jobs: Job[] = []

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

      if (cursor) {
        jobs.push(cursor.value)
        cursor.continue()
      } else {
        resolve(jobs)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function deleteJob(id: number): Promise<void> {
  const db = await getDB()

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([STORES.JOBS, STORES.PAPERS], "readwrite")
    const jobsStore = transaction.objectStore(STORES.JOBS)
    const papersStore = transaction.objectStore(STORES.PAPERS)
    const papersIndex = papersStore.index("jobId")

    // Delete the job
    const jobRequest = jobsStore.delete(id)

    jobRequest.onsuccess = async () => {
      // Delete all papers associated with this job
      const papersRequest = papersIndex.openCursor(IDBKeyRange.only(id))

      papersRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      papersRequest.onerror = () => {
        reject(papersRequest.error)
      }
    }

    jobRequest.onerror = () => {
      reject(jobRequest.error)
    }
  })
}
