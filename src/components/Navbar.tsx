import React from 'react';
import {
  BookOpen,
  Cloud,
  CloudCheck,
  RefreshCw,
  Search,
  WifiOff,
  Menu,
  HardDrive
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  hasDriveToken: boolean;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onOpenDriveBrowser: () => void;
  onSyncDrive: () => void;
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleSidebar: () => void;
  totalBooks: number;
  offlineCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  hasDriveToken,
  onConnectDrive,
  onDisconnectDrive,
  onOpenDriveBrowser,
  onSyncDrive,
  isSyncing,
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  totalBooks,
  offlineCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200 text-stone-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-amber-50 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-stone-900 leading-tight">
                Lecteur Ebook Drive
              </h1>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                PDF • CBZ • CBR • EPUB
              </p>
            </div>
          </div>
        </div>

        {/* Center: Realtime Search */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un livre, BD, manga..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-stone-100/80 border border-stone-200 rounded-full focus:outline-hidden focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-400 text-stone-800"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Drive Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Offline count indicator */}
          <div
            title={`${offlineCount} livre(s) disponible(s) hors-ligne`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{offlineCount} hors-ligne</span>
          </div>

          {/* Drive Connected Button / Modal */}
          {hasDriveToken ? (
            <div className="flex items-center gap-1.5">
              <button
                id="sync-drive-btn"
                onClick={onSyncDrive}
                disabled={isSyncing}
                title="Synchroniser avec Google Drive"
                className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-stone-900' : ''}`} />
              </button>

              <button
                id="browse-drive-btn"
                onClick={onOpenDriveBrowser}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Explorer Drive</span>
              </button>

              {/* User Avatar / Disconnect */}
              <div className="relative group">
                <button
                  id="user-profile-btn"
                  onClick={onDisconnectDrive}
                  title="Déconnexion Google Drive"
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-stone-100 border border-stone-200 text-xs text-stone-700"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Utilisateur'}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center text-[10px] font-bold">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                  <span className="hidden md:inline font-medium max-w-[100px] truncate">
                    {user?.displayName?.split(' ')[0] || 'Connecté'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <button
              id="google-connect-button"
              onClick={onConnectDrive}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Connexion Drive</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
