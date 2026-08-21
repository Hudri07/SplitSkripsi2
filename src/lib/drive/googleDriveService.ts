/**
 * Google Drive Integration Service
 * Uses Google Identity Services (GIS) token client for client-side OAuth 2.0
 * and Google Drive v3 REST API to create folders and upload split PDF files.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: any) => void;
          }) => TokenClient;
          revoke?: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export interface TokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface DriveUploadProgress {
  current: number;
  total: number;
  currentFileName: string;
  percent: number;
  status: 'connecting' | 'creating_folder' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export interface DriveFolderResult {
  folderId: string;
  folderName: string;
  folderUrl: string;
  uploadedFiles: Array<{
    id: string;
    name: string;
    webViewLink?: string;
  }>;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Check if GIS SDK is loaded in the window
 */
export function isGoogleGsiLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.google?.accounts?.oauth2?.initTokenClient === 'function';
}

/**
 * Wait for Google Identity Services script to be ready
 */
export async function waitForGoogleGsi(maxWaitMs = 5000): Promise<boolean> {
  if (isGoogleGsiLoaded()) return true;

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 150));
    if (isGoogleGsiLoaded()) return true;
  }
  return isGoogleGsiLoaded();
}

/**
 * Get the OAuth Client ID configured for this environment
 */
export function getOAuthClientId(): string {
  const envClientId = (import.meta as any).env?.VITE_GCP_OAUTH_CLIENT_ID;
  if (envClientId && typeof envClientId === 'string' && envClientId.trim().length > 0) {
    return envClientId.trim();
  }
  return '';
}

/**
 * Helper to humanize Google OAuth error messages
 */
function humanizeOAuthError(err: any): string {
  if (!err) return 'Terjadi kendala saat menghubungkan ke akun Google.';
  
  const msg = typeof err === 'string' ? err : err.message || err.error || err.type || JSON.stringify(err);
  const type = err.type || '';

  if (type === 'popup_closed' || /popup window closed/i.test(msg)) {
    return 'Jendela otorisasi Google ditutup sebelum proses selesai. Silakan klik tombol "Simpan ke Google Drive" kembali untuk mencoba lagi.';
  }
  if (type === 'popup_blocked_by_browser' || /popup blocked/i.test(msg)) {
    return 'Jendela otorisasi diblokir oleh browser. Silakan aktifkan izin pop-up untuk halaman ini pada bilah alamat browser Anda.';
  }
  if (/access_denied/i.test(msg) || /user denied/i.test(msg)) {
    return 'Izin otorisasi dibatalkan. Berikan izin akses Google Drive agar aplikasi dapat menyimpan dokumen skripsi Anda.';
  }
  if (/origin_mismatch/i.test(msg) || /unauthorized_client/i.test(msg)) {
    return 'URL domain ini belum terdaftar pada Authorized JavaScript Origins di Google Cloud Console Client ID Anda.';
  }
  if (/client_id/i.test(msg) || /invalid_client/i.test(msg)) {
    return 'Google OAuth Client ID belum valid atau belum dikonfigurasi dengan benar.';
  }

  return msg;
}

/**
 * Request an access token using Google Identity Services Token Client
 */
export async function requestGoogleDriveAccessToken(): Promise<string> {
  // Check in-memory token cache
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const isReady = await waitForGoogleGsi();
  if (!isReady) {
    throw new Error('Layanan Google Identity Services belum siap dimuat. Silakan periksa koneksi internet Anda dan muat ulang halaman.');
  }

  const clientId = getOAuthClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID belum dikonfigurasi pada environment (VITE_GCP_OAUTH_CLIENT_ID).');
  }

  return new Promise<string>((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: TokenResponse) => {
          if (response.error) {
            reject(new Error(humanizeOAuthError(response.error_description || response.error)));
            return;
          }
          if (response.access_token) {
            cachedAccessToken = response.access_token;
            const expiresIn = Number(response.expires_in) || 3500;
            tokenExpiresAt = Date.now() + expiresIn * 1000;
            resolve(response.access_token);
          } else {
            reject(new Error('Tidak ada access token yang diterima dari Google.'));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(humanizeOAuthError(err)));
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(new Error(humanizeOAuthError(err)));
    }
  });
}

/**
 * Reset / revoke token cache
 */
export function clearGoogleDriveToken(): void {
  if (cachedAccessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(cachedAccessToken, () => {});
    } catch (e) {
      // ignore
    }
  }
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

/**
 * Check if currently authenticated with a valid token
 */
export function isDriveAuthenticated(): boolean {
  return !!cachedAccessToken && Date.now() < tokenExpiresAt - 60000;
}

/**
 * Create a new folder on Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  accessToken: string,
  parentFolderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Gagal membuat folder di Google Drive (Status: ${response.status})`);
  }

  return await response.json();
}

/**
 * Upload a PDF blob directly to a specific Google Drive folder using multipart upload
 */
export async function uploadPdfToDrive(
  fileBlob: Blob,
  fileName: string,
  parentFolderId: string,
  accessToken: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = {
    name: fileName,
    parents: [parentFolderId],
    mimeType: 'application/pdf',
  };

  const boundary = '-------SplitSkripsiMultiPartBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart =
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata);

  // Convert Blob to ArrayBuffer
  const fileArrayBuffer = await fileBlob.arrayBuffer();
  const fileBytes = new Uint8Array(fileArrayBuffer);

  // Construct binary multipart payload
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(delimiter + metadataPart + delimiter + 'Content-Type: application/pdf\r\n\r\n');
  const footerBytes = encoder.encode(closeDelimiter);

  const totalLength = headerBytes.length + fileBytes.length + footerBytes.length;
  const multipartBody = new Uint8Array(totalLength);

  multipartBody.set(headerBytes, 0);
  multipartBody.set(fileBytes, headerBytes.length);
  multipartBody.set(footerBytes, headerBytes.length + fileBytes.length);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Gagal mengunggah file ${fileName} ke Google Drive (Status: ${response.status})`);
  }

  return await response.json();
}

/**
 * Upload all split PDF items to a new Google Drive folder with progress reporting
 */
export async function uploadAllSplitResultsToDrive(
  items: Array<{ id: string; filename: string; blob: Blob }>,
  folderName: string,
  onProgress?: (progress: DriveUploadProgress) => void
): Promise<DriveFolderResult> {
  const total = items.length;

  onProgress?.({
    current: 0,
    total,
    currentFileName: '',
    percent: 5,
    status: 'connecting',
  });

  // 1. Get OAuth Access Token
  const token = await requestGoogleDriveAccessToken();

  onProgress?.({
    current: 0,
    total,
    currentFileName: folderName,
    percent: 15,
    status: 'creating_folder',
  });

  // 2. Create the target folder in Google Drive
  const folder = await createDriveFolder(folderName, token);
  const folderId = folder.id;
  const folderUrl = folder.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;

  const uploadedFiles: Array<{ id: string; name: string; webViewLink?: string }> = [];

  // 3. Upload each split PDF item in sequence
  for (let i = 0; i < total; i++) {
    const item = items[i];
    const currentNum = i + 1;
    const itemPercent = Math.round(15 + (currentNum / total) * 80);

    onProgress?.({
      current: currentNum,
      total,
      currentFileName: item.filename,
      percent: itemPercent,
      status: 'uploading',
    });

    const fileResult = await uploadPdfToDrive(item.blob, item.filename, folderId, token);
    uploadedFiles.push(fileResult);
  }

  onProgress?.({
    current: total,
    total,
    currentFileName: 'Semua file berhasil diunggah',
    percent: 100,
    status: 'completed',
  });

  return {
    folderId,
    folderName,
    folderUrl,
    uploadedFiles,
  };
}
