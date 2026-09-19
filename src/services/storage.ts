import { Book, CustomLibrary, ReaderSettings } from '../types';

const DB_NAME = 'DriveEbookReaderDB';
const DB_VERSION = 1;
const STORE_BLOBS = 'book_blobs';
const STORE_METADATA = 'app_metadata';

const DEFAULT_LIBRARIES: CustomLibrary[] = [
  { id: 'lib-comics', name: 'BD & Comics (CBZ/CBR)', icon: 'Sparkles', color: '#6366f1', createdAt: Date.now() - 3000 },
  { id: 'lib-mangas', name: 'Mangas', icon: 'BookOpen', color: '#ec4899', createdAt: Date.now() - 2000 },
  { id: 'lib-novels', name: 'Livres & Romans', icon: 'Bookmark', color: '#10b981', createdAt: Date.now() - 1000 },
  { id: 'lib-docs', name: 'Guides & Documents PDF', icon: 'FileText', color: '#f59e0b', createdAt: Date.now() },
];

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'light',
  pageFit: 'contain',
  readingMode: 'single',
  fontSize: 18,
  fontFamily: 'sans',
  brightness: 100,
  invertInDarkMode: false,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Blob / Offline Binary Storage
export async function saveBookBlob(bookId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.put(blob, bookId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBookBlob(bookId: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.get(bookId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBookBlob(bookId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.delete(bookId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Local Metadata Storage (Books catalog, libraries, settings)
export async function getStoredBooks(): Promise<Book[]> {
  try {
    const raw = localStorage.getItem('drive_reader_books');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load books from localStorage', e);
    return [];
  }
}

export async function saveStoredBooks(books: Book[]): Promise<void> {
  try {
    localStorage.setItem('drive_reader_books', JSON.stringify(books));
  } catch (e) {
    console.error('Failed to save books to localStorage', e);
  }
}

export async function getLibraries(): Promise<CustomLibrary[]> {
  try {
    const raw = localStorage.getItem('drive_reader_libraries');
    if (!raw) {
      saveLibraries(DEFAULT_LIBRARIES);
      return DEFAULT_LIBRARIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load libraries', e);
    return DEFAULT_LIBRARIES;
  }
}

export async function saveLibraries(libraries: CustomLibrary[]): Promise<void> {
  try {
    localStorage.setItem('drive_reader_libraries', JSON.stringify(libraries));
  } catch (e) {
    console.error('Failed to save libraries', e);
  }
}

export function getReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem('drive_reader_settings');
    if (!raw) return DEFAULT_READER_SETTINGS;
    return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem('drive_reader_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save reader settings', e);
  }
}
