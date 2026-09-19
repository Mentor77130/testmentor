import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveFileItem, EbookFormat } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might need re-fetching through popup if page was refreshed
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Drive");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export function detectFormat(fileName: string, mimeType?: string): EbookFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (lower.endsWith('.cbz') || lower.endsWith('.zip')) return 'cbz';
  if (lower.endsWith('.cbr') || lower.endsWith('.rar')) return 'cbr';
  if (lower.endsWith('.epub') || mimeType === 'application/epub+zip') return 'epub';
  if (lower.endsWith('.txt') || mimeType === 'text/plain') return 'txt';
  return 'unknown';
}

// Search and list files in Google Drive
export async function searchDriveBooks(token: string, folderId?: string): Promise<DriveFileItem[]> {
  try {
    // Query for files with pdf, cbz, cbr, epub or in folder
    const queryParts: string[] = [
      "trashed = false",
      "(name contains '.pdf' or name contains '.cbz' or name contains '.cbr' or name contains '.epub' or name contains '.txt' or mimeType = 'application/pdf' or mimeType = 'application/epub+zip')"
    ];

    if (folderId) {
      queryParts.push(`'${folderId}' in parents`);
    }

    const q = encodeURIComponent(queryParts.join(' and '));
    const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, thumbnailLink, iconLink, parents)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Google Drive API error:', res.status, errBody);
      throw new Error(`Erreur Drive (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Erreur recherche Drive:', err);
    throw err;
  }
}

// List user folders in Google Drive
export async function listDriveFolders(token: string, parentId?: string): Promise<DriveFileItem[]> {
  try {
    const parentQuery = parentId ? `'${parentId}' in parents and ` : '';
    const q = encodeURIComponent(`${parentQuery}mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const fields = encodeURIComponent('files(id, name, mimeType, modifiedTime)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=50&orderBy=name`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Erreur listing dossiers Drive (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Erreur dossiers Drive:', err);
    throw err;
  }
}

// Download raw binary from Google Drive
export async function downloadDriveFile(
  fileId: string,
  token: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Échec du téléchargement du fichier (${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || !total) {
    return await response.blob();
  }

  const reader = response.body.getReader();
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (onProgress && total > 0) {
      onProgress(Math.round((receivedLength / total) * 100));
    }
  }

  return new Blob(chunks as BlobPart[]);
}
