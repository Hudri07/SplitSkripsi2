import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates a realistic sample Academic Thesis PDF (15 pages)
 * Includes Cover, Pengesahan, Pernyataan Keaslian, Persembahan, Abstrak, Kata Pengantar, Daftar Isi, Daftar Gambar, BAB I - BAB V, Daftar Pustaka, Lampiran
 */
export async function generateSampleThesisPdf(): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  interface PageTemplate {
    header: string;
    subHeader?: string;
    bodyLines: string[];
    isToc?: boolean;
  }

  const samplePages: PageTemplate[] = [
    // 1: Cover Skripsi
    {
      header: 'SKRIPSI',
      subHeader: 'SISTEM DETEKSI DAN PEMISAHAN DOKUMEN AKADEMIK OTOMATIS BERBASIS WEB',
      bodyLines: [
        'Diajukan untuk Memenuhi Salah Satu Syarat Meraih Gelar Sarjana Komputer',
        '',
        'Disusun Oleh:',
        'RAHMAD HIDAYAT',
        'NIM. 2011501234',
        '',
        'PROGRAM STUDI TEKNIK INFORMATIKA',
        'FAKULTAS ILMU KOMPUTER',
        'UNIVERSITAS INDONESIA JAYA',
        '2026',
      ],
    },
    // 2: Lembar Pengesahan
    {
      header: 'LEMBAR PENGESAHAN',
      subHeader: 'SKRIPSI',
      bodyLines: [
        'Judul: SISTEM DETEKSI DAN PEMISAHAN DOKUMEN AKADEMIK OTOMATIS',
        'Nama Mahasiswa : Rahmad Hidayat',
        'NIM            : 2011501234',
        'Program Studi  : Teknik Informatika',
        '',
        'Telah diuji dan dinyatakan LULUS pada Sidang Skripsi tanggal 15 Agustus 2026',
        '',
        'Dosen Pembimbing I                     Dosen Pembimbing II',
        '',
        'Dr. Ir. Hendra Wijaya, M.Kom           Siti Rahmawati, M.T.',
        'NIP. 19780512 200312 1 002            NIP. 19850920 201012 2 003',
      ],
    },
    // 3: Pernyataan Keaslian
    {
      header: 'PERNYATAAN KEASLIAN KARYA TULIS',
      bodyLines: [
        'Dengan ini saya menyatakan bahwa skripsi dengan judul:',
        '"Sistem Deteksi dan Pemisahan Dokumen Akademik Otomatis Berbasis Web"',
        'adalah karya asli saya sendiri dan belum pernah diajukan untuk mendapatkan',
        'gelar akademik di perguruan tinggi mana pun.',
        '',
        'Jakarta, 10 Agustus 2026',
        'Yang Menyatakan,',
        '',
        '(Materai 10.000)',
        '',
        'Rahmad Hidayat',
      ],
    },
    // 4: Halaman Persembahan
    {
      header: 'HALAMAN PERSEMBAHAN',
      subHeader: 'MOTTO DAN PERSEMBAHAN',
      bodyLines: [
        '"Bermimpilah setinggi langit. Jika engkau jatuh, engkau akan jatuh di antara bintang-bintang."',
        '- Ir. Soekarno',
        '',
        'Kupersembahkan karya sederhana ini untuk:',
        '1. Ayahanda dan Ibunda tercinta yang tak pernah lelah melangitkan doa dan mencurahkan kasih sayang.',
        '2. Saudara-saudara dan keluarga besar atas dukungan moral tanpa henti.',
        '3. Sahabat-sahabat seperjuangan Teknik Informatika Angkatan 2022.',
        '4. Almamater tercinta Universitas Indonesia Jaya.',
      ],
    },
    // 5: Abstrak
    {
      header: 'ABSTRAK',
      subHeader: 'SISTEM DETEKSI DAN PEMISAHAN DOKUMEN AKADEMIK OTOMATIS BERBASIS WEB',
      bodyLines: [
        'Pengelolaan repositori digital di lingkungan perguruan tinggi membutuhkan pemecahan',
        'dokumen skripsi utuh menjadi berkas-berkas terpisah per bab seperti Cover, Abstrak,',
        'BAB I sampai BAB V, Daftar Pustaka, serta Lampiran. Proses manual memakan waktu dan',
        'rentan terhadap kesalahan pemotongan halaman. Penelitian ini merancang aplikasi web pintar',
        'yang mengintegrasikan analisis regex heuristik dan parsing PDF client-side untuk memisahkan',
        'dokumen akademik secara otomatis dengan tingkat presisi di atas 95%.',
        '',
        'Kata Kunci: Pemisah Dokumen, Skripsi Digital, Heuristic Detection, Privacy-first.',
      ],
    },
    // 6: Kata Pengantar
    {
      header: 'KATA PENGANTAR',
      bodyLines: [
        'Puji dan syukur penulis panjatkan ke hadirat Tuhan Yang Maha Esa atas limpahan rahmat',
        'dan karunia-Nya sehingga skripsi ini dapat diselesaikan dengan baik.',
        '',
        'Penulis mengucapkan terima kasih yang sebesar-besarnya kepada:',
        '1. Rektor Universitas Indonesia Jaya atas fasilitas akademik yang luar biasa.',
        '2. Dekan Fakultas Ilmu Komputer dan seluruh jajaran dosen pengajar.',
        '3. Dr. Ir. Hendra Wijaya, M.Kom selaku Dosen Pembimbing I.',
        '4. Kedua orang tua tercinta atas doa tulus dan dukungan moral tanpa henti.',
        '',
        'Jakarta, Agustus 2026',
        'Penulis',
      ],
    },
    // 7: Daftar Isi (Contains dotted lines which must NOT trigger false positives)
    {
      header: 'DAFTAR ISI',
      isToc: true,
      bodyLines: [
        'HALAMAN JUDUL ............................................................................ i',
        'LEMBAR PENGESAHAN ........................................................................ ii',
        'PERNYATAAN KEASLIAN ..................................................................... iii',
        'HALAMAN PERSEMBAHAN ..................................................................... iv',
        'ABSTRAK .................................................................................. v',
        'KATA PENGANTAR ........................................................................... vi',
        'DAFTAR ISI ............................................................................... vii',
        'DAFTAR GAMBAR ............................................................................ viii',
        'BAB I PENDAHULUAN ........................................................................ 1',
        '   1.1 Latar Belakang Masalah ............................................................ 1',
        '   1.2 Rumusan Masalah .................................................................. 2',
        '   1.3 Batasan Masalah ................................................................... 2',
        '   1.4 Tujuan Penelitian ................................................................. 3',
        'BAB II TINJAUAN PUSTAKA ................................................................... 4',
        '   2.1 Konsep Dokumen PDF dan Hierarki Struktur ......................................... 4',
        '   2.2 Algoritma Deteksi Heuristik ....................................................... 5',
        'BAB III METODOLOGI PENELITIAN ............................................................ 6',
        '   3.1 Tahapan Penelitian ................................................................ 6',
        '   3.2 Arsitektur Sistem ................................................................. 7',
        'BAB IV HASIL DAN PEMBAHASAN .............................................................. 8',
        '   4.1 Implementasi Antarmuka Pengguna ................................................... 8',
        '   4.2 Evaluasi Akurasi Pemotongan ....................................................... 9',
        'BAB V KESIMPULAN DAN SARAN ............................................................... 10',
        '   5.1 Kesimpulan ........................................................................ 10',
        '   5.2 Saran ............................................................................. 10',
        'DAFTAR PUSTAKA ............................................................................ 11',
        'LAMPIRAN ................................................................................. 12',
      ],
    },
    // 8: Daftar Gambar
    {
      header: 'DAFTAR GAMBAR',
      bodyLines: [
        'Gambar 1.1 Diagram Alir Deteksi Struktur Dokumen ......................................... 3',
        'Gambar 2.1 Struktur Objek Internal File Format PDF ....................................... 5',
        'Gambar 3.1 Arsitektur Client-Side Web Processing ......................................... 7',
        'Gambar 4.1 Tampilan Antarmuka Pratinjau Pemotongan Bab ................................... 9',
      ],
    },
    // 9: BAB I
    {
      header: 'BAB I',
      subHeader: 'PENDAHULUAN',
      bodyLines: [
        '1.1 Latar Belakang Masalah',
        'Kebutuhan integrasi repositori akademik universitas dengan standar pelaporan nasional',
        'mengharuskan setiap naskah skripsi mahasiswa diunggah dalam berkas terpisah.',
        'Metode konvensional pemotongan halaman secara manual rentan terjadi kesalahan rentang halaman.',
        '',
        '1.2 Rumusan Masalah',
        'Bagaimana merancang sistem deteksi otomatis batas bab skripsi berbasis browser tanpa server?',
        '',
        '1.3 Tujuan Penelitian',
        'Menghasilkan instrumen aplikasi pemisah dokumen yang aman, cepat, dan presisi tinggi.',
      ],
    },
    // 10: BAB II
    {
      header: 'BAB II',
      subHeader: 'TINJAUAN PUSTAKA',
      bodyLines: [
        '2.1 Format Standar Portable Document Format (PDF)',
        'PDF adalah standar dokumen digital ISO 32000 yang menyimpan teks sebagai operator instruksi visual.',
        '',
        '2.2 Deteksi Judul Menggunakan Pola Heuristik',
        'Pola kata kunci seperti "BAB [I-V]" diuji dengan memfilter baris bertitik daftar isi agar tidak',
        'terjadi pemotongan palsu (false-positive).',
      ],
    },
    // 11: BAB III
    {
      header: 'BAB III',
      subHeader: 'METODOLOGI PENELITIAN',
      bodyLines: [
        '3.1 Tahapan Penelitian',
        'Penelitian dilaksanakan melalui 4 fase: Analisis Kebutuhan, Perancangan Algoritma, Uji Coba, dan Validasi.',
        '',
        '3.2 Arsitektur Sistem',
        'Seluruh pemrosesan berlangsung di sisi peramban (client-side) menggunakan Web Worker dan PDF-Lib.',
      ],
    },
    // 12: BAB IV
    {
      header: 'BAB IV',
      subHeader: 'HASIL DAN PEMBAHASAN',
      bodyLines: [
        '4.1 Hasil Pengujian Akurasi',
        'Pengujian pada 50 naskah skripsi menunjukkan akurasi deteksi struktur bab mencapai 98.4%.',
        '',
        '4.2 Evaluasi Waktu Eksekusi',
        'Rata-rata waktu pemrosesan dokumen 100 halaman adalah kurang dari 2 detik di browser modern.',
      ],
    },
    // 13: BAB V
    {
      header: 'BAB V',
      subHeader: 'KESIMPULAN DAN SARAN',
      bodyLines: [
        '5.1 Kesimpulan',
        'Sistem pemisah dokumen PDF otomatis berhasil memisahkan bab dengan tingkat presisi sangat tinggi.',
        '',
        '5.2 Saran',
        'Pengembangan lebih lanjut dapat menambahkan integrasi langsung dengan API E-Prints institusi.',
      ],
    },
    // 14: DAFTAR PUSTAKA
    {
      header: 'DAFTAR PUSTAKA',
      bodyLines: [
        '1. Adobe Systems Inc. (2008). Document Management — Portable Document Format — Part 1: PDF 1.7.',
        '2. Kadir, Abdul. (2022). Dasar Pemrograman Algoritma dan Struktur Data. Jakarta: Penerbit Informatika.',
        '3. Pressman, Roger S. (2020). Software Engineering: A Practitioner’s Approach. McGraw-Hill Education.',
        '4. Rahardjo, Budi. (2023). Keamanan Informasi dan Manajemen Dokumen Digital. Bandung: ITB Press.',
      ],
    },
    // 15: LAMPIRAN
    {
      header: 'LAMPIRAN',
      subHeader: 'DOKUMENTASI PENGUJIAN DAN KODE SUMBER',
      bodyLines: [
        'Lampiran 1: Tabel Pengujian Sampel Dokumen PDF',
        'Lampiran 2: Dokumentasi Pengaturan Parameter Heuristik',
        'Lampiran 3: Format Penamaan Repositori Perpustakaan',
      ],
    },
  ];

  // Render each page into PDF
  for (let idx = 0; idx < samplePages.length; idx++) {
    const pageData = samplePages[idx];
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size: 595 x 842 pt
    const { width, height } = page.getSize();

    let currentY = height - 80;

    // Header (Centered, Bold)
    const headerWidth = fontBold.widthOfTextAtSize(pageData.header, 16);
    page.drawText(pageData.header, {
      x: width / 2 - headerWidth / 2,
      y: currentY,
      size: 16,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.2),
    });

    currentY -= 28;

    // SubHeader if any
    if (pageData.subHeader) {
      const subLines = wrapText(pageData.subHeader, fontBold, 12, width - 120);
      subLines.forEach((sLine) => {
        page.drawText(sLine, {
          x: width / 2 - fontBold.widthOfTextAtSize(sLine, 12) / 2,
          y: currentY,
          size: 12,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });
        currentY -= 18;
      });
      currentY -= 10;
    }

    currentY -= 15;

    // Body Lines
    for (const bLine of pageData.bodyLines) {
      if (!bLine) {
        currentY -= 12;
        continue;
      }

      const isDotted = bLine.includes('....');
      const fontToUse = isDotted ? fontRegular : (bLine.startsWith('"') ? fontItalic : fontRegular);
      const fontSize = isDotted ? 9.5 : 11;

      // Wrap if line is too long
      const wrapped = wrapText(bLine, fontToUse, fontSize, width - 120);
      for (const wLine of wrapped) {
        page.drawText(wLine, {
          x: 60,
          y: currentY,
          size: fontSize,
          font: fontToUse,
          color: isDotted ? rgb(0.3, 0.3, 0.35) : rgb(0.12, 0.14, 0.18),
        });
        currentY -= isDotted ? 15 : 17;
      }
    }

    // Page Number Footer (centered at bottom)
    const pageNumText = String(idx + 1);
    const numWidth = fontRegular.widthOfTextAtSize(pageNumText, 10);
    page.drawText(pageNumText, {
      x: width / 2 - numWidth / 2,
      y: 35,
      size: 10,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: pdfBytes.buffer as ArrayBuffer,
    filename: 'Sample_Skripsi_Lengkap_Universitas.pdf',
  };
}

/**
 * Helper to wrap text into multiple lines given a max width
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}
