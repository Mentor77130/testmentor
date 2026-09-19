import React, { useState } from 'react';
import { X, Folder, Check, Plus } from 'lucide-react';
import { Book, CustomLibrary } from '../types';

interface AssignLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  libraries: CustomLibrary[];
  onSaveBookLibraries: (bookId: string, libraryIds: string[]) => void;
  onCreateNewLibrary: () => void;
}

export const AssignLibraryModal: React.FC<AssignLibraryModalProps> = ({
  isOpen,
  onClose,
  book,
  libraries,
  onSaveBookLibraries,
  onCreateNewLibrary,
}) => {
  if (!isOpen || !book) return null;

  const [selectedIds, setSelectedIds] = useState<string[]>(book.libraries || []);

  const toggleLibrary = (libId: string) => {
    setSelectedIds((prev) =>
      prev.includes(libId) ? prev.filter((id) => id !== libId) : [...prev, libId]
    );
  };

  const handleSave = () => {
    onSaveBookLibraries(book.id, selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden text-stone-900 animate-in fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Classer l'ouvrage</h3>
            <p className="text-[11px] text-stone-500 truncate max-w-[240px]">
              {book.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Libraries selection list */}
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {libraries.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-4">
              Aucune bibliothèque disponible.
            </p>
          ) : (
            libraries.map((lib) => {
              const isSelected = selectedIds.includes(lib.id);
              return (
                <div
                  key={lib.id}
                  onClick={() => toggleLibrary(lib.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-stone-50/70 border-stone-200 hover:border-stone-300 text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: lib.color || '#6366f1' }}
                    />
                    <span className="text-xs font-semibold truncate">{lib.name}</span>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              );
            })
          )}

          <button
            onClick={() => {
              onClose();
              onCreateNewLibrary();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-dashed border-stone-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer une nouvelle bibliothèque</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-end gap-2 bg-stone-50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
