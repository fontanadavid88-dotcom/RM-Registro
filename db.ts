import Dexie from 'dexie';
import { Material } from './types';

// Use a simplified initialization pattern to avoid class property syntax issues
const db = new Dexie('MaterialsRegistryDB');

db.version(1).stores({
  materials: '++id, nome, lotto, dataScadenza, ubicazione, stato'
});

export const materialsTable = db.table<Material>('materials');
export { db };