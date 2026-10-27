/**
 * IndexedDB Offline Storage Utility
 * Provides persistent, quota-free storage for large document attachments (PDFs, DOCX, images),
 * cached study sessions, and offline review data.
 */

import { DeckAttachment } from '../types';

const DB_NAME = 'noetic_study_idb_v1';
const DB_VERSION = 1;

export const STORES = {
  ATTACHMENTS: 'attachments',
  SESSIONS: 'sessions',
  AUDIO_CACHE: 'audio_cache'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Large file attachments (PDF, DOCX, images)
        if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
          db.createObjectStore(STORES.ATTACHMENTS, { keyPath: 'id' });
        }

        // Store 2: Offline study sessions & drafts
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        }

        // Store 3: Synthesized audio chunks
        if (!db.objectStoreNames.contains(STORES.AUDIO_CACHE)) {
          db.createObjectStore(STORES.AUDIO_CACHE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

// ==========================================
// ATTACHMENT CACHING (PDFs, DOCX, Images)
// ==========================================

export async function saveAttachmentToDB(attachment: DeckAttachment): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ATTACHMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ATTACHMENTS);
      const req = store.put(attachment);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveAttachment error, falling back to memory:', err);
  }
}

export async function saveMultipleAttachmentsToDB(attachments: DeckAttachment[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ATTACHMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ATTACHMENTS);
      attachments.forEach(att => store.put(att));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveMultipleAttachments error:', err);
  }
}

export async function getAllAttachmentsFromDB(): Promise<DeckAttachment[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ATTACHMENTS, 'readonly');
      const store = tx.objectStore(STORES.ATTACHMENTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB getAllAttachments error:', err);
    return [];
  }
}

export async function deleteAttachmentFromDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ATTACHMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ATTACHMENTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB deleteAttachment error:', err);
  }
}

export async function clearAllAttachmentsFromDB(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ATTACHMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ATTACHMENTS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB clearAllAttachments error:', err);
  }
}

// ==========================================
// AUDIO BRIEFING CACHE
// ==========================================

export async function cacheAudioTurn(key: string, audioDataUrl: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.AUDIO_CACHE);
      store.put({ key, dataUrl: audioDataUrl, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Audio cache save error:', err);
  }
}

export async function getCachedAudioTurn(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.AUDIO_CACHE, 'readonly');
      const store = tx.objectStore(STORES.AUDIO_CACHE);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result?.dataUrl || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

// ==========================================
// OFFLINE STUDY SESSIONS & DECKS STORAGE
// ==========================================

export async function saveOfflineStudySession(session: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.SESSIONS);
      const req = store.put({ ...session, id: session.id || `session-${Date.now()}` });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveOfflineStudySession error:', err);
  }
}

export async function getAllOfflineStudySessions(): Promise<any[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAllOfflineStudySessions error:', err);
    return [];
  }
}

