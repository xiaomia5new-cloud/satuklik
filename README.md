# satuklik

Frontend statis GitHub Pages, backend Node.js di Vercel, Firebase Authentication untuk login/verifikasi ID token, dan Cloudflare D1 REST API untuk data aplikasi per UID Firebase.

## Model BYO API
Setiap pengguna menghubungkan credential/token OAuth dari akun dan aplikasi developer platform miliknya sendiri. satuklik tidak menyediakan atau membayar API, kuota, review aplikasi, biaya, atau rate limit pihak ketiga. YouTube upload membutuhkan OAuth access token dengan scope upload; API key saja tidak dapat upload.

Token koneksi dienkripsi AES-256-GCM di server sebelum disimpan di tabel D1 `satuklik_data`, dengan collection `conns` dan item key UID Firebase. Browser tidak pernah membaca D1 langsung; backend memverifikasi ID token Firebase dan hanya mengakses record UID itu. Jangan menaruh credential atau Cloudflare API token di repository, kode frontend, atau chat.

Adapter API yang ada: YouTube, TikTok, Instagram, Facebook, Threads. Ketersediaan izin bergantung pada akun, aplikasi developer, review, wilayah, dan aturan platform. Adapter belum diuji end-to-end dengan token produksi.

## Upload video tanpa penyimpanan backend
Dashboard mengirim video YouTube langsung dari browser ke Google resumable upload session; Vercel hanya membuat sesi kecil memakai token yang didekripsi sementara di memori. Backend tidak menerima atau menyimpan byte video. Upload server `/api/upload` dan posting lama `/api/post` dinonaktifkan pada production. Alur YouTube butuh OAuth access token dengan `youtube.upload`; validitas CORS browser/Google dan kredensial OAuth harus dites pada deployment/aplikasi nyata.

Instagram Reels, Facebook, dan Threads pada adapter ini mengandalkan `video_url` yang dapat diambil platform dari internet; TikTok adapter memakai FILE_UPLOAD ke URL upload. Keduanya belum dijalankan dari browser karena endpoint/izin/CORS upload perlu verifikasi dan integrasi aman. Tanpa dukungan resmi browser-to-platform, fallback adalah proxy backend atau URL publik sementara—yang berarti byte video diproses/di-host di luar browser—maka saat ini tidak diaktifkan. Hanya YouTube yang dipaparkan UI sebagai direct browser upload.

## Setup Cloudflare D1 dan Vercel
1. Di Cloudflare Dashboard → **Workers & Pages → D1 SQL Database → Create database**, buat D1 database bernama `satuklik`. Salin **Database ID** dari detail database; backend membuat tabel `satuklik_data` otomatis saat request pertama.
2. Di Cloudflare → **My Profile → API Tokens → Create Token**, buat custom token dengan izin **Account / D1 / Edit** hanya untuk akun yang memiliki database tersebut. Salin token sekali saja; jangan commit atau bagikan.
3. Di Vercel project → **Settings → Environment Variables**, tambahkan untuk Production (dan Preview jika perlu):
   - `CLOUDFLARE_ACCOUNT_ID` = Account ID Cloudflare (Overview akun).
   - `CLOUDFLARE_D1_DATABASE_ID` = Database ID dari D1.
   - `CLOUDFLARE_API_TOKEN` = token terbatas D1 Edit.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON service account Firebase Admin dari Firebase Console project `satuklik-e0ed2` (tetap untuk verifikasi Firebase ID token dan revoke sesi).
   - `SECRET_KEY` = tepat 64 karakter hex acak untuk AES-256-GCM (jaga tetap sama di setiap deployment; mengubahnya membuat credential tersimpan tidak dapat didekripsi).
   - `ADMIN_EMAILS` = email admin, contoh `xiaomia5new@gmail.com`.
   - `FRONTEND_ORIGIN` = `https://xiaomia5new-cloud.github.io` (origin, tanpa `/satuklik/`).
   - `MAX_MB` opsional, batas ukuran berkas upload.
4. Deploy/redeploy Vercel. Backend tetap Node di Vercel; deploy tidak memerlukan runtime D1 binding karena akses dilakukan melalui Cloudflare REST API. `PUBLIC_URL` tidak diperlukan untuk alur YouTube dan sebaiknya kosong kecuali integrasi URL-platform lama sengaja dipakai dalam pengembangan.
5. `config.js` harus mengarahkan `api` ke base URL backend Vercel, misalnya `https://<nama-project>.vercel.app` (tanpa trailing slash), lalu deploy ulang GitHub Pages. `firebase` tetap menunjuk proyek Firebase yang sama. Tambahkan origin `https://xiaomia5new-cloud.github.io` pada Firebase Authentication → Authorized domains dan Google OAuth client bila belum ada.
6. Buat ulang koneksi YouTube dari halaman API dengan OAuth token pengguna yang memiliki scope upload. Data Firestore lama tidak dimigrasikan otomatis ke D1; rencanakan migrasi eksplisit bila ada data/credential produksi yang harus dipertahankan. Kunci lisensi contoh juga perlu diterbitkan ulang jika data lama penting.

## Batasan operasional
D1 REST statement dipanggil melalui Cloudflare API token server-side; token itu tidak boleh diletakkan di GitHub Pages. Cache dan file lokal tidak dipakai sebagai store produksi. Update lisensi memakai conditional update untuk mencegah dua perangkat mengklaim kunci secara bersamaan. Jalankan `npm test` untuk tes lokal. Adapter platform dan CORS browser tetap memerlukan pengujian dengan credential serta akun/platform nyata.

Backend login tetap memakai Firebase Authentication; lisensi, koneksi dan credential tersimpan di Cloudflare D1. Jangan hapus Firestore dulu jika ingin mempertahankan data lama, tetapi aplikasi baru tidak lagi membaca koleksi Firestore. Video YouTube dikirim langsung dari browser ke Google, tanpa melewati penyimpanan backend; platform lainnya belum tersedia untuk direct browser upload.
