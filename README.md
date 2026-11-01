# satuklik

Upload sekali, tayang di banyak platform. Login dan data memakai Firebase (Authentication + Firestore). Server Node 18+.

```
public/        situs (index.html, app.js, style.css, config.js)
server/        server.js, store.js (Firestore), platforms.js (upload per platform)
firestore.rules   tolak semua akses langsung dari klien
test.js        tes otomatis (platform tiruan)
```

## Setup Firebase (sekali)
1. Buat project di console.firebase.google.com.
2. Authentication > Sign-in method: aktifkan **Email/Password** dan **Google**.
3. Project settings > Your apps > tambah Web app. Salin `apiKey`, `authDomain`, `projectId`, `appId` ke blok `firebase` di `public/config.js`.
4. Sign-in method > Google: salin **Web client ID** ke `googleClientId` di `public/config.js`.
5. Authentication > Settings > Authorized domains: tambahkan domainmu.
6. Firestore Database: buat database, lalu tempel isi `firestore.rules` di tab Rules.
7. Project settings > Service accounts > Generate new private key. Simpan file JSON di server (bukan di `public/`, jangan di git).

## Jalankan
```
npm install
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
ADMIN_EMAILS=emailmu@gmail.com \
PUBLIC_URL=https://domainmu.com \
DEMO_PAY=1 npm start
```
- `ADMIN_EMAILS`: email admin (harus terverifikasi, mis. login Google). Admin membuat kunci, reset perangkat, dan mencabut kunci di halaman Admin.
- `PUBLIC_URL`: alamat https publik situs. **Wajib** untuk Instagram, Threads, dan Facebook karena platform mengambil video lewat URL. Alamat localhost tidak bisa.
- `DEMO_PAY=1`: beli kunci tanpa bayar (uji coba). Matikan di produksi, sambungkan payment gateway ke `mkKey()` di `server.js`.
- Opsional: `PORT`, `MAX_MB` (default 512), `SECRET_KEY` (hex 64 karakter untuk enkripsi token), `GRAPH_VERSION` (default v23.0, sesuaikan dengan versi Meta terbaru), `YT_PRIVACY` (default public).

## Alur pengguna
1. Masuk (Google atau email) lewat Firebase.
2. Aktifkan kunci. Satu kunci terkunci ke satu perangkat; perangkat lain ditolak.
3. Halaman API: tempel token tiap platform, server mengeceknya ke platform lalu statusnya Terhubung.
4. Dasbor: pilih video, tulis caption, centang platform, klik Posting. Video diunggah ke server, lalu server mengirimnya ke tiap platform dan menampilkan hasil per platform.
5. Kunci direset atau dicabut admin: perangkat lama keluar otomatis (dicek tiap 30 detik, dan server menolak permintaannya).

## Token tiap platform
| Platform | Token | Cara kirim |
|---|---|---|
| YouTube | access token OAuth, scope `youtube.upload` (API key biasa tidak bisa upload) | resumable upload |
| Instagram | token Instagram Login atau token Facebook, akun Business/Creator | Reels lewat `video_url` |
| Facebook | user atau page access token (halaman pertama dipakai) | `file_url` ke `/videos` |
| Threads | token Threads | video lewat `video_url` |
| TikTok | access token OAuth, scope `user.info.basic`, `video.publish` | FILE_UPLOAD (chunk) |

## Penting
- **Belum diuji dengan token asli.** Kode upload mengikuti dokumentasi API resmi dan lulus tes dengan platform tiruan, tapi belum pernah menembak server YouTube, Meta, atau TikTok. Uji satu per satu dengan akun sendiri.
- YouTube, TikTok, dan Instagram bisa meminta audit/review aplikasi. Sebelum lolos, video bisa dipaksa privat atau ditolak.
- Token OAuth biasanya kedaluwarsa. Penyegaran otomatis (refresh token) belum ada; pengguna menempel token baru.
- Firebase belum diuji dengan project asli (adaptor Firestore diuji dengan tiruan). Server menolak mulai bila kredensial Firebase tidak ada.
- Gunakan HTTPS di produksi. Header CSP sudah diatur untuk Firebase Auth REST dan Google Identity.

## Tes
`npm test` (tanpa Firebase asli, memakai `AUTH_MODE=test`; jangan dipakai di produksi).

## Endpoint
`GET /api/me`, `GET /api/license`, `POST /api/license/activate|buy`, `GET /api/connections`, `POST|DELETE /api/connect/:platform`, `POST /api/upload` (video mentah), `POST /api/post`, `GET|POST /api/admin/licenses`, `POST /api/admin/licenses/:id/reset|revoke|restore`. Semua memakai header `Authorization: Bearer <Firebase ID token>`.
