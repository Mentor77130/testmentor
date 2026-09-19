import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Sliders,
  Settings,
  Grid,
  Download,
  CheckCircle2,
  Columns,
  Square,
  Scroll,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, ComicReadingMode, PageFit, ReaderSettings, ReaderTheme } from '../types';
import { getBookBlob, saveBookBlob } from '../services/storage';
import { downloadDriveFile } from '../services/googleDrive';
import { parseCbz, parseCbr, parseEpub, ComicPage, ParsedEpubChapter } from '../services/fileParser';

interface ReaderViewProps {
  book: Book;
  driveToken: string | null;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: ReaderSettings) => void;
  onClose: () => void;
  onSaveProgress: (bookId: string, page: number, total: number) => void;
  onDownloadOffline: (book: Book) => Promise<void>;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  driveToken,
  settings,
  onUpdateSettings,
  onClose,
  onSaveProgress,
  onDownloadOffline,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('Préparation du document...');
  const [error, setError] = useState<string | null>(null);

  // Content state
  const [comicPages, setComicPages] = useState<ComicPage[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [epubChapters, setEpubChapters] = useState<ParsedEpubChapter[]>([]);

  // Navigation state
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(book.totalPages || 1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showThumbnailDrawer, setShowThumbnailDrawer] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Touch tracking for swipe navigation
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  // Canvas ref for PDF rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load Book Data (from IndexedDB first, or download from Google Drive)
  useEffect(() => {
    let isCancelled = false;

    async function loadBookContent() {
      setLoading(true);
      setError(null);
      setLoadingProgress(10);
      setLoadingStatus('Recherche dans le cache local...');

      try {
        let blob = await getBookBlob(book.id);

        if (!blob) {
          if (!driveToken) {
            throw new Error('Ce livre nécessite une connexion Google Drive pour être téléchargé');
          }
          setLoadingStatus('Téléchargement depuis Google Drive...');
          blob = await downloadDriveFile(book.driveFileId, driveToken, (percent) => {
            if (!isCancelled) setLoadingProgress(percent);
          });
        }

        if (isCancelled) return;
        setLoadingProgress(80);
        setLoadingStatus('Décompression et analyse du contenu...');

        // Parse depending on format
        if (book.format === 'cbz') {
          const parsed = await parseCbz(blob);
          if (isCancelled) return;
          setComicPages(parsed.pages);
          setTotalPages(parsed.totalPages);
          setCurrentPage(Math.min(book.currentPage || 1, parsed.totalPages));
        } else if (book.format === 'cbr') {
          const parsed = await parseCbr(blob);
          if (isCancelled) return;
          setComicPages(parsed.pages);
          setTotalPages(parsed.totalPages);
          setCurrentPage(Math.min(book.currentPage || 1, parsed.totalPages));
        } else if (book.format === 'pdf') {
          const buffer = await blob.arrayBuffer();
          const task = pdfjsLib.getDocument({ data: buffer });
          const doc = await task.promise;
          if (isCancelled) return;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(Math.min(book.currentPage || 1, doc.numPages));
        } else if (book.format === 'epub') {
          const parsed = await parseEpub(blob);
          if (isCancelled) return;
          setEpubChapters(parsed.chapters);
          setTotalPages(parsed.chapters.length);
          setCurrentPage(Math.min(book.currentPage || 1, parsed.chapters.length));
        } else if (book.format === 'txt') {
          const text = await blob.text();
          if (isCancelled) return;
          setEpubChapters([{ id: 'txt-1', title: book.title, content: `<pre class="whitespace-pre-wrap font-mono">${text}</pre>` }]);
          setTotalPages(1);
          setCurrentPage(1);
        } else {
          // Fallback as PDF
          const buffer = await blob.arrayBuffer();
          const task = pdfjsLib.getDocument({ data: buffer });
          const doc = await task.promise;
          if (isCancelled) return;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading book:', err);
        if (!isCancelled) {
          setError(err.message || 'Impossible de charger ce document.');
          setLoading(false);
        }
      }
    }

    loadBookContent();

    return () => {
      isCancelled = true;
    };
  }, [book.id, book.driveFileId, driveToken]);

  // Render PDF Page when page or zoom changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || book.format !== 'pdf') return;

    let renderTask: any = null;

    async function renderPdfPage() {
      try {
        const page = await pdfDoc!.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate responsive scale
        let scale = (containerWidth * 0.95) / unscaledViewport.width;
        if (scale > 2.0) scale = 2.0;
        scale *= zoomLevel;

        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: viewport,
        } as any);

        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF page render error:', err);
        }
      }
    }

    renderPdfPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, book.format]);

  // Save progress
  const changePage = useCallback(
    (newPage: number) => {
      const target = Math.max(1, Math.min(newPage, totalPages));
      setCurrentPage(target);
      onSaveProgress(book.id, target, totalPages);
    },
    [totalPages, book.id, onSaveProgress]
  );

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      changePage(currentPage - 1);
    }
  }, [currentPage, changePage]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      changePage(currentPage + 1);
    }
  }, [currentPage, totalPages, changePage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage, onClose]);

  // Touch handlers for mobile tactile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const duration = Date.now() - touchStartTime.current;

    // Detect horizontal swipe (at least 45px, mostly horizontal, under 500ms)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && duration < 500) {
      if (deltaX < 0) {
        // Swipe left -> Next Page
        nextPage();
      } else {
        // Swipe right -> Prev Page
        prevPage();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Center / Edge tap handling
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on control buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.control-bar')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left 25% zone: Previous Page
    if (clickX < width * 0.25) {
      prevPage();
    }
    // Right 25% zone: Next Page
    else if (clickX > width * 0.75) {
      nextPage();
    }
    // Middle 50% zone: Toggle controls visibility
    else {
      setShowControls((prev) => !prev);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Theme styling definitions
  const themeStyles: Record<ReaderTheme, { bg: string; text: string; headerBg: string; border: string }> = {
    light: {
      bg: 'bg-white',
      text: 'text-stone-900',
      headerBg: 'bg-white/95 text-stone-900 border-stone-200',
      border: 'border-stone-200',
    },
    sepia: {
      bg: 'bg-[#fcf8ed]',
      text: 'text-[#433422]',
      headerBg: 'bg-[#f7f0df]/95 text-[#433422] border-[#e7dcbf]',
      border: 'border-[#e7dcbf]',
    },
    dark: {
      bg: 'bg-slate-900',
      text: 'text-slate-100',
      headerBg: 'bg-slate-900/95 text-slate-100 border-slate-800',
      border: 'border-slate-800',
    },
    amoled: {
      bg: 'bg-black',
      text: 'text-neutral-100',
      headerBg: 'bg-black/95 text-neutral-100 border-neutral-900',
      border: 'border-neutral-900',
    },
  };

  const currentTheme = themeStyles[settings.theme] || themeStyles.light;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col ${currentTheme.bg} ${currentTheme.text} select-none overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Controls Bar */}
      <header
        className={`control-bar absolute top-0 left-0 right-0 z-30 transition-transform duration-200 backdrop-blur border-b ${
          currentTheme.headerBg
        } ${showControls ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Back button + Book Title */}
          <div className="flex items-center gap-2 truncate">
            <button
              id="reader-back-btn"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Retour à la bibliothèque"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {book.title}
              </h2>
              <p className="text-[11px] opacity-70 truncate">
                {book.format.toUpperCase()} • Page {currentPage} sur {totalPages}
              </p>
            </div>
          </div>

          {/* Controls Actions */}
          <div className="flex items-center gap-1">
            {/* Offline download status */}
            <button
              id="reader-offline-btn"
              onClick={() => onDownloadOffline(book)}
              title={book.isOfflineAvailable ? 'Téléchargé hors-ligne' : 'Sauvegarder hors-ligne'}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {book.isOfflineAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-4 h-4 opacity-70" />
              )}
            </button>

            {/* Thumbnail Drawer Toggle */}
            <button
              id="reader-thumbnails-btn"
              onClick={() => setShowThumbnailDrawer(!showThumbnailDrawer)}
              title="Aperçu des pages"
              className={`p-2 rounded-lg transition-colors ${
                showThumbnailDrawer ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Settings Toggle */}
            <button
              id="reader-settings-btn"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              title="Paramètres d'affichage"
              className={`p-2 rounded-lg transition-colors ${
                showSettingsDrawer ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title="Plein écran"
              className="hidden sm:block p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Reading Surface */}
      <main
        onClick={handleSurfaceClick}
        className="flex-1 relative flex items-center justify-center overflow-auto p-0 sm:p-4"
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
            <Loader2 className="w-10 h-10 animate-spin text-stone-500 mb-4" />
            <p className="text-sm font-semibold mb-2">{loadingStatus}</p>
            <div className="w-48 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 dark:bg-white transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs opacity-60 mt-2">{loadingProgress}%</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 text-center max-w-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl">
            <p className="text-rose-600 dark:text-rose-400 font-semibold mb-2">Erreur de lecture</p>
            <p className="text-xs opacity-80 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-xl text-xs font-semibold"
            >
              Retourner à la bibliothèque
            </button>
          </div>
        )}

        {/* Content Views */}
        {!loading && !error && (
          <div className="w-full h-full flex items-center justify-center relative">
            {/* CBZ / CBR View */}
            {(book.format === 'cbz' || book.format === 'cbr') && comicPages.length > 0 && (
              <div className="w-full h-full flex items-center justify-center">
                {settings.readingMode === 'webtoon' ? (
                  // Continuous vertical scroll for webtoon
                  <div className="w-full max-w-3xl h-full overflow-y-auto space-y-2 py-8 px-2">
                    {comicPages.map((page, idx) => (
                      <img
                        key={idx}
                        src={page.url}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-auto rounded-xs shadow-md mx-auto"
                        loading={Math.abs(idx - currentPage) < 3 ? 'eager' : 'lazy'}
                      />
                    ))}
                  </div>
                ) : (
                  // Paged single or double
                  <div className="flex items-center justify-center max-h-full max-w-full">
                    {comicPages[currentPage - 1] && (
                      <img
                        src={comicPages[currentPage - 1].url}
                        alt={`Page ${currentPage}`}
                        className={`max-h-[92vh] max-w-[95vw] object-contain shadow-lg transition-transform duration-150 ${
                          settings.pageFit === 'width' ? 'w-full' : ''
                        }`}
                        style={{
                          transform: `scale(${zoomLevel})`,
                          filter: settings.invertInDarkMode && settings.theme === 'amoled' ? 'invert(0.9) hue-rotate(180deg)' : 'none',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PDF View */}
            {book.format === 'pdf' && (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <canvas
                  ref={canvasRef}
                  className="max-h-[92vh] max-w-[95vw] object-contain shadow-xl rounded-xs transition-transform duration-150"
                  style={{
                    filter: settings.invertInDarkMode && settings.theme === 'amoled' ? 'invert(0.9) hue-rotate(180deg)' : 'none',
                  }}
                />
              </div>
            )}

            {/* EPUB / TXT View */}
            {(book.format === 'epub' || book.format === 'txt') && epubChapters.length > 0 && (
              <div className="w-full max-w-2xl h-full overflow-y-auto px-6 py-16 mx-auto leading-relaxed">
                <h3 className="text-xl font-bold mb-6 border-b pb-3 opacity-90">
                  {epubChapters[currentPage - 1]?.title || `Chapitre ${currentPage}`}
                </h3>
                <div
                  className={`prose max-w-none ${settings.theme === 'dark' || settings.theme === 'amoled' ? 'prose-invert' : ''}`}
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    fontFamily: settings.fontFamily === 'serif' ? 'serif' : settings.fontFamily === 'mono' ? 'monospace' : 'sans-serif',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: epubChapters[currentPage - 1]?.content || '',
                  }}
                />
              </div>
            )}

            {/* Left / Right Screen Touch Indicators for navigation */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                prevPage();
              }}
              className="absolute left-0 top-0 bottom-0 w-16 opacity-0 hover:opacity-100 flex items-center justify-start pl-3 text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer transition-opacity z-10"
              title="Page précédente"
            >
              <ChevronLeft className="w-8 h-8" />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                nextPage();
              }}
              className="absolute right-0 top-0 bottom-0 w-16 opacity-0 hover:opacity-100 flex items-center justify-end pr-3 text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer transition-opacity z-10"
              title="Page suivante"
            >
              <ChevronRight className="w-8 h-8" />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Control Bar (Pagination Slider & Controls) */}
      <footer
        className={`control-bar absolute bottom-0 left-0 right-0 z-30 transition-transform duration-200 backdrop-blur border-t ${
          currentTheme.headerBg
        } ${showControls ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex flex-col gap-2">
          {/* Slider and Page Quick Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-opacity"
              title="Précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <input
              id="page-slider"
              type="range"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => changePage(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-stone-900 dark:accent-white"
            />

            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-opacity"
              title="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="text-xs font-semibold min-w-[70px] text-right font-mono">
              {currentPage} / {totalPages}
            </div>
          </div>
        </div>
      </footer>

      {/* Thumbnail Drawer (Bottom slide-up) */}
      {showThumbnailDrawer && (
        <div className="absolute bottom-14 left-0 right-0 h-40 bg-stone-900/90 backdrop-blur text-white border-t border-stone-800 z-40 p-3 overflow-x-auto flex items-center gap-3">
          {comicPages.length > 0 ? (
            comicPages.map((page) => (
              <button
                key={page.index}
                onClick={() => {
                  changePage(page.index);
                  setShowThumbnailDrawer(false);
                }}
                className={`relative shrink-0 h-32 aspect-3/4 rounded-lg overflow-hidden border-2 transition-all ${
                  currentPage === page.index ? 'border-amber-400 scale-105' : 'border-stone-700 hover:border-stone-400'
                }`}
              >
                <img src={page.url} alt={page.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono">
                  {page.index}
                </span>
              </button>
            ))
          ) : (
            <div className="flex gap-2 mx-auto">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    changePage(num);
                    setShowThumbnailDrawer(false);
                  }}
                  className={`w-12 h-16 rounded-md flex items-center justify-center text-xs font-bold ${
                    currentPage === num ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 hover:bg-stone-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal Drawer (Theme, Fit, Font size) */}
      {showSettingsDrawer && (
        <div className="absolute top-14 right-4 z-40 w-80 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
            <span className="text-xs font-bold uppercase tracking-wider">Paramètres de lecture</span>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
              Thème de liseuse
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'light', label: 'Clair', bg: 'bg-white border-stone-300 text-stone-900' },
                { id: 'sepia', label: 'Sépia', bg: 'bg-[#f7f0df] border-[#e7dcbf] text-[#433422]' },
                { id: 'dark', label: 'Sombre', bg: 'bg-slate-800 border-slate-700 text-white' },
                { id: 'amoled', label: 'OLED', bg: 'bg-black border-stone-800 text-white' },
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ ...settings, theme: th.id as ReaderTheme })}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                    th.bg
                  } ${settings.theme === th.id ? 'ring-2 ring-stone-900 dark:ring-white scale-105' : 'opacity-80'}`}
                >
                  <span>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Mode (Single / Double / Webtoon) */}
          {(book.format === 'cbz' || book.format === 'cbr') && (
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                Mode de défilement BD
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ ...settings, readingMode: 'single' })}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border ${
                    settings.readingMode === 'single'
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Page par page</span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ ...settings, readingMode: 'webtoon' })}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border ${
                    settings.readingMode === 'webtoon'
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <Scroll className="w-3.5 h-3.5" />
                  <span>Webtoon (vertical)</span>
                </button>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Zoom : {Math.round(zoomLevel * 100)}%
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="flex-1 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                100% (Ajuster)
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
                className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Size for EPUB / TXT */}
          {(book.format === 'epub' || book.format === 'txt') && (
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Taille du texte : {settings.fontSize}px
              </label>
              <input
                type="range"
                min={12}
                max={32}
                value={settings.fontSize}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })
                }
                className="w-full accent-stone-900 dark:accent-white"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
