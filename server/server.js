// satuklik — server (Node 18+). Login: Firebase Auth. Data: Firestore. Upload: YouTube, Instagram, TikTok, Facebook, Threads.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{pipeline,Transform}=require('stream');
const PL=require('./platforms');
const PORT=process.env.PORT||3000,ROOT=path.join(__dirname,'..'),DATA=process.env.DATA_DIR||'/tmp/satuklik-data',UP=path.join(DATA,'uploads');
const TEST=process.env.AUTH_MODE==='test',DEMO=process.env.DEMO_PAY==='1',PUBLIC=(process.env.PUBLIC_URL||'').replace(/\/$/,''),MAXB=(+process.env.MAX_MB||512)*1048576;
const ADM=(process.env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
if(TEST&&process.env.NODE_ENV==='production'){console.error('AUTH_MODE=test tidak boleh dipakai di produksi.');process.exit(1)}
fs.mkdirSync(UP,{recursive:true});
const st=require('./store')('firebase',DATA);

// Token platform disimpan terenkripsi (AES-256-GCM)
let KEY;
if(!process.env.SECRET_KEY||!/^[0-9a-f]{64}$/i.test(process.env.SECRET_KEY))throw new Error('SECRET_KEY wajib diatur sebagai 64 karakter hex.');
KEY=Buffer.from(process.env.SECRET_KEY,'hex');
const enc=t=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',KEY,iv),b=Buffer.concat([c.update(t,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),b]).toString('base64')};
const dec=s=>{const b=Buffer.from(s,'base64'),d=crypto.createDecipheriv('aes-256-gcm',KEY,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8')};
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const hits=new Map(),limited=(k,n=10)=>{const t=Date.now(),a=(hits.get(k)||[]).filter(x=>t-x<60000);a.push(t);hits.set(k,a);return a.length>n};
const NAMES={youtube:'YouTube',instagram:'Instagram',facebook:'Facebook',threads:'Threads',tiktok:'TikTok'};
const MIME={'.mp4':'video/mp4','.mov':'video/quicktime','.m4v':'video/x-m4v','.webm':'video/webm'};
const STAT={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const CSP="default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com/gsi/; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
const UPL=new Map();
setInterval(()=>{const t=Date.now();for(const[id,u]of UPL)if(t-u.at>216e5){fs.unlink(path.join(UP,id+u.ext),()=>{});UPL.delete(id)}},36e5).unref();
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const body=r=>new Promise(ok=>{let b='';r.on('data',c=>{b+=c;if(b.length>1e6)r.destroy()});r.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){ok({})}})});

// Login: verifikasi Firebase ID token (token yang dicabut ikut ditolak)
const verify=async t=>{
 if(!t)return null;
 if(TEST){const m=/^test:([^:]+):(.+)$/.exec(t);return m?{uid:m[1],email:m[2],email_verified:true}:null}
 try{return await st.admin.auth().verifyIdToken(t,true)}catch(e){return null}};
const user=async r=>{const h=r.headers.authorization||'',d=await verify(h.startsWith('Bearer ')?h.slice(7):'');
 return d?{id:d.uid,email:d.email||'',admin:!!(d.email_verified&&d.email&&ADM.includes(d.email.toLowerCase()))}:null};

// Lisensi: 1 kunci = 1 perangkat. Dicek di server untuk semua fitur sensitif.
const lic=async(u,dev)=>{const us=await st.get('users',u.id),l=us&&us.lic&&await st.get('licenses',us.lic);
 return!l||!l.dev?{state:'none'}:l.off?{state:'invalid'}:l.dev!==dev?{state:'perangkat'}:{state:'ok',hint:'SK-••••-••••-'+l.tail}};
const need=async(u,dev)=>{const l=await lic(u,dev);return l.state==='ok'?null:{code:l.state,error:l.state==='perangkat'?'Kunci ini sudah dipakai di perangkat lain.':l.state==='invalid'?'Kunci dicabut.':'Aktifkan kunci dulu.'}};
const mkKey=async uid=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=crypto.randomBytes(12),k='SK-'+[0,1,2].map(i=>[...a.subarray(i*4,i*4+4)].map(x=>c[x%32]).join('')).join('-');
 await st.put('licenses',sha(k),{uid:uid||null,dev:null,off:false,at:Date.now(),tail:k.slice(-4)});return k};

function stat(req,res,p){
 const f=path.normalize(path.join(ROOT,p==='/'?'/index.html':p));
 if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Tidak ditemukan')}
 const ext=path.extname(f);res.writeHead(200,{'Content-Type':STAT[ext]||'application/octet-stream',...(ext==='.html'?{'Content-Security-Policy':CSP}:{})});fs.createReadStream(f).pipe(res)}
// Video sementara untuk Instagram/Threads/Facebook (mengambil lewat URL). ID acak, dihapus setelah posting.
function media(req,res,m){
 const id=m[1],up=UPL.get(id);if(!up||up.ext!==m[2]){res.writeHead(404);return res.end()}
 const size=up.size,rg=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');let a=0,b=size-1,code=200;
 if(rg&&(rg[1]||rg[2])){code=206;if(rg[1]){a=+rg[1];if(rg[2])b=Math.min(+rg[2],size-1)}else a=Math.max(0,size-+rg[2])}
 if(a>b){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end()}
 res.writeHead(code,{'Content-Type':up.mime,'Accept-Ranges':'bytes','Content-Length':b-a+1,...(code===206?{'Content-Range':'bytes '+a+'-'+b+'/'+size}:{})});
 if(req.method==='HEAD')return res.end();fs.createReadStream(path.join(UP,id+m[2]),{start:a,end:b}).pipe(res)}
async function upload(req,res,u,dev){
 const g=await need(u,dev);if(g)return send(res,403,g);
 if(limited('u'+u.id,20))return send(res,429,{error:'Terlalu banyak percobaan.'});
 let name='video.mp4';try{name=decodeURIComponent(String(req.headers['x-filename']||name))}catch(e){}
 const ext=path.extname(name).toLowerCase();if(!MIME[ext])return send(res,400,{error:'Format harus mp4, mov, m4v, atau webm.'});
 if((+req.headers['content-length']||0)>MAXB)return send(res,413,{error:'File terlalu besar (maks '+MAXB/1048576+' MB).'});
 const id=crypto.randomBytes(16).toString('hex'),f=path.join(UP,id+ext);let n=0;
 const lim=new Transform({transform(c,e,cb){n+=c.length;n>MAXB?cb(new Error('big')):cb(null,c)}});
 try{await new Promise((ok,no)=>pipeline(req,lim,fs.createWriteStream(f),e=>e?no(e):ok()))}
 catch(e){fs.unlink(f,()=>{});return send(res,e.message==='big'?413:400,{error:e.message==='big'?'File terlalu besar.':'Unggahan gagal.'})}
 if(!n){fs.unlink(f,()=>{});return send(res,400,{error:'File kosong.'})}
 UPL.set(id,{uid:u.id,ext,size:n,mime:MIME[ext],name,at:Date.now()});return send(res,200,{id,size:n})}

http.createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://x').pathname;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  const origin=req.headers.origin,allowed=origin==='https://xiaomia5new-cloud.github.io';
  if(allowed)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){
   if(!allowed)return send(res,403,{error:'Origin ditolak'});
   res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,X-Device,X-Filename','Access-Control-Max-Age':'86400'});return res.end()
  }
  const mm=p.match(/^\/media\/([0-9a-f]{32})(\.\w+)$/);if(mm)return media(req,res,mm);
  if(!p.startsWith('/api/'))return stat(req,res,p);
  if(origin&&!allowed)return send(res,403,{error:'Origin ditolak'});
  if(p==='/api/health')return send(res,200,{ok:true});
  const dev=String(req.headers['x-device']||'').slice(0,64),u=await user(req);
  if(!u)return send(res,401,{error:'Belum masuk'});
  if(p==='/api/me')return send(res,200,{id:u.id,email:u.email,name:u.email.split('@')[0],admin:u.admin});
  if(p==='/api/upload'&&req.method==='POST')return upload(req,res,u,dev);
  const b=req.method==='GET'?{}:await body(req);

  if(p==='/api/license')return send(res,200,await lic(u,dev));
  if(p==='/api/license/buy'){if(!DEMO)return send(res,403,{error:'Pembelian belum aktif (set DEMO_PAY=1 untuk uji coba, atau sambungkan payment gateway).'});return send(res,200,{key:await mkKey(u.id)})}
  if(p==='/api/license/activate'){
   if(limited('k'+u.id,8))return send(res,429,{error:'Terlalu banyak percobaan.'});
   if(!dev)return send(res,400,{error:'Perangkat tidak dikenali.'});
   const r=await st.bind(sha(String(b.key||'').trim().toUpperCase()),u.id,dev);
   const E={none:[404,'Kunci tidak valid atau sudah dicabut.'],off:[404,'Kunci tidak valid atau sudah dicabut.'],milik:[409,'Kunci ini milik akun lain.'],perangkat:[409,'Kunci ini sudah dipakai di perangkat lain. Satu kunci hanya untuk satu perangkat — minta admin untuk reset.']};
   return r==='ok'?send(res,200,{ok:true}):send(res,E[r][0],{error:E[r][1]})}
  if(p.startsWith('/api/admin/')){
   if(!u.admin)return send(res,403,{error:'Khusus admin'});
   if(p==='/api/admin/licenses')return req.method==='GET'?send(res,200,{licenses:(await st.list('licenses',100)).map(l=>({id:l.id.slice(0,10),dev:!!l.dev,off:!!l.off}))}):send(res,200,{key:await mkKey(null)});
   const m=p.match(/^\/api\/admin\/licenses\/([0-9a-f]{10})\/(reset|revoke|restore)$/);
   if(m){const l=(await st.list('licenses',500)).find(x=>x.id.startsWith(m[1]));if(!l)return send(res,404,{error:'Tidak ditemukan'});
    await st.set('licenses',l.id,m[2]==='reset'?{dev:null}:{off:m[2]==='revoke'});
    if(l.uid&&m[2]!=='restore')await st.kick(l.uid);return send(res,200,{ok:true})}}

  if(p==='/api/connections'){const c=(await st.get('conns',u.id))||{};return send(res,200,{connections:Object.fromEntries(Object.entries(c).map(([k,v])=>[NAMES[k]||k,{name:v.name,at:v.at}]))})}
  const m=p.match(/^\/api\/connect\/(youtube|instagram|facebook|threads|tiktok)$/);
  if(m){
   const g=await need(u,dev);if(g)return send(res,403,g);
   const pl=m[1],c=(await st.get('conns',u.id))||{};
   if(req.method==='DELETE'){delete c[pl];await st.put('conns',u.id,c);return send(res,200,{ok:true})}
   const t=String(b.token||'').trim();if(t.length<10||/\s/.test(t))return send(res,400,{error:'Token tidak valid.'});
   if(limited('c'+u.id,20))return send(res,429,{error:'Terlalu banyak percobaan.'});
   let r;try{r=await PL.VER[pl](t)}catch(e){return send(res,502,{error:'Tidak bisa menghubungi server platform.'})}
   if(!r.ok)return send(res,400,{error:'Token ditolak platform. Periksa jenis dan masa berlaku token.'});
   c[pl]={name:r.name,at:Date.now(),tok:enc(t),meta:r.meta||null};await st.put('conns',u.id,c);
   return send(res,200,{ok:true,name:r.name,warn:r.warn})}

  if(p==='/api/post'){
   const g=await need(u,dev);if(g)return send(res,403,g);
   if(limited('p'+u.id,20))return send(res,429,{error:'Terlalu banyak percobaan.'});
   const id=String(b.uploadId||''),up=UPL.get(id);if(!up||up.uid!==u.id)return send(res,404,{error:'Video tidak ditemukan. Unggah ulang.'});
   const conns=(await st.get('conns',u.id))||{},caption=String(b.caption||'').slice(0,2200);
   const list=[...new Set((Array.isArray(b.platforms)?b.platforms:[]).map(x=>String(x).toLowerCase()).filter(x=>PL.PL[x]))];
   const file=path.join(UP,id+up.ext),url=PUBLIC?PUBLIC+'/media/'+id+up.ext:'';
   const title=(caption.split('\n')[0]||up.name.replace(/\.[^.]+$/,'')||'Video').slice(0,100);
   const results=await Promise.all(list.map(async pl=>{
    const c=conns[pl];if(!c)return{platform:NAMES[pl],ok:false,error:'Belum terhubung.'};
    try{const r=await PL.PL[pl]({token:dec(c.tok),meta:c.meta,file,size:up.size,mime:up.mime,url,caption,title});return{platform:NAMES[pl],ok:true,url:r.url||'',note:r.note||''}}
    catch(e){return{platform:NAMES[pl],ok:false,error:String(e.message||'Gagal').slice(0,300)}}}));
   fs.unlink(file,()=>{});UPL.delete(id);return send(res,200,{results})}
  send(res,404,{error:'Tidak ditemukan'})
 }catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Kesalahan server'})}
}).listen(PORT,'0.0.0.0',()=>console.log('satuklik API jalan pada port '+PORT));