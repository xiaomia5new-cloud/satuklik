# satuklik

Frontend statis di GitHub Pages; API Node.js serverless di Vercel; autentikasi dan data aplikasi memakai Firebase / Firestore.

## Deploy backend ke Vercel
1. Impor repo `xiaomia5new-cloud/satuklik` melalui https://vercel.com/new dan deploy dari branch `main`.
2. Di Project Settings → Environment Variables, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: isi seluruh JSON service account Firebase Admin SDK dari project `satuklik-e0ed2`.
   - `ADMIN_EMAILS`: email admin terverifikasi, mis. `xiaomia5new@gmail.com`.
   - `SECRET_KEY`: string acak 64 karakter hex. Simpan tetap; menggantinya membuat token platform yang tersimpan tidak dapat didekripsi.
   - `PUBLIC_URL`: URL production Vercel yang diberikan setelah deployment.
3. Redeploy setelah mengisi environment variables. Tes `https://<URL-Vercel>/api/health`; seharusnya membalas `{"ok":true}`.
4. Kirim URL production itu agar nilai `api` pada `config.js` GitHub Pages dapat diisi.

**Rahasia:** jangan kirim JSON service account atau `SECRET_KEY` lewat chat, GitHub, atau frontend. Simpan hanya sebagai Environment Variables privat di Vercel. Ambil service-account JSON dari https://console.firebase.google.com/project/satuklik-e0ed2/settings/serviceaccounts/adminsdk.

## Firebase
Buat Firestore database di Firebase Console dan terapkan `firestore.rules`. Admin SDK backend memverifikasi Firebase ID token dan menyimpan pengguna, lisensi, serta koneksi platform di Firestore. Google sign-in dan domain GitHub Pages harus aktif pada Firebase Authentication.

## Batasan Vercel
Vercel Functions tidak menyediakan disk persisten dan setiap invocation dapat berjalan pada instance berbeda. Karena alur posting saat ini mengunggah video ke disk lokal sementara, **upload/posting video belum dapat diandalkan di Vercel**. Agar fitur posting video berfungsi, upload perlu dipindahkan ke Firebase Storage atau object storage persisten dan endpoint media memakai signed URL. Data Firestore tidak terpengaruh.

Pembelian berbayar belum tersambung. Jangan aktifkan `DEMO_PAY` di produksi. Posting per platform belum diverifikasi dengan token asli.
