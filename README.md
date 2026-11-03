# satuklik

Frontend statis GitHub Pages, backend Node.js di Vercel, Firebase Authentication untuk login, dan Firestore untuk data aplikasi.

## Model BYO API
Setiap pengguna menghubungkan credential/token OAuth dari akun dan aplikasi developer platform miliknya sendiri. satuklik tidak menyediakan atau membayar API, kuota, review aplikasi, biaya, atau rate limit pihak ketiga. YouTube upload membutuhkan OAuth access token dengan scope upload; API key saja tidak dapat upload.

Token koneksi dienkripsi AES-256-GCM di server dan disimpan pada subcollection privat `users/{uid}/private/connections` milik akun Firebase tersebut. Firestore Rules melarang akses klien langsung ke data privat; backend menggunakan Firebase Admin. Jangan menaruh credential di repository, kode frontend, atau chat.

Adapter API yang ada: YouTube, TikTok, Instagram, Facebook, Threads. Ketersediaan izin bergantung pada akun, aplikasi developer, review, wilayah, dan aturan platform. Adapter belum diuji end-to-end dengan token produksi.

## Status upload: belum siap untuk Vercel
Posting video saat ini masih mengunggah file ke `/api/upload` lalu posting dilakukan oleh `/api/post`. Vercel serverless tidak menjamin file disk atau memori antar-request tetap tersedia, sehingga cara ini tidak andal. Ini juga berarti upload langsung dari browser ke platform belum diimplementasikan. Jangan menganggap posting lintas platform sudah siap produksi. Langkah berikutnya: implementasikan alur browser langsung untuk API yang mendukung CORS dan upload berbasis sesi, menggunakan credential pengguna secara aman; untuk platform yang mewajibkan video URL atau memblokir CORS, tampilkan batasan alih-alih mengirim file melalui backend.

## Sisa setup
1. Buat/deploy backend dengan mengimpor repo ini di https://vercel.com/new .
2. Masukkan hanya di Vercel Environment Variables: `FIREBASE_SERVICE_ACCOUNT_JSON`, `SECRET_KEY` (64 karakter hex acak), `ADMIN_EMAILS` (misalnya `xiaomia5new@gmail.com`), dan `PUBLIC_URL`. Service account: https://console.firebase.google.com/project/satuklik-e0ed2/settings/serviceaccounts/adminsdk . Jangan kirim service-account JSON lewat chat atau commit ke repo.
3. Buat database Firestore di https://console.firebase.google.com/project/satuklik-e0ed2/firestore dan terbitkan rules dari file `firestore.rules`.
4. Setelah URL Vercel terbit, set `CFG.api` di `config.js` ke URL tersebut lalu deploy ulang GitHub Pages.

Backend login, lisensi, admin, dan penyimpanan credential/data menggunakan Firestore. Penyimpanan video persisten tidak disiapkan; upload lintas platform tetap perlu penyelesaian perubahan dan tes terpisah.
