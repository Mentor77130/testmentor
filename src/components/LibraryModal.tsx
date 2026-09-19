import React, { useState } from 'react';
import { X, FolderPlus, Palette, Sparkles, BookOpen, Bookmark, FileText } from 'lucide-react';
import { CustomLibrary } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLibrary: (library: Omit<CustomLibrary, 'id' | 'createdAt'>) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#64748b', // Slate
];

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  onCreateLibrary,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateLibrary({
      name: name.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      icon: 'Folder',
    });

    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden text-stone-900 animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stone-900 text-white rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Nouvelle bibliothèque
              </h2>
              <p className="text-xs text-stone-500">
                Organisez vos bandes dessinées, mangas et ebooks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nom de la collection *
            </label>
            <input
              id="library-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Comics Marvel, Mangas Shonen, Romans SF..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:bg-white focus:border-stone-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description (optionnel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte de la sélection"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:bg-white focus:border-stone-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Couleur thématique
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-115 ring-2 ring-stone-900 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
            >
              Annuler
            </button>
            <button
              id="submit-library-btn"
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-40"
            >
              Créer la bibliothèque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
