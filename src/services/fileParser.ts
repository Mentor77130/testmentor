import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '4.0.379';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization note:', e);
  }
}

export interface ComicPage {
  index: number;
  name: string;
  url: string;
}

export interface ParsedComic {
  pages: ComicPage[];
  totalPages: number;
  coverUrl?: string;
}

export interface ParsedEpubChapter {
  id: string;
  title: string;
  content: string; // Cleaned HTML or text
}

export interface ParsedEpub {
  title: string;
  author?: string;
  chapters: ParsedEpubChapter[];
  coverUrl?: string;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];

function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

// Natural alphabetical sort for page names (e.g. 1.jpg, 2.jpg, 10.jpg)
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Parse CBZ (Comic Book Zip)
export async function parseCbz(blob: Blob): Promise<ParsedComic> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(blob);
  
  const imageEntries: Array<{ name: string; file: JSZip.JSZipObject }> = [];

  loadedZip.forEach((relativePath, file) => {
    if (!file.dir && !relativePath.startsWith('__MACOSX') && isImageFile(relativePath)) {
      imageEntries.push({ name: relativePath, file });
    }
  });

  if (imageEntries.length === 0) {
    throw new Error('Aucune image trouvée dans cette archive CBZ');
  }

  imageEntries.sort((a, b) => naturalSort(a.name, b.name));

  const pages: ComicPage[] = [];
  for (let i = 0; i < imageEntries.length; i++) {
    const entry = imageEntries[i];
    const imgBlob = await entry.file.async('blob');
    const url = URL.createObjectURL(imgBlob);
    pages.push({
      index: i + 1,
      name: entry.name.split('/').pop() || `Page ${i + 1}`,
      url
    });
  }

  return {
    pages,
    totalPages: pages.length,
    coverUrl: pages[0]?.url
  };
}

// Parse CBR (Fallback & extraction)
export async function parseCbr(blob: Blob): Promise<ParsedComic> {
  // Try JSZip first in case it's a misnamed zip
  try {
    return await parseCbz(blob);
  } catch {
    // If not zip, let's try unrar or notify
    try {
      const { unrar } = await import('unrar-js');
      const arrayBuffer = await blob.arrayBuffer();
      // unrar returns extracted files
      const result = unrar(arrayBuffer);
      if (result && Array.isArray(result) && result.length > 0) {
        const imageFiles = result.filter(f => isImageFile(f.name || f.filename));
        imageFiles.sort((a, b) => naturalSort(a.name || a.filename, b.name || b.filename));
        
        const pages: ComicPage[] = imageFiles.map((file, idx) => {
          const imgBlob = new Blob([file.fileData || file.data], { type: 'image/jpeg' });
          return {
            index: idx + 1,
            name: file.name || `Page ${idx + 1}`,
            url: URL.createObjectURL(imgBlob)
          };
        });

        if (pages.length > 0) {
          return {
            pages,
            totalPages: pages.length,
            coverUrl: pages[0]?.url
          };
        }
      }
    } catch (rarErr) {
      console.warn('CBR unrar fallback issue:', rarErr);
    }

    throw new Error("Impossible d'extraire ce fichier CBR. Privilégiez le format CBZ ou PDF standard.");
  }
}

// Parse EPUB (Zip containing XHTML / HTML)
export async function parseEpub(blob: Blob): Promise<ParsedEpub> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(blob);

  // Look for container.xml to locate rootfile .opf
  let opfPath = '';
  const containerFile = loadedZip.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('text');
    const match = containerXml.match(/full-path="([^"]+)"/i);
    if (match && match[1]) {
      opfPath = match[1];
    }
  }

  let title = 'Livre sans titre';
  let author = '';
  const basePath = opfPath ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // Extract chapters (html/xhtml files)
  const htmlFiles: Array<{ name: string; file: JSZip.JSZipObject }> = [];
  loadedZip.forEach((relativePath, file) => {
    if (!file.dir && (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml') || relativePath.endsWith('.htm'))) {
      if (!relativePath.includes('toc') && !relativePath.includes('nav')) {
        htmlFiles.push({ name: relativePath, file });
      }
    }
  });

  htmlFiles.sort((a, b) => naturalSort(a.name, b.name));

  const chapters: ParsedEpubChapter[] = [];
  for (let i = 0; i < htmlFiles.length; i++) {
    const rawHtml = await htmlFiles[i].file.async('text');
    // Extract body content or strip tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const bodyContent = doc.body ? doc.body.innerHTML : rawHtml;
    
    // Replace relative images if any exist in zip
    // For now simple chapter representation
    chapters.push({
      id: `chapter-${i + 1}`,
      title: doc.title || `Chapitre ${i + 1}`,
      content: bodyContent
    });
  }

  // Look for cover image
  let coverUrl: string | undefined;
  const coverFiles: JSZip.JSZipObject[] = [];
  loadedZip.forEach((path, file) => {
    if (path.toLowerCase().includes('cover') && isImageFile(path)) {
      coverFiles.push(file);
    }
  });

  if (coverFiles.length > 0) {
    const coverBlob = await coverFiles[0].async('blob');
    coverUrl = URL.createObjectURL(coverBlob);
  }

  return {
    title,
    author,
    chapters: chapters.length > 0 ? chapters : [{ id: '1', title: 'Contenu', content: '<p>Contenu textuel non structuré</p>' }],
    coverUrl
  };
}

// Generate cover thumbnail from PDF
export async function getPdfCoverThumbnail(blob: Blob): Promise<{ coverUrl: string; totalPages: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { coverUrl: '', totalPages };
  }

  await page.render({
    canvas,
    canvasContext: ctx,
    viewport: viewport,
  } as any).promise;

  const coverUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { coverUrl, totalPages };
}
