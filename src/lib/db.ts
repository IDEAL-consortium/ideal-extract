"use client"

const DB_NAME = "ideal-extraction"
const DB_VERSION = 1

// Database schema
const OBJECT_STORES = {
  JOBS: "jobs",
  PAPERS: "papers",
}

export async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      reject("Database error: " + (event.target as IDBOpenDBRequest).error)
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create jobs store
      if (!db.objectStoreNames.contains(OBJECT_STORES.JOBS)) {
        const jobsStore = db.createObjectStore(OBJECT_STORES.JOBS, { keyPath: "id", autoIncrement: true })
        jobsStore.createIndex("status", "status", { unique: false })
        jobsStore.createIndex("created", "created", { unique: false })
      }

      // Create papers store
      if (!db.objectStoreNames.contains(OBJECT_STORES.PAPERS)) {
        const papersStore = db.createObjectStore(OBJECT_STORES.PAPERS, { keyPath: "id", autoIncrement: true })
        papersStore.createIndex("jobId", "jobId", { unique: false })
        papersStore.createIndex("doi", "doi", { unique: false })
      }
    }
  })
}

export async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      reject("Database error: " + (event.target as IDBOpenDBRequest).error)
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }
  })
}

export const STORES = OBJECT_STORES
