import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  FileText,
  Sparkles,
  Download,
  Check,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { DriveFileItem, CustomLibrary } from '../types';
import { searchDriveBooks, listDriveFolders, detectFormat } from '../services/googleDrive';

interface DriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  libraries: CustomLibrary[];
  existingBookIds: string[];
  onImportFiles: (
    files: DriveFileItem[],
    targetLibraryId?: string,
    downloadOfflineImmediately?: boolean
  ) => Promise<void>;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const DriveBrowserModal: React.FC<DriveBrowserModalProps> = ({
  isOpen,
  onClose,
  token,
  libraries,
  existingBookIds,
  onImportFiles,
}) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [folders, setFolders] = useState<DriveFileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Google Drive' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [targetLibraryId, setTargetLibraryId] = useState<string>('');
  const [downloadOfflineImmediately, setDownloadOfflineImmediately] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load files in current folder
  const loadFolderContent = async (folderId?: string) => {
    if (!token) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [fetchedFiles, fetchedFolders] = await Promise.all([
        searchDriveBooks(token, folderId === 'root' ? undefined : folderId),
        listDriveFolders(token, folderId === 'root' ? undefined : folderId)
      ]);
      setFiles(fetchedFiles);
      setFolders(fetchedFolders);
    } catch (err: any) {
      console.error('Failed to load Drive contents:', err);
      setErrorMessage(err.message || 'Impossible de lire le contenu de Google Drive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      loadFolderContent(currentFolderId);
    }
  }, [isOpen, currentFolderId, token]);

  if (!isOpen) return null;

  const navigateToFolder = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFileIds(new Set());
  };

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(item.id === 'root' ? undefined : item.id);
    setSelectedFileIds(new Set());
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleImport = async () => {
    const filesToImport = files.filter((f) => selectedFileIds.has(f.id));
    if (filesToImport.length === 0) return;

    setImporting(true);
    try {
      await onImportFiles(filesToImport, targetLibraryId || undefined, downloadOfflineImmediately);
      onClose();
    } catch (err: any) {
      alert(`Erreur lors de l'import: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-stone-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stone-900 text-white rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Explorer votre Google Drive
              </h2>
              <p className="text-xs text-stone-500">
                Sélectionnez vos livres, BDs (CBZ/CBR) et documents PDF
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

        {/* Breadcrumbs & Search toolbar */}
        <div className="px-6 py-3 border-b border-stone-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600 overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
                <button
                  onClick={() => navigateToBreadcrumb(idx)}
                  className={`hover:text-stone-900 font-medium ${
                    idx === breadcrumbs.length - 1 ? 'text-stone-900 font-bold underline' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search in current folder */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer dans ce dossier..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100 border border-stone-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-stone-400"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-stone-600" />
              <span>Chargement de vos fichiers Google Drive...</span>
            </div>
          ) : (
            <>
              {/* Folders Section */}
              {folders.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Dossiers ({folders.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors text-left"
                      >
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs font-medium text-stone-800 truncate">
                          {folder.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Fichiers trouvés ({filteredFiles.length})
                  </div>
                  {filteredFiles.length > 0 && (
                    <button
                      onClick={selectAll}
                      className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5"
                    >
                      {selectedFileIds.size === filteredFiles.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Tout désélectionner</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>Tout sélectionner</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {filteredFiles.length === 0 && folders.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    Aucun fichier compatible (PDF, CBZ, CBR, EPUB) trouvé dans ce dossier Drive.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedFileIds.has(file.id);
                      const isAlreadyImported = existingBookIds.includes(file.id);
                      const format = detectFormat(file.name, file.mimeType);

                      return (
                        <div
                          key={file.id}
                          onClick={() => toggleSelectFile(file.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 text-white border-stone-900'
                              : isAlreadyImported
                              ? 'bg-stone-50 border-stone-200 opacity-75'
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded-sm accent-stone-900 cursor-pointer"
                            />
                            <div className="truncate">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] opacity-70 mt-0.5">
                                <span className="uppercase font-mono">{format}</span>
                                {file.size && <span>• {formatSize(file.size)}</span>}
                                {isAlreadyImported && (
                                  <span className="text-emerald-500 font-bold">
                                    • Déjà dans la bibliothèque
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-xs">
                            {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-6 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            {/* Target Library Selector */}
            <div className="flex items-center gap-2">
              <label className="text-stone-600 font-medium">Bibliothèque :</label>
              <select
                value={targetLibraryId}
                onChange={(e) => setTargetLibraryId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
              >
                <option value="">Aucune (Générale)</option>
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Offline download immediately checkbox */}
            <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={downloadOfflineImmediately}
                onChange={(e) => setDownloadOfflineImmediately(e.target.checked)}
                className="accent-stone-900 rounded-sm"
              />
              <span>Télécharger immédiatement pour le mode hors-ligne</span>
            </label>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
            >
              Annuler
            </button>
            <button
              id="confirm-import-btn"
              onClick={handleImport}
              disabled={selectedFileIds.size === 0 || importing}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importation en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Importer ({selectedFileIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
