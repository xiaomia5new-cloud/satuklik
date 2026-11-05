const $=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
let UID=null,OWN=false,NAME='',busy=0,nav=0,CONN={},sel=new Set();
const P=['YouTube','Instagram','TikTok','Facebook','Threads'];P.forEach(p=>sel.add(p));
const DEV=(()=>{try{let d=localStorage.getItem('sk_dev');if(!d){d=crypto.randomUUID();localStorage.setItem('sk_dev',d)}return d}catch(e){return'tmp-'+Math.random().toString(36).slice(2)}})();
const say=(id,t,ok)=>{const e=$(id);e.textContent=t;e.style.color=ok?'#16a34a':'#dc2626'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FBC=CFG.firebase||{},FK=FBC.apiKey,IDT='https://identitytoolkit.googleapis.com/v1/';
const FBERR={EMAIL_EXISTS:'Email sudah terdaftar.',INVALID_LOGIN_CREDENTIALS:'Email atau password salah.',INVALID_PASSWORD:'Email atau password salah.',EMAIL_NOT_FOUND:'Email atau password salah.',WEAK_PASSWORD:'Password terlalu lemah (min. 6 karakter).',TOO_MANY_ATTEMPTS_TRY_LATER:'Terlalu banyak percobaan. Coba lagi nanti.',INVALID_EMAIL:'Email tidak valid.',USER_DISABLED:'Akun dinonaktifkan.'};
let AS=null;try{AS=JSON.parse(localStorage.getItem('sk_auth')||'null')}catch(e){}
const saveAS=a=>{AS=a;try{a?localStorage.setItem('sk_auth',JSON.stringify(a)):localStorage.removeItem('sk_auth')}catch(e){}};
const setAuth=d=>saveAS({idToken:d.idToken||d.id_token,refreshToken:d.refreshToken||d.refresh_token,exp:Date.now()+((+(d.expiresIn||d.expires_in))-60)*1000});
async function fbq(ep,body){if(!FK)throw new Error('Firebase belum diatur: isi apiKey di config.js.');const r=await fetch(IDT+ep+'?key='+FK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(FBERR[String((d.error&&d.error.message)||'').split(' ')[0]]||'Gagal. Coba lagi.');return d}
async function idToken(){if(!AS)return null;if(Date.now()>AS.exp){try{const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+FK,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(AS.refreshToken)});const d=await r.json();if(!r.ok)throw 0;setAuth(d)}catch(e){saveAS(null);return null}}return AS.idToken}
async function rq(path,body,method){
 const t=await idToken(),r=await fetch((CFG.api||'')+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json','X-Device':DEV,...(t?{Authorization:'Bearer '+t}:{})},body:body?JSON.stringify(body):undefined}),d=await r.json().catch(()=>({}));
 if(UID&&path!=='/api/me'&&(r.status===401||(r.status===403&&(d.code==='perangkat'||d.code==='invalid')))){saveAS(null);autoOut(r.status===401?'Sesi berakhir. Silakan masuk lagi.':(MSG[d.code]||'')+' Kamu keluar otomatis.')}
 if(!r.ok)throw new Error(d.error||'Gagal ('+r.status+')');return d}
async function browserYouTube(f,caption){
 const start=await rq('/api/upload/youtube/init',{fileName:f.name,size:f.size,caption});
 await new Promise((ok,no)=>{const x=new XMLHttpRequest();x.open('PUT',start.location);x.setRequestHeader('Content-Type',f.type||'video/mp4');x.setRequestHeader('Content-Range','bytes 0-'+(f.size-1)+'/'+f.size);x.upload.onprogress=e=>{if(e.lengthComputable){const k=Math.round(e.loaded/e.total*100);$('#up').textContent=k+'%';$('#ub').style.width=k+'%'}};x.onload=()=>x.status>=200&&x.status<300?ok():no(new Error('YouTube menolak data video (HTTP '+x.status+'). Periksa OAuth scope, izin upload, dan CORS aplikasi Google.'));x.onerror=()=>no(new Error('Upload ke YouTube terputus atau browser diblokir CORS. Pastikan OAuth client dan origin GitHub Pages diizinkan.'));x.onabort=()=>no(new Error('Upload dibatalkan.'));x.send(f)});
 return rq('/api/upload/youtube/complete',{id:start.id})
}
const MSG={perangkat:'Kunci ini sudah dipakai di perangkat lain. Satu kunci hanya untuk satu perangkat — minta admin untuk reset.',invalid:'Kunci tidak valid atau sudah dicabut.'};

// Konten halaman
const F=[['Satu klik, semua akun','Unggah video sekali, kirim ke semua platform yang sudah terhubung.'],['Kunci per perangkat','Satu kunci hanya aktif di satu perangkat. Perangkat lain otomatis ditolak.'],['API dan kuota milikmu','Hubungkan credential dari akun dan aplikasi developer milikmu; kuota dan biaya platform bukan tanggungan satuklik.'],['Caption bersama','Tulis keterangan sekali, pakai untuk semua platform.'],['Pantau progres','Lihat status unggahan tiap akun secara langsung.'],['Mudah ditambah','Platform baru cukup ditambah lewat satu konfigurasi.']];
const ST=[['Beli kunci','Pilih lisensi dan dapatkan kunci unik.'],['Hubungkan API','Tempel API key tiap platform di halaman API.'],['Posting','Pilih video, centang platform, lalu klik sekali.']];
const FQ=[['Apakah satu kunci bisa dipakai di banyak perangkat?','Tidak. Kunci terkunci ke perangkat pertama yang mengaktifkannya. Pindah perangkat? Minta admin untuk reset.'],['Platform apa saja yang didukung?','YouTube, Instagram, TikTok, Facebook, dan Threads. Platform lain bisa ditambahkan.'],['Apakah API key saya aman?','Key disimpan terpisah di halaman API dan tidak ditampilkan ulang. Di versi produksi, key disimpan di server.'],['Bagaimana kalau kunci hilang?','Hubungi admin lewat halaman Kontak untuk bantuan.'],['Kenapa perlu login?','Login memastikan kunci dan koneksi API terikat ke akunmu.'],['Apakah ada biaya bulanan atau tahunan?','Tidak. Kamu membeli 1 kunci sekali bayar.'],['Kapan saya keluar otomatis?','Jika admin mereset atau mencabut kunci, perangkat lama keluar otomatis. Kunci yang sudah aktif di satu perangkat tidak bisa dipakai di perangkat lain.']];
const DR=['Catatan','Draf contoh. Sesuaikan dan tinjau dengan ahli hukum sebelum rilis.'];
const EMAIL=CFG.email,HOURS=CFG.hours;
const IC={bolt:'M13 2 4 14h7l-1 8 9-12h-7z',key:'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',chart:'M3 3v18h18M7 15l4-4 3 3 5-6',layers:'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',device:'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 18h.01',clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',mail:'M4 4h16v16H4zM4 4l8 9 8-9',file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'};
const ico=n=>'<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+IC[n]+'"/></svg></span>';
const gc=a=>'<div class="g3">'+a.map((x,i)=>'<div class="cd rv" style="--i:'+(i%3)+'">'+ico(x[0])+'<b>'+x[1]+'</b><p>'+x[2]+'</p></div>').join('')+'</div>';
const gs=a=>'<div class="g3">'+a.map((x,i)=>'<div class="cd rv" style="--i:'+(i%3)+'"><span class="no">'+(i+1)+'</span><b>'+x[0]+'</b><p>'+x[1]+'</p></div>').join('')+'</div>';
const gt=a=>'<div class="tbl rv">'+a.map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')+'</div>';
const gx=a=>'<div class="prose rv">'+a.map(x=>'<h3>'+x[0]+'</h3><p>'+x[1]+'</p>').join('')+'</div>';
const SEC=x=>'<div class="sec'+(x.alt?' alt':'')+'"><div class="wrap">'+(x.h?'<h2 class="rv">'+x.h+'</h2>':'')+(x.p?'<p class="lead2 rv">'+x.p+'</p>':'')+(x.c?gc(x.c):'')+(x.s?gs(x.s):'')+(x.t?gt(x.t):'')+(x.x?gx(x.x):'')+(x.q?'<div class="rv">'+x.q.map(faq).join('')+'</div>':'')+(x.l?'<ul class="ckl rv">'+x.l.map(i=>'<li>'+i+'</li>').join('')+'</ul>':'')+'</div></div>';
const CTA=(h,p)=>'<div class="sec"><div class="wrap"><div class="cta gr rv"><h2>'+h+'</h2><p>'+p+'</p><a class="b" href="#harga">Beli kunci</a><a class="b" href="#kontak">Hubungi kami</a></div></div></div>';
const BAND=(t,l)=>'<div class="band"><div class="wrap"><p class="crumb"><a href="#beranda">Beranda</a> / '+t+'</p><h1>'+t+'</h1><p class="lead2">'+l+'</p></div></div>';
const FI=[['layers','Unggah sekali','Satu video dan satu caption untuk semua platform tujuan.'],['link','Banyak platform','YouTube, Instagram, TikTok, Facebook, dan Threads dari satu dasbor.'],['key','Kunci per perangkat','Satu kunci aktif di satu perangkat. Perangkat lain otomatis ditolak.'],['chart','Progres terpantau','Status unggahan tiap akun terlihat langsung selama proses.'],['shield','Koneksi API privat','Token diisi di halaman terpisah dan tidak ditampilkan ulang.'],['clock','Hemat waktu','Tidak perlu membuka tiap aplikasi dan mengunggah berulang.']];
const ST4=[['Beli kunci','Dapatkan 1 kunci sekali bayar.'],['Hubungkan API','Tempel token tiap platform di halaman API.'],['Siapkan unggahan','Pilih video dan tulis caption.'],['Posting','Pilih platform lalu klik sekali.']];
const SC=[['device','Satu kunci, satu perangkat','Kunci terkunci ke perangkat pertama yang mengaktifkannya.'],['clock','Keluar otomatis','Jika kunci direset atau dicabut, perangkat lama keluar sendiri.'],['lock','Token terenkripsi','Token platform disimpan terenkripsi di server dan tidak ditampilkan ulang.'],['key','Kunci disimpan sebagai hash','Kunci lisensi disimpan sebagai hash, bukan teks asli.'],['shield','Perlindungan akses','Batas percobaan masuk, cookie sesi HttpOnly, dan pemeriksaan asal permintaan.'],['file','Kebijakan jelas','Privasi dan syarat penggunaan tersedia dan mudah dibaca.']];
const S={
fitur:{t:'Fitur',l:'Semua yang dibutuhkan untuk mengunggah ke banyak platform dari satu tempat.',s:[{h:'Fitur utama',c:FI},{alt:1,h:'Alur kerja',p:'Dari pembelian sampai tayang, empat langkah.',s:ST4},{h:'Spesifikasi',t:[['Platform','YouTube, Instagram, TikTok, Facebook, Threads'],['Lisensi','1 kunci untuk 1 perangkat'],['Pembayaran','Sekali bayar, tanpa langganan'],['Akses','Wajib login'],['Penyimpanan token','Terenkripsi di server'],['Dukungan',HOURS]]},{alt:1,h:'Pertanyaan tentang fitur',q:[0,1,2].map(i=>FQ[i])}]},
keamanan:{t:'Keamanan',l:'Cara satuklik menjaga kunci, akun, dan koneksi platform kamu.',s:[{h:'Prinsip keamanan',c:SC},{alt:1,h:'Praktik yang diterapkan',t:[['Kata sandi','Di-hash dengan scrypt'],['Sesi','Cookie HttpOnly dan SameSite'],['Token platform','Enkripsi AES-256-GCM'],['Header keamanan','CSP, X-Frame-Options, nosniff'],['Pembatasan','Batas percobaan masuk, aktivasi, dan koneksi']]},{h:'Tanggung jawab pengguna',l:['Akses situs hanya lewat HTTPS.','Jaga kerahasiaan kunci dan token.','Putuskan koneksi API di halaman API bila tidak dipakai.']},{alt:1,h:'Laporkan masalah keamanan',p:'Menemukan celah? Kirim detailnya ke <a href="mailto:'+EMAIL+'">'+EMAIL+'</a>.'}]},
panduan:{t:'Panduan',l:'Langkah dari pembelian kunci sampai posting pertama.',s:[{h:'Mulai cepat',s:[['Beli dan aktifkan kunci','Beli 1 kunci, masuk, lalu aktifkan di perangkat yang akan dipakai.'],['Siapkan token platform','Pemilik situs mendaftarkan aplikasi developer; kamu memakai access token OAuth dari aplikasi itu.'],['Hubungkan di halaman API','Tempel token lalu klik Hubungkan. Status berubah menjadi Terhubung.'],['Posting','Di Dasbor pilih video, tulis caption, centang platform, lalu klik Posting.']]},{alt:1,h:'Token tiap platform',t:[['YouTube','Access token OAuth (scope youtube.upload). API key biasa tidak bisa upload.'],['Instagram','Token Instagram Login atau token Facebook, akun Business atau Creator.'],['TikTok','Access token OAuth (scope user.info.basic dan video.publish).'],['Facebook','User atau page access token.'],['Threads','Token Threads.']]},{h:'Pemecahan masalah',t:[['Token ditolak','Periksa jenis dan masa berlaku token.'],['Kunci dipakai di perangkat lain','Minta admin mereset kunci.'],['Video tidak tayang publik','Aplikasi platform mungkin belum diaudit atau direview.']]},{alt:1,h:'Masih perlu bantuan?',p:'Hubungi kami di <a href="mailto:'+EMAIL+'">'+EMAIL+'</a>, '+HOURS+'.'}]},
tentang:{t:'Tentang satuklik',l:'Alat untuk kreator dan tim yang ingin mengunggah sekali dan tayang di banyak platform.',s:[{h:'Apa yang kami bangun',p:'satuklik membantu mengunggah satu video ke banyak platform sosial dari satu dasbor, supaya waktu kerja tidak habis untuk pekerjaan berulang.'},{alt:1,h:'Prinsip produk',c:[['bolt','Sederhana','Satu unggahan, satu klik, tanpa langkah yang tidak perlu.'],['shield','Aman','Kunci per perangkat dan token terenkripsi.'],['file','Transparan','Harga sekali bayar dan kebijakan yang jelas.']]},{h:'Model lisensi',l:['Beli 1 kunci, sekali bayar.','Tanpa langganan bulanan atau tahunan.','1 kunci untuk 1 perangkat.']}]},
kontak:{t:'Kontak',l:'Bantuan untuk pembelian, aktivasi kunci, dan kendala teknis.',s:[{h:'Hubungi kami',p:'Kirim email ke <a href="mailto:'+EMAIL+'">'+EMAIL+'</a>.',c:[['mail','Email',EMAIL],['clock','Jam layanan',HOURS],['device','Reset perangkat','Sebutkan akun kamu di email untuk meminta reset kunci.']]},{alt:1,h:'Topik bantuan',l:['Pembelian dan kunci','Aktivasi dan perangkat','Koneksi API platform','Privasi dan data']}]},
faq:{t:'Pertanyaan umum',l:'Jawaban cepat seputar lisensi, harga, dan keamanan.',s:[{h:'Lisensi dan harga',q:[0,5,3,6].map(i=>FQ[i])},{alt:1,h:'Platform dan akun',q:[1,2,4].map(i=>FQ[i])}]},
privasi:{t:'Kebijakan Privasi',l:'Draf contoh. Sesuaikan dan tinjau dengan ahli hukum sebelum rilis.',nc:1,s:[{x:[['1. Data yang dikumpulkan','Akun (email), kunci lisensi dalam bentuk hash, pengenal acak perangkat, dan status koneksi platform.'],['2. Penggunaan data','Membuat akun, memverifikasi lisensi, membatasi satu kunci ke satu perangkat, dan menghubungkan platform pilihanmu.'],['3. API key dan token','Disimpan terenkripsi di server, hanya dipakai untuk platform yang kamu hubungkan, dan tidak ditampilkan ulang.'],['4. Pembagian data','Saat memposting, video dan caption dikirim ke platform yang kamu pilih.'],['5. Keamanan','Data dilindungi dengan praktik yang dijelaskan di halaman Keamanan.'],['6. Hak kamu','Kamu dapat memutus koneksi API kapan saja dan meminta penghapusan data lewat halaman Kontak.'],['7. Perubahan kebijakan','Kebijakan dapat diperbarui sewaktu-waktu.'],['8. Kontak','Pertanyaan tentang privasi: '+EMAIL+'.']]}]},
syarat:{t:'Syarat dan Ketentuan',l:'Draf contoh. Sesuaikan dan tinjau dengan ahli hukum sebelum rilis.',nc:1,s:[{x:[['1. Lisensi','Satu kunci berlaku untuk satu perangkat dan tidak boleh dibagikan.'],['2. Pembayaran','Pembelian 1 kunci sekali bayar, tanpa langganan bulanan atau tahunan. Kunci dikirim setelah pembayaran lunas.'],['3. Penggunaan wajar','Kamu bertanggung jawab atas konten dan akun sosial media yang kamu hubungkan.'],['4. Aturan platform','Kamu wajib mematuhi ketentuan tiap platform tujuan.'],['5. Pencabutan','Kunci dapat dicabut bila melanggar syarat; perangkat yang terkait keluar otomatis.'],['6. Perubahan','Syarat dapat diperbarui sewaktu-waktu.']]}]}};
const cards=a=>a.map(x=>'<div class="cd"><b>'+x[0]+'</b><p>'+x[1]+'</p></div>').join(''),faq=x=>'<details><summary>'+x[0]+'</summary><p>'+x[1]+'</p></details>';
function doc(r){const p=S[r];$('#dc').innerHTML=BAND(p.t,p.l)+p.s.map(SEC).join('')+(p.nc?'':CTA('Siap mulai?','Beli 1 kunci sekali bayar dan aktifkan di perangkatmu.'))}
// Beranda: kata berganti + ikon + warna panel
const I={yt:'<svg viewBox="0 0 24 24"><path d="M9 7.5v9l8-4.5z" fill="#fff"/></svg>',ig:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="4.5"/><circle cx="12" cy="12" r="3.2"/><circle cx="16.3" cy="7.7" r=".8" fill="#fff" stroke="none"/></svg>',tt:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="9" cy="17" r="3" fill="#fff" stroke="none"/><path d="M12 17V5c.9 2.4 2.8 3.7 5.5 3.7"/></svg>',fb:'<svg viewBox="0 0 24 24"><path d="M13.2 20v-7h2.3l.4-2.7h-2.7V8.6c0-.8.3-1.3 1.4-1.3H16V5c-.3 0-1.1-.1-2-.1-2.1 0-3.4 1.2-3.4 3.4v2H8.2V13h2.4v7z" fill="#fff"/></svg>'};
const W=[['YouTube','#F2772F','#F8DCC7','#F9CBA9','#F99654','yt'],['Instagram','#C564C4','#F0E4E6','#ECD6E2','#DE96C8','ig'],['TikTok','#3FB874','#E9EBE0','#DFE9D4','#96CE96','tt'],['Facebook','#E9C22E','#F2ECDF','#F4EBC6','#F6DE68','fb']];
let wi=0;const cyc=$('#cyc'),pn=$('#panel');
function paint(){const w=W[wi];pn.style.setProperty('--b1',w[2]);pn.style.setProperty('--b2',w[3]);pn.style.setProperty('--g',w[4]);cyc.innerHTML='<span class="ic" style="--t:'+w[1]+'">'+I[w[5]]+'</span>'+w[0]}
paint();
if(!matchMedia('(prefers-reduced-motion:reduce)').matches)setInterval(async()=>{
 if(document.hidden||$('[data-p="beranda"]').hidden)return;
 await cyc.animate({opacity:[1,0],transform:['none','translateY(-.16em)'],filter:['blur(0)','blur(8px)']},{duration:420,easing:'ease-in',fill:'forwards'}).finished;
 wi=(wi+1)%W.length;paint();
 cyc.animate({opacity:[0,1],transform:['translateY(.32em)','none'],filter:['blur(10px)','blur(0)']},{duration:500,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'})},1750);

// ===== Beranda: bagian-bagian halaman =====
const VP=[['layers','Satu unggahan','Video dan caption sekali, tayang di banyak platform.'],['shield','Aman per perangkat','Satu kunci hanya untuk satu perangkat.'],['clock','Sekali bayar','Tanpa langganan bulanan atau tahunan.']];
const PHONE='<div class="stage rv"><div class="ph"><div class="scr"><b>Postingan Baru</b><i class="vd"></i>'+P.map((p,i)=>'<div class="pr"><span>'+p+'</span><s style="--d:'+(i*.3)+'s"></s></div>').join('')+'<u>Posting ke 5 Akun</u></div></div></div>';
$('#more').innerHTML=
 SEC({h:'Satu alur kerja untuk semua platform',p:'satuklik menghubungkan akun sosial kamu dan memposting dari satu dasbor.',c:VP})
+SEC({alt:1,h:'Fitur',p:'Dibuat untuk kreator dan tim yang bekerja cepat.',c:FI})
+'<div class="sec"><div class="wrap sh"><div><h2 class="rv">Lihat cara kerjanya</h2><p class="lead2 rv">Pilih video, tulis caption sekali, centang platform, lalu klik. Progres tiap akun terlihat langsung.</p><a class="b p rv" href="#fitur">Semua fitur</a></div>'+PHONE+'</div></div>'
+SEC({alt:1,h:'Keamanan yang dipikirkan sejak awal',p:'Kunci per perangkat, token terenkripsi, dan keluar otomatis saat kunci dipindah atau dicabut.',c:SC.slice(0,3)})
+'<div class="sec"><div class="wrap"><div class="card pricebox rv"><div><h2>Harga</h2><p class="big">Rp 149.000 <small>sekali bayar</small></p></div><div><ul class="ckl"><li>Beli 1 kunci, bukan langganan</li><li>Aktif di 1 perangkat</li><li>Semua platform yang didukung</li></ul><a class="b p" href="#harga">Lihat harga</a></div></div></div></div>'
+SEC({alt:1,h:'Pertanyaan umum',q:[0,1,2,5].map(i=>FQ[i])})
+CTA('Mulai posting dalam satu klik','Beli 1 kunci sekali bayar dan aktifkan di perangkatmu.');
$('#hx').innerHTML=
 SEC({alt:1,h:'Yang kamu dapatkan',c:[['key','1 kunci lisensi','Sekali bayar, tanpa langganan bulanan atau tahunan.'],['device','1 perangkat','Kunci aktif di satu perangkat. Perangkat lain otomatis ditolak.'],['link','Semua platform','YouTube, Instagram, TikTok, Facebook, dan Threads.']]})
+SEC({h:'Cara pembelian',s:[['Beli kunci','Klik beli dan selesaikan pembayaran.'],['Terima kunci','Kunci tampil sekali, simpan baik-baik.'],['Aktifkan','Masuk, buka Dasbor, lalu aktifkan di perangkatmu.']]})
+SEC({alt:1,h:'Sekali bayar, bukan langganan',t:[['Biaya','Sekali bayar, tanpa tagihan bulanan atau tahunan'],['Perpanjangan','Tanpa biaya perpanjangan'],['Perangkat','1 kunci untuk 1 perangkat'],['Pindah perangkat','Lewat reset oleh admin']]})
+SEC({h:'Pertanyaan seputar harga',q:[5,0,3,6].map(i=>FQ[i])})
+CTA('Siap mulai?','Beli 1 kunci sekali bayar dan aktifkan di perangkatmu.');
$('#fe').innerHTML='<a href="mailto:'+EMAIL+'">'+EMAIL+'</a><br>'+HOURS;
function reveal(){const els=document.querySelectorAll('[data-p]:not([hidden]) .rv:not(.in)');if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});els.forEach(e=>io.observe(e))}
// Keluar otomatis (kunci dipindah/dicabut/sesi habis)
function autoOut(msg){UID=null;OWN=false;document.querySelectorAll('.prv').forEach(e=>e.hidden=true);$('#adm').hidden=true;$('#cta').textContent='Masuk';$('#cta').href='#masuk';const l=$('#lo');l.textContent=msg||'';l.hidden=!msg;if(location.hash==='#masuk')go();else location.hash='masuk'}

// Router + indikator memuat + login gate
const R=['beranda','harga','masuk','dasbor','api','admin',...Object.keys(S)];
function ov(on){const b=$('#bar');$('#ov').classList.toggle('show',on);if(on){b.className='';void b.offsetWidth;b.className='on'}else b.className='done'}
async function go(){
 const id=++nav;let r=location.hash.slice(1);if(!R.includes(r))r='beranda';
 if(['dasbor','api','admin'].includes(r)&&!UID)r='masuk';if(r==='admin'&&!OWN)r='dasbor';
 $('#ov').style.top=$('nav').offsetHeight+'px';ov(1);
 document.querySelectorAll('[data-p]').forEach(e=>e.hidden=true);
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+r));
 const t=wait(750);
 try{if(S[r])doc(r);if(r==='dasbor')await dash();if(r==='api')await api();if(r==='admin')await adm()}catch(e){}
 await t;if(id!==nav)return;
 $('#gate').hidden=!!UID;$('#in').hidden=!UID;
 const s=$('[data-p="'+(S[r]?'doc':r)+'"]');s.hidden=false;s.classList.remove('pgin');void s.offsetWidth;s.classList.add('pgin');scrollTo(0,0);ov(0);reveal()}

// Keluar otomatis: cek lisensi tiap 30 dtk (server juga mengakhiri sesi lama saat kunci direset/dicabut)
setInterval(()=>{if(UID&&!document.hidden)rq('/api/license').then(s=>{if(s.state==='perangkat'||s.state==='invalid'){saveAS(null);autoOut((MSG[s.state]||'')+' Kamu keluar otomatis.')}}).catch(()=>{})},30000);
// ===== Sesi + login (server: /api/*) =====
(async()=>{
 try{const m=await rq('/api/me');UID=String(m.id);NAME=m.name||m.email||'';OWN=!!m.admin}catch(e){}
 document.querySelectorAll('.brand').forEach(a=>a.lastChild.textContent=CFG.brand);document.title=CFG.brand+' — upload sekali, tayang di semua platform';
 document.querySelectorAll('.prv').forEach(e=>e.hidden=!UID);$('#adm').hidden=!OWN;
 if(UID){$('#cta').textContent='Dasbor';$('#cta').href='#dasbor';$('#who').textContent='Kamu sudah masuk sebagai '+NAME+'.';$('#out').hidden=false}
 addEventListener('hashchange',go);go()})();
const lm=(t,ok)=>say('#lm',t,ok),done=()=>{lm('Berhasil masuk…',1);setTimeout(()=>{location.hash='dasbor';location.reload()},500)};
let mode='in';
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));$('#tc').hidden=mode==='in';$('#se').textContent=mode==='in'?'Masuk':'Daftar';$('#pw').autocomplete=mode==='in'?'current-password':'new-password';lm('')});
$('#se').onclick=async()=>{
 const email=$('#em').value.trim(),pw=$('#pw').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return lm('Email tidak valid.');
 if(pw.length<8)return lm('Password minimal 8 karakter.');
 if(mode==='up'&&!$('#ag').checked)return lm('Centang persetujuan Syarat dan Privasi.');
 try{lm('Memproses…',1);setAuth(await fbq(mode==='in'?'accounts:signInWithPassword':'accounts:signUp',{email,password:pw,returnSecureToken:true}));done()}catch(e){lm(e.message)}};
$('#fg').onclick=async()=>{const email=$('#em').value.trim();if(!email)return lm('Isi email dulu.');try{await fbq('accounts:sendOobCode',{requestType:'PASSWORD_RESET',email});lm('Jika email terdaftar, tautan reset sudah dikirim.',1)}catch(e){lm(e.message)}};
const gsi=()=>new Promise((ok,no)=>{if(window.google&&google.accounts)return ok();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=ok;s.onerror=()=>no(new Error('Skrip Google tidak bisa dimuat.'));document.head.appendChild(s)});
$('#gg').onclick=async()=>{
 if(!CFG.googleClientId)return lm('Login Google belum diatur: isi googleClientId di config.js.');
 try{await gsi();google.accounts.id.initialize({client_id:CFG.googleClientId,callback:async r=>{try{setAuth(await fbq('accounts:signInWithIdp',{postBody:'id_token='+encodeURIComponent(r.credential)+'&providerId=google.com',requestUri:location.origin,returnIdpCredential:true,returnSecureToken:true}));done()}catch(e){lm(e.message)}}});google.accounts.id.prompt()}catch(e){lm(e.message)}};
$('#out').onclick=()=>{saveAS(null);location.hash='masuk';location.reload()};

// ===== Lisensi: 1 kunci = 1 perangkat (dicek server lewat header X-Device) =====
$('#beli').onclick=async()=>{
 if(!UID){location.hash='masuk';return}
 try{const d=await rq('/api/license/buy',{});await rq('/api/license/activate',{key:d.key});say('#bm','Kunci kamu: '+d.key+' (simpan, hanya tampil sekali)',1);setTimeout(()=>location.hash='dasbor',2500)}catch(e){say('#bm',e.message)}};
async function dash(){
 $('#app').hidden=$('#act').hidden=true;say('#am','');
 let s={state:'none'};try{s=await rq('/api/license')}catch(e){}
 if(s.state==='ok'){try{CONN=(await rq('/api/connections')).connections||{}}catch(e){CONN={}}$('#kshow').textContent=s.hint||'';$('#app').hidden=false;tl();return}
 if(MSG[s.state])say('#am',MSG[s.state]);$('#act').hidden=false}
$('#aktif').onclick=async()=>{const key=$('#kin').value.trim().toUpperCase();if(!key)return;let m='';try{await rq('/api/license/activate',{key})}catch(e){m=e.message}await go();if(m)say('#am',m)};

// ===== Halaman API: tempel token -> server mengecek ke platform -> Terhubung =====
async function api(){
 let c={};try{c=(await rq('/api/connections')).connections||{}}catch(e){}
 $('#kl').innerHTML=P.map(p=>'<div class="kr"><div class="kh"><b>'+p+'</b><em class="'+(c[p]?'ok':'')+'">'+(c[p]?'● Terhubung'+(c[p].name?' · '+esc(c[p].name):''):'Belum terhubung')+'</em></div><input type="password" id="k-'+p+'" autocomplete="off" placeholder="'+(c[p]?'Tempel token baru untuk mengganti':'Tempel access token OAuth milikmu (API key saja tidak cukup untuk upload YouTube)')+'"><button class="b p" data-a="s" data-n="'+p+'">'+(c[p]?'Perbarui':'Hubungkan')+'</button>'+(c[p]?'<button class="b" data-a="d" data-n="'+p+'">Putuskan</button>':'')+'</div>').join('')}
$('#kl').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const n=b.dataset.n;let w='';
 try{
  if(b.dataset.a==='d')await rq('/api/connect/'+n.toLowerCase(),null,'DELETE');
  else{const v=$('#k-'+n).value.trim();if(v.length<10||/\s/.test(v)){say('#km','Token '+n+' tidak valid (tanpa spasi, min. 10 karakter).');return}
   b.disabled=true;say('#km','Menghubungkan ke '+n+'…',1);const d=await rq('/api/connect/'+n.toLowerCase(),{token:v});w=d.warn||''}
  await api();say('#km',n+(b.dataset.a==='d'?' diputus.':' terhubung.')+(w?' '+w:''),1)}
 catch(err){await api();say('#km',n+': '+err.message)}};

// ===== Admin lisensi =====
async function adm(){
 const s=await rq('/api/admin/licenses');
 $('#list').innerHTML=s.licenses.map(v=>'<div class="row"><b>'+esc(v.id)+'</b><span>'+(v.off?'dicabut':v.dev?'terkunci ke 1 perangkat':'belum dipakai')+'</span><button class="b" data-a="reset" data-h="'+esc(v.id)+'">Reset perangkat</button><button class="b" data-a="'+(v.off?'restore':'revoke')+'" data-h="'+esc(v.id)+'">'+(v.off?'Aktifkan':'Cabut')+'</button></div>').join('')||'<p class="note">Belum ada kunci.</p>'}
$('#list').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{await rq('/api/admin/licenses/'+b.dataset.h+'/'+b.dataset.a,{})}catch(x){}adm()};
$('#gen').onclick=async()=>{try{const d=await rq('/api/admin/licenses',{});$('#newk').textContent=d.key;adm()}catch(e){$('#newk').textContent=e.message}};

// Uploader (terkunci sampai kunci aktif)
function tl(){
 $('#tl').innerHTML=P.map(p=>'<button class="t'+(sel.has(p)?' on':'')+'" data-n="'+p+'">'+(CONN[p]?'● ':'')+p+'</button>').join('');
 $('#go').textContent=sel.size?'Posting ke '+sel.size+' Akun':'Pilih platform';$('#go').disabled=busy||!sel.size}
$('#tl').onclick=e=>{const t=e.target.closest('.t');if(!t||busy)return;const n=t.dataset.n;sel.has(n)?sel.delete(n):sel.add(n);tl()};
$('#vf').onchange=e=>{const f=e.target.files[0];if(f)$('#vn').textContent=f.name+' · '+(f.size/1048576).toFixed(1)+' MB'};
$('#go').onclick=async()=>{
 const f=$('#vf').files[0];if(!f){say('#pm','Pilih video dulu.');return}
 const requested=[...sel],direct=requested.filter(p=>p==='YouTube'&&CONN[p]),blocked=requested.filter(p=>p!=='YouTube');
 if(!direct.length){say('#pm',blocked.length?'Saat ini posting video langsung dari browser hanya tersedia untuk YouTube. Instagram, TikTok, Facebook, dan Threads perlu URL publik/unggah server atau dukungan CORS resmi, jadi belum diaktifkan.':'Hubungkan YouTube di halaman API.');return}
 say('#pm','');busy=1;tl();
 $('#log').innerHTML='<div class="lr"><span>Video dikirim langsung dari browser ke YouTube (backend tidak menerima/menyimpan video)</span><em id="up">0%</em><div class="bar"><i id="ub"></i></div></div>'+requested.map(p=>'<div class="lr"><span>'+p+'</span><em id="e-'+p+'">'+(p==='YouTube'&&CONN[p]?'Menunggu':CONN[p]?'Belum didukung dari browser':'Belum terhubung')+'</em></div>').join('');
 try{
  $('#e-YouTube').textContent='Memulai sesi…';
  const result=await browserYouTube(f,$('#cap').value);
  $('#e-YouTube').innerHTML='Tayang · <a href="'+esc(result.url)+'" target="_blank" rel="noopener">lihat</a>';
  say('#pm','Video berhasil diproses oleh YouTube.',true);
 }catch(e){say('#pm',e.message);if($('#e-YouTube'))$('#e-YouTube').textContent='Gagal: '+e.message}
 busy=0;tl()};
