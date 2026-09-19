import React from 'react';
import {
  BookOpen,
  Heart,
  Download,
  CheckCircle2,
  MoreVertical,
  Trash2,
  FolderPlus,
  Loader2,
  FileText,
  Sparkles
} from 'lucide-react';
import { Book, CustomLibrary } from '../types';

interface BookCardProps {
  book: Book;
  libraries: CustomLibrary[];
  onRead: (book: Book) => void;
  onToggleFavorite: (book: Book) => void;
  onToggleOffline: (book: Book) => void;
  onAssignLibrary: (book: Book) => void;
  onRemoveBook: (book: Book) => void;
  isDownloadingOffline?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  libraries,
  onRead,
  onToggleFavorite,
  onToggleOffline,
  onAssignLibrary,
  onRemoveBook,
  isDownloadingOffline = false,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const formatColors: Record<string, { bg: string; text: string; border: string }> = {
    cbz: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    cbr: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    pdf: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    epub: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    txt: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
    unknown: { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' },
  };

  const fmtColor = formatColors[book.format] || formatColors.unknown;

  const assignedLibraries = libraries.filter((lib) => book.libraries.includes(lib.id));

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div
      className="group relative flex flex-col bg-white rounded-xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Cover Container */}
      <div
        onClick={() => onRead(book)}
        className="relative aspect-3/4 bg-stone-100 cursor-pointer overflow-hidden flex items-center justify-center select-none"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col justify-between bg-radial from-stone-100 to-stone-200 text-stone-700">
            <div className="flex justify-between items-start">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${fmtColor.bg} ${fmtColor.text} ${fmtColor.border}`}>
                {book.format.toUpperCase()}
              </span>
            </div>
            <div className="my-auto text-center px-2">
              <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-stone-300/60 flex items-center justify-center text-stone-600">
                {book.format === 'cbz' || book.format === 'cbr' ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-stone-800 line-clamp-3 leading-snug">
                {book.title}
              </p>
              {book.author && (
                <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">{book.author}</p>
              )}
            </div>
            <div className="text-[10px] text-stone-400 text-right">
              {formatFileSize(book.fileSize)}
            </div>
          </div>
        )}

        {/* Format Badge Top-Left */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-xs border shadow-2xs ${fmtColor.bg} ${fmtColor.text} ${fmtColor.border}`}
          >
            {book.format.toUpperCase()}
          </span>

          {book.isOfflineAvailable && (
            <span
              title="Disponible hors-ligne"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white shadow-2xs"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Hors-ligne</span>
            </span>
          )}
        </div>

        {/* Favorite Heart Button Top-Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(book);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-transform active:scale-90 z-10 shadow-2xs ${
            book.isFavorite
              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              : 'bg-stone-900/40 text-white/90 hover:bg-stone-900/70'
          }`}
          title={book.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Hover / Touch Overlay Button */}
        <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(book);
            }}
            className="px-4 py-2 bg-white text-stone-900 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
          >
            <BookOpen className="w-4 h-4" />
            <span>Lire</span>
          </button>
        </div>

        {/* Reading progress bar at bottom of cover */}
        {book.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-200/80">
            <div
              className="h-full bg-stone-900 transition-all duration-300"
              style={{ width: `${Math.min(100, book.progress)}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Info Section */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <h3
            onClick={() => onRead(book)}
            title={book.title}
            className="text-xs font-semibold text-stone-900 line-clamp-2 hover:text-stone-600 cursor-pointer transition-colors leading-snug"
          >
            {book.title.replace(/\.(pdf|cbz|cbr|epub|txt)$/i, '')}
          </h3>

          {book.author && (
            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{book.author}</p>
          )}

          {/* Library tags */}
          {assignedLibraries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {assignedLibraries.slice(0, 2).map((lib) => (
                <span
                  key={lib.id}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-600 truncate max-w-[120px]"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: lib.color || '#6366f1' }}
                  />
                  <span className="truncate">{lib.name}</span>
                </span>
              ))}
              {assignedLibraries.length > 2 && (
                <span className="text-[10px] text-stone-400 self-center">
                  +{assignedLibraries.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta & Actions */}
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span>
            {book.totalPages > 0
              ? `p. ${book.currentPage} / ${book.totalPages}`
              : formatFileSize(book.fileSize)}
          </span>

          <div className="flex items-center gap-1">
            {/* Offline toggle download button */}
            <button
              onClick={() => onToggleOffline(book)}
              disabled={isDownloadingOffline}
              title={
                book.isOfflineAvailable
                  ? 'Supprimer le fichier local'
                  : 'Télécharger pour lecture hors-ligne'
              }
              className={`p-1 rounded-md transition-colors ${
                book.isOfflineAvailable
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
              }`}
            >
              {isDownloadingOffline ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-700" />
              ) : book.isOfflineAvailable ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Quick Context Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-stone-200 rounded-xl shadow-lg p-1 z-30 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onAssignLibrary(book);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700 text-left font-medium"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-stone-500" />
                      <span>Classer en bibliothèque</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onToggleOffline(book);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700 text-left font-medium"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-500" />
                      <span>
                        {book.isOfflineAvailable
                          ? 'Supprimer du hors-ligne'
                          : 'Rendre disponible hors-ligne'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRemoveBook(book);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-left font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Retirer de ma liste</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
