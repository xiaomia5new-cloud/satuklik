# satuklik

Website statis di GitHub Pages, Node.js API terpisah, Authentication + data di Firebase / Firestore.

## Backend hosting (Render)
1. Buat Firestore database pada project Firebase dan pastikan aturan `firestore.rules` tetap menolak akses langsung dari klien.
2. Hubungkan repository ini ke Render sebagai Web Service dari `https://render.com/blueprint/new`; Render membaca `render.yaml`.
3. Isi environment variables di Render (bukan di GitHub):
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: seluruh JSON service account Firebase Admin SDK (project `satuklik-e0ed2`).
   - `ADMIN_EMAILS`: email admin terverifikasi, mis. `xiaomia5new@gmail.com`.
   - `PUBLIC_URL`: URL service Render, mis. `https://satuklik-api.onrender.com` (pakai URL yang benar-benar diberikan Render).
   - `SECRET_KEY` dibuat otomatis oleh blueprint; jangan diubah setelah pengguna menyimpan token platform terenkripsi.
4. Setelah service berstatus live, tes `https://<alamat-service>/api/health`; hasil yang diharapkan `{"ok":true}`.
5. Masukkan alamat service tersebut ke `api` di `config.js`, commit perubahan itu, lalu tunggu GitHub Pages terbit ulang.

Jangan tempel kredensial service account di chat, repo, atau frontend. Ambil JSON dari Firebase Console > Project settings > Service accounts > Generate new private key dan simpan hanya sebagai environment variable privat di Render.

## Setup Firebase
- Authentication: aktifkan Email/Password dan Google; tambahkan domain GitHub Pages ke Authorized domains.
- Firestore: buat database di lokasi pilihan dan terapkan `firestore.rules`.
- Backend memakai Admin SDK, memverifikasi Firebase ID token yang diterima, dan menyimpan lisensi, pengguna, serta koneksi platform di Firestore.

## Penting
- Upload video tetap sementara di disk service selama proses posting (bukan Firestore/Storage); hapus setelah selesai. Free hosting dapat sleep/berbatasan kapasitas, dan unggahan besar mungkin perlu batas lebih rendah atau Storage.
- Lisensi, koneksi platform, dan token terenkripsi tersimpan di Firestore. Token platform dienkripsi memakai `SECRET_KEY`.
- Pembelian berbayar belum tersambung; jangan aktifkan `DEMO_PAY` di produksi.
- Integrasi posting belum diuji dengan token asli; uji per platform dengan akun sendiri.
- `AUTH_MODE=test` hanya untuk tes lokal, tidak untuk produksi.

## Tes lokal
`npm install && npm test`
