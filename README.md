# MGE Planning Portal

Sistem Sinkronisasi Data Sentral untuk Manajemen Pertambangan Batu Bara (Coal Mining Management).

Portal ini adalah aplikasi SvelteKit mutakhir yang digunakan untuk merekap, melacak, dan mengelola data pertambangan dari berbagai modul secara real-time. Aplikasi ini mencakup fitur penyaringan dinamis (dynamic cascading filters), autentikasi aman, pengunduhan Excel, serta antarmuka (UI) interaktif yang profesional.

## 📦 Tech Stack
- **Framework Frontend & Backend:** SvelteKit 2 (dengan Svelte 5 Runes)
- **Compiler/Bundler:** Vite
- **Styling:** CSS Murni dengan sistem desain kustom (Glassmorphism & Modern Aesthetic)
- **Database:** MySQL (Koneksi langsung via paket `mysql2/promise`)
- **Autentikasi:** JSON Web Token (JWT) + Cookies
- **Library Tambahan:** 
  - `lucide-svelte` (Ikon)
  - `flatpickr` (Pemilihan Tanggal / DatePicker)
  - `xlsx` (Ekspor/Impor format Excel)
  - `date-fns` (Pemrosesan Tanggal)

## 🗂 Modul Tersedia
1. **Modul Coal Hauling & Transit:** Sinkronisasi perpindahan data batu bara (Hauling dari Pit ke ROM, Transit antar fasilitas).
2. **Modul Overburden (OB):** Pelacakan pengupasan tanah pucuk/lapisan penutup batu bara dari beberapa kontraktor.
3. **Modul Fuel (Bahan Bakar):** Pengendalian logistik dan pemakaian bahan bakar harian per unit/vendor.
4. **Modul Management Scorecard (MS):** (Dalam pengembangan lebih lanjut)

## 🚀 Cara Menjalankan Secara Lokal (Local Development)

1. Pastikan **Node.js** (versi 18+) sudah terinstal di komputer.
2. Buka terminal di folder proyek ini dan jalankan instalasi dependensi:
   ```bash
   npm install
   ```
3. Siapkan file `.env`. Buat file baru bernama `.env` di direktori utama, lalu salin struktur dari `.env.example`:
   ```env
   DB_HOST=103.x.x.x
   DB_PORT=3306
   DB_USER=mge_planning
   DB_PASSWORD=secretpassword
   DB_NAME=mge_planning_staging
   
   AUTH_USERNAME=admin
   AUTH_PASSWORD=adminpassword
   JWT_SECRET=your-secret-key-here
   ```
4. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:5173` di browser Anda.

## ☁️ Deployment ke Vercel

Aplikasi ini menggunakan `@sveltejs/adapter-auto`, yang berarti sudah **100% siap** untuk diunggah ke Vercel tanpa perlu konfigurasi khusus.

1. Unggah kode proyek ke GitHub.
2. Buka Vercel (https://vercel.com) dan buat proyek baru (*Add New Project*).
3. Sambungkan repositori GitHub Anda.
4. Di bagian **Environment Variables**, ketik/salin semua kunci dari file `.env` Anda (DB_HOST, JWT_SECRET, dll).
5. Klik **Deploy**. Vercel akan otomatis meng-compile fungsi serverless dan meng-host antarmuka statis Anda.

---
*Didesain dan dikembangkan secara eksklusif untuk MGE Planning.*
