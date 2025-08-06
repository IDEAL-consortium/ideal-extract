import { Job } from '@/types';
import Dexie, { Table } from 'dexie';

class IdealExtractDB extends Dexie {
  jobs!: Table<Job>;
  files!: Table<{ id: number; jobId: number; filename: string; file: Blob }>;
  
  constructor() {
    super('ideal-extract-db');
    this.version(1).stores({
      jobs: '++id, name, status, created, batchId',
      files : '++id, jobId, filename, file',
    });
  }
}

export const db = new IdealExtractDB();
