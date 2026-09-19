import React from 'react';
import {
  BookOpen,
  Heart,
  Bookmark,
  FolderPlus,
  Compass,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  HardDrive,
  Trash2,
  Settings,
  Plus
} from 'lucide-react';
import { CustomLibrary, EbookFormat } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilter: string; // 'all' | 'favorites' | 'reading' | 'format-pdf' | libraryId
  onSelectFilter: (filterId: string) => void;
  libraries: CustomLibrary[];
  onCreateLibrary: () => void;
  onDeleteLibrary: (libId: string) => void;
  totalBooksCount: number;
  favoritesCount: number;
  readingCount: number;
  formatCounts: Record<EbookFormat, number>;
  libraryCounts: Record<string, number>;
  lastSyncTime?: Date | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeFilter,
  onSelectFilter,
  libraries,
  onCreateLibrary,
  onDeleteLibrary,
  totalBooksCount,
  favoritesCount,
  readingCount,
  formatCounts,
  libraryCounts,
  lastSyncTime
}) => {
  const mainNavItems = [
    {
      id: 'all',
      label: 'Tous les livres',
      icon: BookOpen,
      count: totalBooksCount,
    },
    {
      id: 'favorites',
      label: 'Favoris & Hors-ligne',
      icon: Heart,
      count: favoritesCount,
    },
    {
      id: 'reading',
      label: 'En cours de lecture',
      icon: Bookmark,
      count: readingCount,
    },
  ];

  const formatFilters: { id: string; label: string; format: EbookFormat; color: string }[] = [
    { id: 'format-cbz', label: 'Comics (CBZ)', format: 'cbz', color: 'bg-indigo-500' },
    { id: 'format-cbr', label: 'Comics (CBR)', format: 'cbr', color: 'bg-violet-500' },
    { id: 'format-pdf', label: 'Documents (PDF)', format: 'pdf', color: 'bg-amber-500' },
    { id: 'format-epub', label: 'Ebooks (EPUB)', format: 'epub', color: 'bg-emerald-500' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-stone-50/80 border-r border-stone-200 z-40 transition-transform duration-200 ease-in-out overflow-y-auto flex flex-col justify-between p-4 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 px-2 mb-2">
              Navigation
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeFilter === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => {
                      onSelectFilter(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        isActive ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Formats Filter */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 px-2 mb-2">
              Formats
            </div>
            <div className="space-y-1">
              {formatFilters.map((fmt) => {
                const isActive = activeFilter === fmt.id;
                const count = formatCounts[fmt.format] || 0;
                return (
                  <button
                    key={fmt.id}
                    id={`filter-${fmt.id}`}
                    onClick={() => {
                      onSelectFilter(fmt.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-stone-200 text-stone-900 font-semibold'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${fmt.color}`} />
                      <span>{fmt.label}</span>
                    </div>
                    <span className="text-[11px] text-stone-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Libraries */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
                Bibliothèques
              </span>
              <button
                id="create-library-btn"
                onClick={onCreateLibrary}
                className="text-stone-500 hover:text-stone-900 p-1 rounded-md hover:bg-stone-200/80 transition-colors"
                title="Créer une collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {libraries.map((lib) => {
                const isActive = activeFilter === lib.id;
                const count = libraryCounts[lib.id] || 0;
                return (
                  <div key={lib.id} className="group relative flex items-center">
                    <button
                      id={`lib-${lib.id}`}
                      onClick={() => {
                        onSelectFilter(lib.id);
                        onClose();
                      }}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-stone-900 text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lib.color || '#6366f1' }}
                        />
                        <span className="truncate">{lib.name}</span>
                      </div>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-stone-800 text-stone-200' : 'text-stone-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    {/* Delete button (only for custom ones) */}
                    {!lib.id.startsWith('default-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLibrary(lib.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition-opacity ml-1 rounded-sm"
                        title="Supprimer la bibliothèque"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info: Sync status & Cache */}
        <div className="pt-4 border-t border-stone-200 text-[11px] text-stone-500 space-y-2">
          <div className="flex items-center justify-between">
            <span>Synchronisation :</span>
            <span className="text-stone-700 font-medium">
              {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Auto'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-stone-100/80 border border-stone-200/80 text-[11px] leading-relaxed">
            <p className="font-semibold text-stone-700">Stockage local IndexedDB</p>
            <p className="text-stone-500 mt-0.5">
              Les livres marqués hors-ligne restent lisibles sans connexion internet.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
