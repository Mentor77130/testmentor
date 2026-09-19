import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  BookOpen,
  Plus,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  Heart,
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  CloudOff,
  Cloud,
  FileUp,
  LayoutGrid,
  List
} from 'lucide-react';
import { Book, CustomLibrary, EbookFormat, ReaderSettings } from './types';
import {
  getStoredBooks,
  saveStoredBooks,
  getLibraries,
  saveLibraries,
  saveBookBlob,
  deleteBookBlob,
  getBookBlob,
  getReaderSettings,
  saveReaderSettings,
  DEFAULT_READER_SETTINGS,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  searchDriveBooks,
  downloadDriveFile,
  detectFormat,
  setAccessToken
} from './services/googleDrive';
import { createInitialDemoBooks } from './services/sampleBooks';
import { parseCbz, getPdfCoverThumbnail } from './services/fileParser';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BookCard } from './components/BookCard';
import { ReaderView } from './components/ReaderView';
import { DriveBrowserModal } from './components/DriveBrowserModal';
import { LibraryModal } from './components/LibraryModal';
import { AssignLibraryModal } from './components/AssignLibraryModal';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  // App data state
  const [books, setBooks] = useState<Book[]>([]);
  const [libraries, setLibraries] = useState<CustomLibrary[]>([]);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);

  // Navigation & Filtering state
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Reader state
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);

  // Modals state
  const [isDriveBrowserOpen, setIsDriveBrowserOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [assigningBook, setAssigningBook] = useState<Book | null>(null);

  // Sync and downloading tracking
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [downloadingOfflineIds, setDownloadingOfflineIds] = useState<Set<string>>(new Set());

  // Initialize Auth & load initial stored data
  useEffect(() => {
    // Auth state listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setDriveToken(token);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setDriveToken(null);
        setAccessToken(null);
      }
    );

    // Load stored settings, libraries and books
    async function initData() {
      const loadedSettings = getReaderSettings();
      setReaderSettings(loadedSettings);

      const loadedLibraries = await getLibraries();
      setLibraries(loadedLibraries);

      let loadedBooks = await getStoredBooks();
      if (loadedBooks.length === 0) {
        // Seed initial demo books so preview is immediately functional
        loadedBooks = await createInitialDemoBooks();
        await saveStoredBooks(loadedBooks);
      }
      setBooks(loadedBooks);
    }

    initData();

    return () => unsubscribe();
  }, []);

  // Sync books state with localStorage
  const updateBooks = useCallback((updater: (prev: Book[]) => Book[]) => {
    setBooks((prev) => {
      const next = updater(prev);
      saveStoredBooks(next);
      return next;
    });
  }, []);

  // Google Sign-In
  const handleConnectDrive = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setDriveToken(result.accessToken);
        setAccessToken(result.accessToken);
        // Automatically open Drive browser on first connection
        setIsDriveBrowserOpen(true);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      alert(`Connexion Google Drive échouée: ${err.message || 'Vérifiez vos autorisations'}`);
    }
  };

  // Google Sign-Out
  const handleDisconnectDrive = async () => {
    await logout();
    setUser(null);
    setDriveToken(null);
    setAccessToken(null);
  };

  // Synchroniser automatiquement avec Google Drive
  const handleSyncDrive = async () => {
    if (!driveToken) {
      handleConnectDrive();
      return;
    }

    setIsSyncing(true);
    try {
      const driveFiles = await searchDriveBooks(driveToken);
      const existingIds = new Set(books.map((b) => b.id));

      const newBooks: Book[] = [];

      for (const file of driveFiles) {
        if (!existingIds.has(file.id)) {
          const format = detectFormat(file.name, file.mimeType);
          newBooks.push({
            id: file.id,
            title: file.name,
            format,
            fileSize: file.size || 0,
            lastModified: file.modifiedTime || new Date().toISOString(),
            driveFileId: file.id,
            coverUrl: file.thumbnailLink,
            libraries: [],
            isOfflineAvailable: false,
            isFavorite: false,
            currentPage: 1,
            totalPages: 1,
            progress: 0,
          });
        }
      }

      if (newBooks.length > 0) {
        updateBooks((prev) => [...newBooks, ...prev]);
      }

      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Sync error:', err);
      alert(`Erreur de synchronisation Drive: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Periodic auto-sync every 5 minutes if connected
  useEffect(() => {
    if (!driveToken) return;

    const interval = setInterval(() => {
      handleSyncDrive();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [driveToken]);

  // Import files from Google Drive Modal
  const handleImportFiles = async (
    files: any[],
    targetLibraryId?: string,
    downloadOfflineImmediately: boolean = true
  ) => {
    const newBooksToAdd: Book[] = [];

    for (const file of files) {
      // Check if already in list
      const existing = books.find((b) => b.id === file.id);
      if (existing) {
        if (targetLibraryId && !existing.libraries.includes(targetLibraryId)) {
          existing.libraries.push(targetLibraryId);
        }
        continue;
      }

      const format = detectFormat(file.name, file.mimeType);
      const newBook: Book = {
        id: file.id,
        title: file.name,
        format,
        fileSize: file.size || 0,
        lastModified: file.modifiedTime || new Date().toISOString(),
        driveFileId: file.id,
        coverUrl: file.thumbnailLink,
        libraries: targetLibraryId ? [targetLibraryId] : [],
        isOfflineAvailable: false,
        isFavorite: false,
        currentPage: 1,
        totalPages: 1,
        progress: 0,
      };

      // Download immediately if requested
      if (downloadOfflineImmediately && driveToken) {
        try {
          const blob = await downloadDriveFile(file.id, driveToken);
          await saveBookBlob(file.id, blob);
          newBook.isOfflineAvailable = true;
          newBook.offlineDownloadedAt = Date.now();

          // Try to generate thumbnail cover if CBZ or PDF
          if (format === 'cbz') {
            try {
              const parsed = await parseCbz(blob);
              newBook.coverUrl = parsed.coverUrl;
              newBook.totalPages = parsed.totalPages;
            } catch (e) {
              console.warn('Could not extract CBZ cover:', e);
            }
          } else if (format === 'pdf') {
            try {
              const { coverUrl, totalPages } = await getPdfCoverThumbnail(blob);
              newBook.coverUrl = coverUrl;
              newBook.totalPages = totalPages;
            } catch (e) {
              console.warn('Could not extract PDF cover:', e);
            }
          }
        } catch (downloadErr) {
          console.error('Failed immediate download for offline:', downloadErr);
        }
      }

      newBooksToAdd.push(newBook);
    }

    if (newBooksToAdd.length > 0) {
      updateBooks((prev) => [...newBooksToAdd, ...prev]);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (book: Book) => {
    updateBooks((prev) =>
      prev.map((b) => (b.id === book.id ? { ...b, isFavorite: !b.isFavorite } : b))
    );
  };

  // Toggle Offline Availability (Download or Remove local blob)
  const handleToggleOffline = async (book: Book) => {
    if (book.isOfflineAvailable) {
      // Remove from IndexedDB
      await deleteBookBlob(book.id);
      updateBooks((prev) =>
        prev.map((b) =>
          b.id === book.id
            ? { ...b, isOfflineAvailable: false, offlineDownloadedAt: undefined }
            : b
        )
      );
    } else {
      // Download to IndexedDB
      if (!driveToken) {
        alert('Veuillez vous connecter à Google Drive pour télécharger ce livre hors-ligne.');
        return;
      }

      setDownloadingOfflineIds((prev) => new Set(prev).add(book.id));
      try {
        const blob = await downloadDriveFile(book.driveFileId, driveToken);
        await saveBookBlob(book.id, blob);

        // Update cover / page count if not set
        let coverUrl = book.coverUrl;
        let totalPages = book.totalPages;

        if (book.format === 'cbz' && (!coverUrl || totalPages <= 1)) {
          try {
            const parsed = await parseCbz(blob);
            coverUrl = parsed.coverUrl;
            totalPages = parsed.totalPages;
          } catch {}
        } else if (book.format === 'pdf' && (!coverUrl || totalPages <= 1)) {
          try {
            const parsed = await getPdfCoverThumbnail(blob);
            coverUrl = parsed.coverUrl;
            totalPages = parsed.totalPages;
          } catch {}
        }

        updateBooks((prev) =>
          prev.map((b) =>
            b.id === book.id
              ? {
                  ...b,
                  isOfflineAvailable: true,
                  offlineDownloadedAt: Date.now(),
                  coverUrl: coverUrl || b.coverUrl,
                  totalPages: totalPages > 1 ? totalPages : b.totalPages,
                }
              : b
          )
        );
      } catch (err: any) {
        alert(`Échec du téléchargement hors-ligne: ${err.message}`);
      } finally {
        setDownloadingOfflineIds((prev) => {
          const next = new Set(prev);
          next.delete(book.id);
          return next;
        });
      }
    }
  };

  // Save reading progress from reader
  const handleSaveProgress = (bookId: string, page: number, total: number) => {
    const progress = total > 0 ? Math.round((page / total) * 100) : 0;
    updateBooks((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              currentPage: page,
              totalPages: total,
              progress,
              lastReadAt: Date.now(),
            }
          : b
      )
    );
  };

  // Custom Library management
  const handleCreateLibrary = (libData: Omit<CustomLibrary, 'id' | 'createdAt'>) => {
    const newLib: CustomLibrary = {
      ...libData,
      id: `lib-${Date.now()}`,
      createdAt: Date.now(),
    };
    const nextLibraries = [...libraries, newLib];
    setLibraries(nextLibraries);
    saveLibraries(nextLibraries);
  };

  const handleDeleteLibrary = (libId: string) => {
    const nextLibraries = libraries.filter((l) => l.id !== libId);
    setLibraries(nextLibraries);
    saveLibraries(nextLibraries);

    // Remove this library ID from all books
    updateBooks((prev) =>
      prev.map((b) => ({
        ...b,
        libraries: b.libraries.filter((id) => id !== libId),
      }))
    );

    if (activeFilter === libId) {
      setActiveFilter('all');
    }
  };

  const handleSaveBookLibraries = (bookId: string, libraryIds: string[]) => {
    updateBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, libraries: libraryIds } : b))
    );
  };

  const handleRemoveBook = async (book: Book) => {
    if (confirm(`Retirer "${book.title}" de votre bibliothèque ?`)) {
      if (book.isOfflineAvailable) {
        await deleteBookBlob(book.id);
      }
      updateBooks((prev) => prev.filter((b) => b.id !== book.id));
    }
  };

  const handleUpdateReaderSettings = (newSettings: ReaderSettings) => {
    setReaderSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  // Counts calculations
  const totalBooksCount = books.length;
  const favoritesCount = books.filter((b) => b.isFavorite || b.isOfflineAvailable).length;
  const readingCount = books.filter((b) => b.progress > 0 && b.progress < 100).length;

  const formatCounts: Record<EbookFormat, number> = useMemo(() => {
    const counts: Record<EbookFormat, number> = {
      pdf: 0,
      cbz: 0,
      cbr: 0,
      epub: 0,
      txt: 0,
      unknown: 0,
    };
    books.forEach((b) => {
      counts[b.format] = (counts[b.format] || 0) + 1;
    });
    return counts;
  }, [books]);

  const libraryCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    libraries.forEach((l) => {
      counts[l.id] = books.filter((b) => b.libraries.includes(l.id)).length;
    });
    return counts;
  }, [books, libraries]);

  // Filtered books list based on activeFilter and searchQuery
  const filteredBooks = useMemo(() => {
    let list = books;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q))
      );
    }

    // Category / Library filter
    if (activeFilter === 'all') {
      return list;
    } else if (activeFilter === 'favorites') {
      return list.filter((b) => b.isFavorite || b.isOfflineAvailable);
    } else if (activeFilter === 'reading') {
      return list.filter((b) => b.progress > 0 && b.progress < 100);
    } else if (activeFilter.startsWith('format-')) {
      const fmt = activeFilter.replace('format-', '') as EbookFormat;
      return list.filter((b) => b.format === fmt);
    } else {
      // Specific Custom Library ID
      return list.filter((b) => b.libraries.includes(activeFilter));
    }
  }, [books, activeFilter, searchQuery]);

  // Active filter label title
  const activeFilterInfo = useMemo(() => {
    if (activeFilter === 'all') return { title: 'Tous les livres', desc: 'Votre collection complète' };
    if (activeFilter === 'favorites') return { title: 'Favoris & Hors-ligne', desc: 'Ouvrages disponibles sans connexion' };
    if (activeFilter === 'reading') return { title: 'En cours de lecture', desc: 'Reprenez votre lecture là où vous étiez' };
    if (activeFilter === 'format-cbz') return { title: 'Comics & Bandes Dessinées (CBZ)', desc: 'Archives d’images haute résolution' };
    if (activeFilter === 'format-cbr') return { title: 'Comics & Mangas (CBR)', desc: 'Archives d’images compressées' };
    if (activeFilter === 'format-pdf') return { title: 'Documents & Guides (PDF)', desc: 'Fichiers paginés' };
    if (activeFilter === 'format-epub') return { title: 'Ebooks (EPUB)', desc: 'Livres numériques avec mise en page ajustable' };

    const lib = libraries.find((l) => l.id === activeFilter);
    if (lib) return { title: lib.name, desc: lib.description || 'Bibliothèque personnalisée' };

    return { title: 'Collection', desc: '' };
  }, [activeFilter, libraries]);

  const offlineBooksCount = books.filter((b) => b.isOfflineAvailable).length;

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col font-sans selection:bg-stone-900 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        hasDriveToken={!!driveToken}
        onConnectDrive={handleConnectDrive}
        onDisconnectDrive={handleDisconnectDrive}
        onOpenDriveBrowser={() => setIsDriveBrowserOpen(true)}
        onSyncDrive={handleSyncDrive}
        isSyncing={isSyncing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        totalBooks={totalBooksCount}
        offlineCount={offlineBooksCount}
      />

      {/* Main Layout (Sidebar + Grid Content) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          libraries={libraries}
          onCreateLibrary={() => setIsLibraryModalOpen(true)}
          onDeleteLibrary={handleDeleteLibrary}
          totalBooksCount={totalBooksCount}
          favoritesCount={favoritesCount}
          readingCount={readingCount}
          formatCounts={formatCounts}
          libraryCounts={libraryCounts}
          lastSyncTime={lastSyncTime}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Hero Welcome / Drive Connect Banner if not connected */}
          {!driveToken && (
            <div className="mb-6 p-4 sm:p-6 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-sm sm:text-base font-bold text-stone-900">
                    Connectez votre Google Drive
                  </h2>
                </div>
                <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                  Accédez à distance à tous vos fichiers <strong>PDF, CBZ, CBR et EPUB</strong> stockés dans votre Google Drive, organisez vos collections et téléchargez vos favoris pour les lire hors-ligne sur mobile ou ordinateur.
                </p>
              </div>
              <button
                onClick={handleConnectDrive}
                className="shrink-0 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Associer Google Drive</span>
              </button>
            </div>
          )}

          {/* Section Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                {activeFilterInfo.title}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {activeFilterInfo.desc} • {filteredBooks.length} ouvrage(s)
              </p>
            </div>

            {/* Quick Actions (Explorer Drive + Nouvelle bibliothèque) */}
            <div className="flex items-center gap-2">
              {driveToken && (
                <button
                  onClick={() => setIsDriveBrowserOpen(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-500" />
                  <span>Ajouter depuis Drive</span>
                </button>
              )}

              <button
                onClick={() => setIsLibraryModalOpen(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-stone-500" />
                <span>Nouvelle bibliothèque</span>
              </button>
            </div>
          </div>

          {/* Books Grid */}
          {filteredBooks.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-stone-200/80 p-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">Aucun livre trouvé</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery
                  ? `Aucun résultat pour la recherche "${searchQuery}".`
                  : 'Importez des livres ou bandes dessinées depuis votre Google Drive pour commencer votre lecture.'}
              </p>
              {driveToken ? (
                <button
                  onClick={() => setIsDriveBrowserOpen(true)}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Parcourir Google Drive
                </button>
              ) : (
                <button
                  onClick={handleConnectDrive}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Se connecter à Google Drive
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  libraries={libraries}
                  onRead={(b) => setActiveReadingBook(b)}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleOffline={handleToggleOffline}
                  onAssignLibrary={(b) => setAssigningBook(b)}
                  onRemoveBook={handleRemoveBook}
                  isDownloadingOffline={downloadingOfflineIds.has(book.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Fullscreen Reading View Modal */}
      {activeReadingBook && (
        <ReaderView
          book={activeReadingBook}
          driveToken={driveToken}
          settings={readerSettings}
          onUpdateSettings={handleUpdateReaderSettings}
          onClose={() => setActiveReadingBook(null)}
          onSaveProgress={handleSaveProgress}
          onDownloadOffline={handleToggleOffline}
        />
      )}

      {/* Google Drive Browser Modal */}
      <DriveBrowserModal
        isOpen={isDriveBrowserOpen}
        onClose={() => setIsDriveBrowserOpen(false)}
        token={driveToken}
        libraries={libraries}
        existingBookIds={books.map((b) => b.id)}
        onImportFiles={handleImportFiles}
      />

      {/* Create Library Modal */}
      <LibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onCreateLibrary={handleCreateLibrary}
      />

      {/* Assign Book to Library Modal */}
      <AssignLibraryModal
        isOpen={!!assigningBook}
        onClose={() => setAssigningBook(null)}
        book={assigningBook}
        libraries={libraries}
        onSaveBookLibraries={handleSaveBookLibraries}
        onCreateNewLibrary={() => setIsLibraryModalOpen(true)}
      />
    </div>
  );
}
