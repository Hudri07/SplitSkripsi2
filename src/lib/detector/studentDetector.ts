import { ExtractedPage } from '../../types';

export interface DetectedStudentInfo {
  name?: string;
  nim?: string;
}

/**
 * Intelligently scans early document pages (Cover, Pengesahan, Pernyataan)
 * to detect the student/author name and student identification number (NIM/NPM/NISN).
 */
export function detectStudentInfo(pages: ExtractedPage[]): DetectedStudentInfo {
  let detectedName: string | undefined;
  let detectedNim: string | undefined;

  // Scan only the first 4 pages (where Cover and Endorsement sheets live)
  const candidatePages = pages.slice(0, 4);

  // Stop-words and blacklist for names (faculty, university, headers, etc.)
  const nameBlacklist = [
    'SKRIPSI',
    'TESIS',
    'DISERTASI',
    'LAPORAN',
    'TUGAS AKHIR',
    'UNIVERSITAS',
    'INSTITUT',
    'SEKOLAH TINGGI',
    'POLITEKNIK',
    'FAKULTAS',
    'PROGRAM STUDI',
    'JURUSAN',
    'DEPARTEMEN',
    'DOSEN',
    'PEMBIMBING',
    'PENGUJI',
    'KEMENTERIAN',
    'JAKARTA',
    'BANDUNG',
    'YOGYAKARTA',
    'SURABAYA',
    'SEMARANG',
    'MEDAN',
    'MAKASSAR',
    'LEMBAR PENGESAHAN',
    'PERNYATAAN KEASLIAN',
  ];

  for (const page of candidatePages) {
    const lines = page.lines.map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Detect NIM / NPM / NRP / NISN
      if (!detectedNim) {
        const nimMatch = line.match(
          /\b(?:NIM|N\.I\.M|NPM|N\.P\.M|NRP|NISN|No(?:\.|\s+)?Induk(?:\s+Mahasiswa)?)\s*[:.\-]?\s*([0-9A-Za-z\/\.\-]+)/i
        );

        if (nimMatch && nimMatch[1]) {
          const rawNim = nimMatch[1].replace(/^[.:\-]+/, '').trim();
          // Verify it contains digits
          if (/\d{4,}/.test(rawNim) && rawNim.length >= 4 && rawNim.length <= 25) {
            detectedNim = rawNim;

            // If we haven't found the name yet, check the line immediately above the NIM
            if (!detectedName && i > 0) {
              const prevLine = lines[i - 1].trim();
              if (isValidNameCandidate(prevLine, nameBlacklist)) {
                detectedName = cleanNameString(prevLine);
              }
            }
          }
        }
      }

      // 2. Detect "Oleh / Disusun Oleh / Penulis / Nama"
      if (!detectedName) {
        // Pattern: "Nama / Nama Mahasiswa / Disusun Oleh / Penulis : [Nama]"
        const explicitNameMatch = line.match(
          /^(?:Nama(?:\s+Mahasiswa|\s+Siswa|\s+Lengkap)?|Penulis|Author)\s*[:.\-]\s*([A-Za-z\s.,'’`]+)$/i
        );

        if (explicitNameMatch && explicitNameMatch[1]) {
          const cand = explicitNameMatch[1].trim();
          if (isValidNameCandidate(cand, nameBlacklist)) {
            detectedName = cleanNameString(cand);
          }
        }

        // Pattern: "Disusun Oleh:" or "Oleh:" on its own line -> candidate is next line
        const headerIntroMatch = /^(?:Disusun\s+Oleh|Oleh|Diajukan\s+Oleh|Penulis)\s*[:.\-]?$/i.test(
          line
        );

        if (headerIntroMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (isValidNameCandidate(nextLine, nameBlacklist)) {
            detectedName = cleanNameString(nextLine);
          }
        }
      }
    }

    if (detectedName && detectedNim) break;
  }

  return {
    name: detectedName,
    nim: detectedNim,
  };
}

function isValidNameCandidate(str: string, blacklist: string[]): boolean {
  if (!str || str.length < 3 || str.length > 50) return false;
  // Must not be all numbers or contain invalid symbols
  if (!/[a-zA-Z]/.test(str)) return false;
  if (/[:;_{}[\]<>*+=?]/.test(str)) return false;

  const upper = str.toUpperCase();
  for (const word of blacklist) {
    if (upper.includes(word)) return false;
  }

  // Ensure it's not a common title line
  if (/^(BAB|HALAMAN|DAFTAR|KATA PENGANTAR|ABSTRAK|ABSTRACT)/i.test(str)) return false;

  return true;
}

function cleanNameString(str: string): string {
  return str
    .replace(/^(?:Oleh|Disusun Oleh|Penulis|Nama Mahasiswa|Nama Siswa|Nama)\s*[:.\-]\s*/i, '')
    .replace(/[(),]/g, '')
    .trim();
}

/**
 * Builds the standard folder name:
 * "skripsi [nama siswa] - [nim]" (if NIM exists)
 * "skripsi [nama siswa]" (if no NIM)
 */
export function buildZipFolderName(
  studentName?: string,
  studentNim?: string,
  fallbackBaseName: string = 'skripsi'
): string {
  const cleanName = (studentName || '').trim();
  const cleanNim = (studentNim || '').trim();

  if (cleanName) {
    if (cleanNim) {
      return `skripsi ${cleanName} - ${cleanNim}`;
    }
    return `skripsi ${cleanName}`;
  }

  if (cleanNim) {
    return `skripsi - ${cleanNim}`;
  }

  const base = fallbackBaseName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return `skripsi ${base}`;
}
