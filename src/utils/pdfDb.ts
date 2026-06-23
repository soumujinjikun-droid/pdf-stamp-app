import { PDFDocumentFile } from '../types';

const DB_NAME = 'pdf_stamper_db_v1';
const STORE_NAME = 'pdf_files';

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Saves or updates a PDF document file entry in IndexedDB.
 */
export async function savePdfToDb(file: PDFDocumentFile): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Prepare data to save, ensuring history is kept clean to preserve memory.
    const recordToSave = {
      id: file.id,
      name: file.name,
      size: file.size,
      arrayBuffer: file.arrayBuffer,
      placedElements: file.placedElements,
      thumbnailPageUrls: file.thumbnailPageUrls,
      pageDimensions: file.pageDimensions,
      pageRotations: file.pageRotations || {}
    };

    const request = store.put(recordToSave);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to save file to IndexedDB store:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves all saved PDF documents from IndexedDB.
 */
export async function getPdfsFromDb(): Promise<PDFDocumentFile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result || [];
      const files: PDFDocumentFile[] = records.map((record: any) => ({
        id: record.id,
        name: record.name,
        size: record.size,
        arrayBuffer: record.arrayBuffer,
        placedElements: record.placedElements || [],
        thumbnailPageUrls: record.thumbnailPageUrls || [],
        pageDimensions: record.pageDimensions || [],
        pageRotations: record.pageRotations || {},
        history: { past: [], future: [] }
      }));
      resolve(files);
    };

    request.onerror = () => {
      console.error('Failed to query files from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Deletes a PDF document file entry from IndexedDB by its unique ID.
 */
export async function deletePdfFromDb(fileId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(fileId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete file from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Clears all PDF entries from the store.
 */
export async function clearAllPdfsFromDb(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to clear database store:', request.error);
      reject(request.error);
    };
  });
}
