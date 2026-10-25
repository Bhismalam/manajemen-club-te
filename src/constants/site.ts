// Konten website publik yang tidak berasal dari database.
// GANTI semua nilai bertanda "contoh" dengan data klub yang sebenarnya.
// Data dinamis (pelatih, event, prestasi, jumlah atlet) diambil dari database.

export const SITE = {
  name: "Swim & Finswimming Club", // contoh
  shortName: "SFC", // contoh
  tagline: "Klub renang & finswimming untuk atlet muda yang ingin melaju lebih cepat.", // contoh
  city: "Denpasar, Bali", // contoh
  foundedYear: 2018, // contoh

  about: [
    // contoh
    "Kami adalah klub renang dan finswimming yang membina atlet usia sekolah hingga dewasa, dari tahap belajar teknik dasar sampai persiapan kejuaraan daerah dan nasional.",
    "Setiap atlet berlatih dalam kelompok sesuai kemampuan, dengan pelatih bersertifikat yang memantau perkembangan waktu, kehadiran, dan evaluasi secara rutin.",
  ],
  vision:
    "Menjadi klub pembinaan renang dan finswimming yang melahirkan atlet berprestasi dan berkarakter.", // contoh
  missions: [
    // contoh
    "Latihan terstruktur sesuai tahap usia dan kemampuan.",
    "Pemantauan performa berbasis data: time trial, PB, dan hasil lomba.",
    "Membiasakan disiplin, sportivitas, dan kerja sama tim.",
  ],

  programs: [
    // contoh
    {
      slug: "renang-dasar",
      title: "Renang Dasar",
      audience: "Usia 6–10 tahun",
      description:
        "Pengenalan air, pernapasan, dan empat gaya dasar dengan kelompok kecil agar setiap anak mendapat perhatian.",
      schedule: "Selasa & Kamis, 16.00–17.00",
    },
    {
      slug: "renang-prestasi",
      title: "Renang Prestasi",
      audience: "Usia 10–17 tahun",
      description:
        "Latihan teknik lanjutan, endurance, dan sprint untuk persiapan kejuaraan, lengkap dengan time trial berkala.",
      schedule: "Senin–Jumat, 15.30–17.30",
    },
    {
      slug: "finswimming",
      title: "Finswimming",
      audience: "Usia 12 tahun ke atas",
      description:
        "Surface, bi-fins, dan apnea dengan monofin maupun bi-fins, dibimbing pelatih finswimming berpengalaman.",
      schedule: "Senin, Rabu, Jumat, 06.00–07.30",
    },
  ],

  reasons: [
    {
      title: "Pelatih bersertifikat",
      description: "Program latihan disusun pelatih yang berpengalaman membina atlet kejuaraan.",
    },
    {
      title: "Progres yang terukur",
      description:
        "Setiap time trial dan hasil lomba tercatat, sehingga peningkatan waktu terlihat jelas.",
    },
    {
      title: "Kelompok sesuai level",
      description: "Atlet berlatih bersama teman setingkat agar tetap tertantang dan aman.",
    },
    {
      title: "Jalur ke kejuaraan",
      description: "Atlet didampingi dari pendaftaran event hingga evaluasi setelah lomba.",
    },
  ],

  contact: {
    // contoh
    venue: "Kolam Renang Kompyang Sujana",
    address: "Jl. Melati No. 1, Denpasar, Bali",
    mapsUrl: "https://maps.google.com/?q=Kolam+Renang+Kompyang+Sujana+Denpasar",
    whatsapp: "6281234567890", // format internasional tanpa "+"
    phoneDisplay: "0812-3456-7890",
    email: "info@example.com",
    instagram: "swimfinclub",
    officeHours: "Senin–Sabtu, 08.00–17.00 WITA",
  },

  // Foto galeri: taruh file di /public/gallery lalu daftarkan di sini, mis.
  // { src: "/gallery/latihan-pagi.jpg", alt: "Latihan pagi kelompok prestasi" }.
  gallery: [] as { src: string; alt: string }[],
} as const;

export const PUBLIC_NAV = [
  { href: "/", label: "Beranda" },
  { href: "/about", label: "Tentang" },
  { href: "/programs", label: "Program" },
  { href: "/coaches", label: "Pelatih" },
  { href: "/achievements", label: "Prestasi" },
  { href: "/events", label: "Event" },
  { href: "/gallery", label: "Galeri" },
  { href: "/contact", label: "Kontak" },
] as const;

export function whatsappUrl(message = "Halo, saya ingin bertanya tentang program latihan.") {
  return `https://wa.me/${SITE.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}
