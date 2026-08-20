import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates a realistic sample Academic Thesis PDF (12 pages)
 * Includes Cover, Pengesahan, Abstrak, Kata Pengantar, Daftar Isi (with dots), BAB I - BAB V, Daftar Pustaka, Lampiran
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
    // 1: Cover
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
    // 4: Abstrak
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
    // 5: Kata Pengantar
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
    // 6: Daftar Isi (Contains dotted lines which must NOT trigger false positives)
    {
      header: 'DAFTAR ISI',
      isToc: true,
      bodyLines: [
        'HALAMAN JUDUL ............................................................................ i',
        'LEMBAR PENGESAHAN ........................................................................ ii',
        'PERNYATAAN KEASLIAN ..................................................................... iii',
        'ABSTRAK .................................................................................. iv',
        'KATA PENGANTAR ........................................................................... v',
        'DAFTAR ISI ............................................................................... vi',
        'DAFTAR GAMBAR ............................................................................ vii',
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
    // 7: BAB I
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
    // 8: BAB II
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
    // 9: BAB III
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
    // 10: BAB IV
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
    // 11: BAB V
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
    // 12: DAFTAR PUSTAKA
    {
      header: 'DAFTAR PUSTAKA',
      bodyLines: [
        '1. Adobe Systems Inc. (2008). Document Management — Portable Document Format — Part 1: PDF 1.7.',
        '2. Kadir, Abdul. (2022). Dasar Pemrograman Algoritma dan Struktur Data. Jakarta: Penerbit Informatika.',
        '3. Pressman, Roger S. (2020). Software Engineering: A Practitioner’s Approach. McGraw-Hill Education.',
        '4. Rahardjo, Budi. (2023). Keamanan Informasi dan Manajemen Dokumen Digital. Bandung: ITB Press.',
      ],
    },
    // 13: LAMPIRAN
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
          x: width / 2 - (fontBold.widthOfTextAtSize(sLine, 12) / 2),
          y: currentY,
          size: 12,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.4),
        });
        currentY -= 18;
      });
      currentY -= 10;
    }

    currentY -= 20;

    // Body text lines
    pageData.bodyLines.forEach((bLine) => {
      if (bLine === '') {
        currentY -= 14;
        return;
      }

      const fontToUse = pageData.isToc ? fontRegular : (/^[0-9]\.|^Judul|^Nama|^NIM/i.test(bLine) ? fontBold : fontRegular);
      page.drawText(bLine, {
        x: 60,
        y: currentY,
        size: pageData.isToc ? 9.5 : 10.5,
        font: fontToUse,
        color: rgb(0.15, 0.18, 0.22),
      });
      currentY -= 16;
    });

    // Page Numbering Footer
    const pageNumText = idx < 5 ? ['i', 'ii', 'iii', 'iv', 'v'][idx] : String(idx - 5 + 1);
    page.drawText(`- ${pageNumText} -`, {
      x: width / 2 - (fontRegular.widthOfTextAtSize(`- ${pageNumText} -`, 9) / 2),
      y: 40,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: pdfBytes.buffer as ArrayBuffer,
    filename: 'Contoh_Skripsi_Lengkap.pdf',
  };
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
