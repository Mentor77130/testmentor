import JSZip from 'jszip';
import { Book } from '../types';
import { saveBookBlob } from './storage';

// Helper to create a comic panel image using HTML5 Canvas
function createComicPageImage(title: string, pageNum: number, totalPages: number, colorTheme: string): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1130; // standard comic aspect ratio ~ 1:1.41
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, 800, 1130);

  // Comic border
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(20, 20, 760, 1090);

  // Header banner
  ctx.fillStyle = colorTheme;
  ctx.fillRect(40, 40, 720, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 400, 100);

  ctx.font = '500 20px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`PLANCHE ${pageNum} / ${totalPages}`, 400, 135);

  // Comic Panels Grid
  const panels = [
    { x: 50, y: 190, w: 340, h: 260, text: `Scène ${pageNum}A : L'expédition interstellaire s'amorce au-delà des nébuleuses.` },
    { x: 410, y: 190, w: 340, h: 260, text: `Scène ${pageNum}B : Les scanners détectent une source d'énergie inconnue.` },
    { x: 50, y: 470, w: 700, h: 320, text: `« Capitaine ! Les coordonnées mènent vers la bibliothèque céleste d'Andromède ! »` },
    { x: 50, y: 810, w: 340, h: 240, text: `Préparation des réacteurs pour le saut tactile.` },
    { x: 410, y: 810, w: 340, h: 240, text: `Suite à la page suivante...` },
  ];

  panels.forEach((p, i) => {
    // Panel background
    ctx.fillStyle = i === 2 ? '#1e293b' : '#111827';
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    // Decorative illustration line or shape
    ctx.fillStyle = colorTheme + '40';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, Math.min(p.w, p.h) / 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Panel caption bubble
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.x + 10, p.y + p.h - 55, p.w - 20, 45);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(p.x + 10, p.y + p.h - 55, p.w - 20, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x + p.w / 2, p.y + p.h - 28);
  });

  // Convert canvas to blob synchronously via dataURL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const binary = atob(dataUrl.split(',')[1]);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
}

// Generate sample CBZ archive with 8 illustrated comic pages
export async function generateSampleCbz(): Promise<Blob> {
  const zip = new JSZip();
  const totalPages = 8;
  const colors = ['#6366f1', '#4f46e5', '#7c3aed', '#9333ea', '#2563eb', '#0284c7', '#0d9488', '#059669'];

  for (let i = 1; i <= totalPages; i++) {
    const pageBlob = createComicPageImage('Chroniques de la Galaxie - Tome 1', i, totalPages, colors[i - 1]);
    const padNum = i.toString().padStart(3, '0');
    zip.file(`page_${padNum}.jpg`, pageBlob);
  }

  return await zip.generateAsync({ type: 'blob' });
}

// Generate sample Manga CBZ archive with 6 pages
export async function generateSampleMangaCbz(): Promise<Blob> {
  const zip = new JSZip();
  const totalPages = 6;
  const colors = ['#ec4899', '#db2777', '#f43f5e', '#e11d48', '#be123c', '#9f1239'];

  for (let i = 1; i <= totalPages; i++) {
    const pageBlob = createComicPageImage('Cyber Blade - Épisode Pilote', i, totalPages, colors[i - 1]);
    const padNum = i.toString().padStart(3, '0');
    zip.file(`manga_p${padNum}.jpg`, pageBlob);
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function createInitialDemoBooks(): Promise<Book[]> {
  try {
    const cbzBlob = await generateSampleCbz();
    const mangaBlob = await generateSampleMangaCbz();

    const sample1Id = 'demo-cbz-galaxy';
    const sample2Id = 'demo-cbz-cyberblade';

    // Store sample blobs in IndexedDB so they are immediately readable offline
    await saveBookBlob(sample1Id, cbzBlob);
    await saveBookBlob(sample2Id, mangaBlob);

    const now = new Date().toISOString();

    const demoBooks: Book[] = [
      {
        id: sample1Id,
        title: 'Chroniques de la Galaxie - Tome 1.cbz',
        format: 'cbz',
        fileSize: cbzBlob.size,
        lastModified: now,
        driveFileId: sample1Id,
        libraries: ['lib-comics'],
        isOfflineAvailable: true,
        isFavorite: true,
        currentPage: 1,
        totalPages: 8,
        progress: 12,
        author: 'Studio Orbital'
      },
      {
        id: sample2Id,
        title: 'Cyber Blade - Tome 01 (Édition Deluxe).cbz',
        format: 'cbz',
        fileSize: mangaBlob.size,
        lastModified: now,
        driveFileId: sample2Id,
        libraries: ['lib-mangas'],
        isOfflineAvailable: true,
        isFavorite: true,
        currentPage: 1,
        totalPages: 6,
        progress: 0,
        author: 'Kenji Takahashi'
      }
    ];

    return demoBooks;
  } catch (err) {
    console.error('Failed to generate demo books:', err);
    return [];
  }
}
