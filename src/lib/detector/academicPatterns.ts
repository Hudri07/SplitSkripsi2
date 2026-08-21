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
    defaultTitle: 'Cover Skripsi',
    category: 'frontmatter',
    priority: 1,
    regexList: [
      /^(?:halaman\s+)?(?:sampul|cover|judul\s+luar)(?:\s+skripsi|\s+tugas\s+akhir|\s+laporan)?$/i,
      /^(?:cover\s+skripsi|sampul\s+skripsi|sampul\s+depan)$/i,
    ],
  },
  {
    key: 'title_page',
    defaultTitle: 'Halaman Judul',
    category: 'frontmatter',
    priority: 2,
    regexList: [
      /^(?:halaman\s+judul|title\s+page|judul\s+dalam)(?:\s+skripsi|\s+tugas\s+akhir)?$/i,
      /^diajukan\s+(?:untuk|sebagai\s+salah\s+satu\s+syarat)/i,
    ],
  },
  // Distinct Lembar Persetujuan (Pembimbing / Proposal / Ujian)
  {
    key: 'approval_advisor',
    defaultTitle: 'Lembar Persetujuan',
    category: 'frontmatter',
    priority: 3,
    regexList: [
      /^(?:lembar(?:an)?\s+|halaman\s+|surat\s+|tanda\s+)?persetujuan(?:\s+skripsi|\s+tugas\s+akhir|\s+tesis|\s+pembimbing|\s+komisi\s+pembimbing|\s+dosen\s+pembimbing|\s+seminar|\s+ujian|\s+naskah)?$/i,
      /^(?:lembar\s+|halaman\s+)?persetujuan\s+(?:pembimbing|dosen\s+pembimbing|komisi\s+pembimbing)$/i,
      /^persetujuan\s+pembimbing$/i,
      /^persetujuan\s+skripsi$/i,
      /^tanda\s+persetujuan(?:\s+skripsi)?$/i,
    ],
  },
  // Distinct Lembar Pengesahan (Tim Penguji / Dekan / Dewan Penguji)
  {
    key: 'approval_examiner',
    defaultTitle: 'Lembar Pengesahan',
    category: 'frontmatter',
    priority: 3.2,
    regexList: [
      /^(?:lembar(?:an)?\s+|halaman\s+|tanda\s+)?pengesahan(?:\s+skripsi|\s+tugas\s+akhir|\s+tesis|\s+penguji|\s+tim\s+penguji|\s+dewan\s+penguji|\s+laporan)?$/i,
      /^(?:lembar\s+|halaman\s+)?pengesahan\s+(?:tim\s+penguji|dewan\s+penguji|panitia\s+ujian|dekan)$/i,
      /^pengesahan\s+skripsi$/i,
      /^lembar\s+pengesahan$/i,
      /^approval\s+sheet$/i,
    ],
  },
  {
    key: 'publication_approval',
    defaultTitle: 'Halaman Persetujuan Publikasi',
    category: 'frontmatter',
    priority: 3.5,
    regexList: [
      /^(?:halaman\s+|lembar\s+|surat\s+)?(?:pernyataan\s+)?persetujuan\s+publikasi(?:\s+karya\s+ilmiah|\s+skripsi|\s+tugas\s+akhir|\s+laporan)?(?:\s+untuk\s+kepentingan\s+akademis?)?$/i,
      /^(?:halaman\s+|lembar\s+)?persetujuan\s+publikasi\s+(?:karya\s+ilmiah|skripsi|tugas\s+akhir|laporan)/i,
      /^(?:halaman\s+|lembar\s+)?persetujuan\s+publikasi/i,
      /^persetujuan\s+publikasi/i,
      /^persetujuan\s+unggahan?\s+karya\s+ilmiah/i,
    ],
  },
  {
    key: 'declaration',
    defaultTitle: 'Pernyataan Keaslian',
    category: 'frontmatter',
    priority: 4,
    regexList: [
      /^(?:surat\s+|lembar\s+|halaman\s+)?pernyataan\s+(?:keaslian|orisinalitas|orisionalitas|bebas\s+plagiat|bebas\s+plagiarisme|integritas|otentisitas)(?:\s+skripsi|\s+karya\s+ilmiah|\s+tulisan)?$/i,
      /^pernyataan\s+keaslian\s+skripsi$/i,
      /^statement\s+of\s+(?:originality|authenticity)$/i,
    ],
  },
  {
    key: 'motto',
    defaultTitle: 'Halaman Motto',
    category: 'frontmatter',
    priority: 5,
    regexList: [
      /^(?:halaman\s+|lembar\s+)?motto(?:\s+hidup|\s+dan\s+semboyan)?$/i,
      /^(?:lembar\s+|halaman\s+)?(?:motto|semboyan)$/i,
      /^motto\s*$/i,
    ],
  },
  {
    key: 'dedication',
    defaultTitle: 'Halaman Persembahan',
    category: 'frontmatter',
    priority: 5.2,
    regexList: [
      /^(?:halaman\s+|lembar\s+)?(?:persembahan|dedikasi|dedication)$/i,
      /^kupersembahkan(?:\s+karya\s+ini|\s+skripsi\s+ini)?$/i,
      /^halaman\s+persembahan$/i,
      /^persembahan$/i,
    ],
  },
  {
    key: 'dedication_motto',
    defaultTitle: 'Halaman Persembahan & Motto',
    category: 'frontmatter',
    priority: 5.5,
    regexList: [
      /^(?:halaman\s+|lembar\s+)?(?:motto\s+dan\s+persembahan|persembahan\s+dan\s+motto)$/i,
    ],
  },
  {
    key: 'abstract_id',
    defaultTitle: 'Abstrak',
    category: 'frontmatter',
    priority: 6,
    regexList: [
      /^abstrak(?:\s*\(indonesia\)|\s+bahasa\s+indonesia)?$/i,
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
      /^abstract(?:\s*\(english\)|\s+in\s+english)?$/i,
      /^abstract\s*$/i,
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
      /^daftar\s+tabel(?:\s+dan\s+lampiran)?$/i,
      /^list\s+of\s+tables?$/i,
    ],
  },
  {
    key: 'figure_list',
    defaultTitle: 'Daftar Gambar',
    category: 'frontmatter',
    priority: 11,
    regexList: [
      /^daftar\s+(?:gambar|grafik|bagan|diagram|peta)$/i,
      /^list\s+of\s+(?:figures|illustrations|diagrams|charts)$/i,
    ],
  },
  {
    key: 'appendix_list',
    defaultTitle: 'Daftar Lampiran',
    category: 'frontmatter',
    priority: 12,
    regexList: [
      /^daftar\s+(?:lampiran|singkatan|simbol|notasi|istilah)(?:\s+dan\s+(?:istilah|singkatan|simbol))?$/i,
      /^list\s+of\s+appendi(?:x|ces)$/i,
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
