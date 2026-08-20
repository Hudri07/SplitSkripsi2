export interface SectionPattern {
  key: string;
  defaultTitle: string;
  category: 'frontmatter' | 'chapter' | 'backmatter' | 'other';
  priority: number;
  regexList: RegExp[];
  negativePatterns?: RegExp[];
  subTitleExtractor?: (text: string) => string;
}

export const ACADEMIC_PATTERNS: SectionPattern[] = [
  // Frontmatter
  {
    key: 'cover',
    defaultTitle: 'Cover / Halaman Depan',
    category: 'frontmatter',
    priority: 1,
    regexList: [
      /^(?:halaman\s+)?(?:sampul|cover|judul\s+luar)$/i,
      /^(?:proposal\s+skripsi|laporan\s+tugas\s+akhir|laporan\s+skripsi|skripsi)$/i,
    ],
  },
  {
    key: 'title_page',
    defaultTitle: 'Halaman Judul',
    category: 'frontmatter',
    priority: 2,
    regexList: [
      /^(?:halaman\s+judul|title\s+page)$/i,
      /^diajukan\s+(?:untuk|sebagai\s+salah\s+satu\s+syarat)/i,
    ],
  },
  {
    key: 'approval',
    defaultTitle: 'Lembar Pengesahan',
    category: 'frontmatter',
    priority: 3,
    regexList: [
      /^(?:lembar(?:an)?\s+)?(?:pengesahan|persetujuan|pembimbing|penguji)(?:\s+skripsi|\s+tugas\s+akhir|\s+tesis)?$/i,
      /^tanda\s+persetujuan(?:\s+skripsi|\s+tugas\s+akhir)?$/i,
      /^approval\s+sheet$/i,
    ],
  },
  {
    key: 'declaration',
    defaultTitle: 'Pernyataan Keaslian',
    category: 'frontmatter',
    priority: 4,
    regexList: [
      /^(?:surat\s+|lembar\s+)?pernyataan\s+(?:keaslian|orisionalitas|bebas\s+plagiat|integritas|otentisitas)(?:\s+skripsi|\s+karya\s+ilmiah)?$/i,
      /^statement\s+of\s+(?:originality|authenticity)$/i,
    ],
  },
  {
    key: 'dedication_motto',
    defaultTitle: 'Halaman Persembahan & Motto',
    category: 'frontmatter',
    priority: 5,
    regexList: [
      /^(?:halaman\s+)?(?:persembahan|motto|motto\s+dan\s+persembahan|dedication)$/i,
    ],
  },
  {
    key: 'abstract_id',
    defaultTitle: 'Abstrak',
    category: 'frontmatter',
    priority: 6,
    regexList: [
      /^abstrak(?:\s*\(indonesia\))?$/i,
      /^abstrak\s*$/i,
      /^ringkasan(?:\s+eksekutif)?$/i,
    ],
  },
  {
    key: 'abstract_en',
    defaultTitle: 'Abstract',
    category: 'frontmatter',
    priority: 7,
    regexList: [
      /^abstract$/i,
      /^abstract\s*\(english\)$/i,
      /^executive\s+summary$/i,
    ],
  },
  {
    key: 'preface',
    defaultTitle: 'Kata Pengantar',
    category: 'frontmatter',
    priority: 8,
    regexList: [
      /^(?:kata\s+pengantar|prakata|foreword|preface|ucapan\s+terima\s+kasih|acknowledgements?)$/i,
    ],
  },
  {
    key: 'toc',
    defaultTitle: 'Daftar Isi',
    category: 'frontmatter',
    priority: 9,
    regexList: [
      /^daftar\s+isi(?:\s+skripsi|\s+laporan)?$/i,
      /^table\s+of\s+contents?$/i,
      /^isi\s+laporan$/i,
    ],
  },
  {
    key: 'table_list',
    defaultTitle: 'Daftar Tabel',
    category: 'frontmatter',
    priority: 10,
    regexList: [
      /^daftar\s+tabel$/i,
      /^list\s+of\s+tables?$/i,
    ],
  },
  {
    key: 'figure_list',
    defaultTitle: 'Daftar Gambar',
    category: 'frontmatter',
    priority: 11,
    regexList: [
      /^daftar\s+gambar$/i,
      /^list\s+of\s+figures?$/i,
      /^daftar\s+grafik$/i,
      /^daftar\s+bagan$/i,
    ],
  },
  {
    key: 'appendix_list',
    defaultTitle: 'Daftar Lampiran',
    category: 'frontmatter',
    priority: 12,
    regexList: [
      /^daftar\s+lampiran$/i,
      /^list\s+of\s+appendi(?:x|ces)$/i,
      /^daftar\s+singkatan(?:\s+dan\s+istilah)?$/i,
      /^daftar\s+simbol$/i,
      /^daftar\s+notasi$/i,
    ],
  },

  // Chapters (BAB I - BAB VII / Chapter 1 - Chapter 7)
  {
    key: 'bab_1',
    defaultTitle: 'BAB I PENDAHULUAN',
    category: 'chapter',
    priority: 20,
    regexList: [
      /^bab\s+(?:i|1|satu)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:1|i|one)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:i|1|satu)\.?$/i,
      /^chapter\s+(?:1|i|one)\.?$/i,
    ],
  },
  {
    key: 'bab_2',
    defaultTitle: 'BAB II TINJAUAN PUSTAKA',
    category: 'chapter',
    priority: 21,
    regexList: [
      /^bab\s+(?:ii|2|dua)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:2|ii|two)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:ii|2|dua)\.?$/i,
      /^chapter\s+(?:2|ii|two)\.?$/i,
    ],
  },
  {
    key: 'bab_3',
    defaultTitle: 'BAB III METODOLOGI PENELITIAN',
    category: 'chapter',
    priority: 22,
    regexList: [
      /^bab\s+(?:iii|3|tiga)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:3|iii|three)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:iii|3|tiga)\.?$/i,
      /^chapter\s+(?:3|iii|three)\.?$/i,
    ],
  },
  {
    key: 'bab_4',
    defaultTitle: 'BAB IV HASIL DAN PEMBAHASAN',
    category: 'chapter',
    priority: 23,
    regexList: [
      /^bab\s+(?:iv|4|empat)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:4|iv|four)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:iv|4|empat)\.?$/i,
      /^chapter\s+(?:4|iv|four)\.?$/i,
    ],
  },
  {
    key: 'bab_5',
    defaultTitle: 'BAB V PENUTUP',
    category: 'chapter',
    priority: 24,
    regexList: [
      /^bab\s+(?:v|5|lima)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:5|v|five)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:v|5|lima)\.?$/i,
      /^chapter\s+(?:5|v|five)\.?$/i,
    ],
  },
  {
    key: 'bab_6',
    defaultTitle: 'BAB VI KESIMPULAN DAN REKOMENDASI',
    category: 'chapter',
    priority: 25,
    regexList: [
      /^bab\s+(?:vi|6|enam)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:6|vi|six)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:vi|6|enam)\.?$/i,
      /^chapter\s+(?:6|vi|six)\.?$/i,
    ],
  },
  {
    key: 'bab_7',
    defaultTitle: 'BAB VII',
    category: 'chapter',
    priority: 26,
    regexList: [
      /^bab\s+(?:vii|7|tujuh)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^chapter\s+(?:7|vii|seven)(?:\s*[:.\-]\s*|\s+)(.*)$/i,
      /^bab\s+(?:vii|7|tujuh)\.?$/i,
      /^chapter\s+(?:7|vii|seven)\.?$/i,
    ],
  },

  // Backmatter
  {
    key: 'bibliography',
    defaultTitle: 'Daftar Pustaka',
    category: 'backmatter',
    priority: 40,
    regexList: [
      /^(?:daftar\s+pustaka|daftar\s+rujukan|daftar\s+referensi|bibliografi|references?|bibliography)$/i,
      /^daftar\s+pustaka\s*(?:dan\s+webografi)?$/i,
    ],
  },
  {
    key: 'appendix',
    defaultTitle: 'Lampiran',
    category: 'backmatter',
    priority: 50,
    regexList: [
      /^(?:lampiran|appendi(?:x|ces))(?:\s*[:.\-]\s*|\s+[a-z0-9]+|\s*)$/i,
      /^(?:daftar\s+lampiran\s+lengkap)$/i,
    ],
  },
  {
    key: 'curriculum_vitae',
    defaultTitle: 'Riwayat Hidup',
    category: 'backmatter',
    priority: 60,
    regexList: [
      /^(?:biodata(?:\s+penulis|\s+peneliti|\s+mahasiswa)?|curriculum\s+vitae|riwayat\s+hidup(?:\s+penulis|\s+peneliti)?|profil\s+penulis|biografi\s+penulis)$/i,
    ],
  },
];
