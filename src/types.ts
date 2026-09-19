export type EbookFormat = 'pdf' | 'cbz' | 'cbr' | 'epub' | 'txt' | 'unknown';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
}

export interface Book {
  id: string; // Drive file id
  title: string;
  format: EbookFormat;
  fileSize: number;
  lastModified: string;
  driveFileId: string;
  coverUrl?: string; // base64 or blob url
  libraries: string[]; // collection IDs
  isOfflineAvailable: boolean;
  isFavorite: boolean;
  currentPage: number;
  totalPages: number;
  progress: number; // 0 - 100
  lastReadAt?: number;
  offlineDownloadedAt?: number;
  author?: string;
}

export interface CustomLibrary {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  createdAt: number;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'amoled';
export type PageFit = 'contain' | 'width' | 'height';
export type ComicReadingMode = 'single' | 'double' | 'webtoon';

export interface ReaderSettings {
  theme: ReaderTheme;
  pageFit: PageFit;
  readingMode: ComicReadingMode;
  fontSize: number; // For text/epub
  fontFamily: 'serif' | 'sans' | 'mono';
  brightness: number; // 50 to 100
  invertInDarkMode: boolean;
}
