import { Job, Paper } from '@/types';
import Dexie, { Table } from 'dexie';

class IdealExtractDB extends Dexie {
  jobs!: Table<Job>;
  papers!: Table<Paper>;

  constructor() {
    super('ideal-extract-db');
    this.version(1).stores({
      jobs: '++id, name, status, created',
      papers: '++id, jobId, doi',
    });
  }
}

export const db = new IdealExtractDB();