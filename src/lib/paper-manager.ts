"use client"

import { getDB, STORES } from "./db"
import type { Paper } from "@/types"

export async function savePaper(paper: Paper & { jobId: number }): Promise<Paper> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PAPERS], "readwrite")
    const store = transaction.objectStore(STORES.PAPERS)

    const request = store.add(paper)

    request.onsuccess = (event) => {
      const id = (event.target as IDBRequest<number>).result
      resolve({ ...paper, id })
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getPapersByJobId(jobId: number): Promise<Paper[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PAPERS], "readonly")
    const store = transaction.objectStore(STORES.PAPERS)
    const index = store.index("jobId")

    const request = index.getAll(jobId)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getPaperByDoi(doi: string): Promise<Paper | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PAPERS], "readonly")
    const store = transaction.objectStore(STORES.PAPERS)
    const index = store.index("doi")

    const request = index.get(doi)

    request.onsuccess = () => {
      resolve(request.result || null)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}
