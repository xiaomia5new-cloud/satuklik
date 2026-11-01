// Tes otomatis: server dengan AUTH_MODE=test + platform tiruan. Jalankan: node test.js
const http=require('http'),os=require('os'),fs=require('fs'),path=require('path'),crypto=require('crypto'),Module=require('module'),{spawn}=require('child_process');
const DIR=fs.mkdtempSync(path.join(os.tmpdir(),'sk-')),B='http://localhost:3102';
const seen={};
const rd=q=>new Promise(r=>{const b=[];q.on('data',c=>b.push(c));q.on('end',()=>r(Buffer.concat(b)))});
const mock=http.createServer(async(q,r)=>{
 const u=new URL(q.url,'http://x'),p=u.pathname,a=q.headers.authorization||'',t=u.searchParams.get('access_token'),k=u.searchParams.get('key'),raw=await rd(q),f=new URLSearchParams(raw.toString());
 const J=(c,o,h)=>{r.writeHead(c,{'Content-Type':'application/json',...h});r.end(JSON.stringify(o))},POST=q.method==='POST',PUT=q.method==='PUT';
 if(p==='/youtube/v3/channels')return a==='Bearer good-yt-token'?J(200,{items:[{snippet:{title:'Kanal Uji'}}]}):J(401,{});
 if(p==='/youtube/v3/videoCategories')return k==='AIzaGoodKey123456'?J(200,{items:[]}):J(400,{});
 if(p==='/me')return t==='good-ig-token'?J(200,{user_id:'IGU1',username:'ig_uji'}):J(400,{});
 if(p==='/v23.0/me')return t==='good-fb-token'?J(200,{id:'1',name:'FB Uji'}):J(400,{});
 if(p==='/v1.0/me')return t==='good-th-token'?J(200,{id:'THU1',username:'th_uji'}):J(400,{});
 if(p==='/v2/user/info/')return a==='Bearer good-tt-token'?J(200,{data:{user:{display_name:'TT Uji'}}}):J(401,{error:{code:'access_token_invalid'}});
 if(p==='/upload/youtube/v3/videos'&&POST){seen.ytMeta=JSON.parse(raw.toString());seen.ytLen=q.headers['x-upload-content-length'];seen.ytAuth=a;return J(200,{},{Location:'http://localhost:4001/yt-session/1'})}
 if(p==='/yt-session/1'&&PUT){seen.yt=raw.length;return J(200,{id:'YT123'})}
 if(p==='/v23.0/me/accounts')return t==='good-fb-token'?J(200,{data:[{id:'PG1',access_token:'page-tok'}]}):J(400,{});
 if(p==='/v23.0/PG1/videos'&&POST){seen.fbUrl=f.get('file_url');seen.fbTok=f.get('access_token');seen.fbDesc=f.get('description');return J(200,{id:'FBV1'})}
 if(p==='/v23.0/IGU1/media'&&POST){seen.igUrl=f.get('video_url');seen.igType=f.get('media_type');return J(200,{id:'IGC1'})}
 if(p==='/v23.0/IGC1')return J(200,{status_code:'FINISHED'});
 if(p==='/v23.0/IGU1/media_publish'&&POST)return J(200,{id:'IGM1'});
 if(p==='/v23.0/IGM1')return J(200,{permalink:'https://www.instagram.com/reel/ABC/'});
 if(p==='/v1.0/THU1/threads'&&POST){seen.thUrl=f.get('video_url');seen.thType=f.get('media_type');return J(200,{id:'THC1'})}
 if(p==='/v1.0/THC1')return J(200,{status:'FINISHED'});
 if(p==='/v1.0/THU1/threads_publish'&&POST)return J(200,{id:'THP1'});
 if(p==='/v1.0/THP1')return J(200,{permalink:'https://www.threads.net/@th_uji/post/1'});
 if(p==='/v2/post/publish/creator_info/query/')return J(200,{data:{privacy_level_options:['SELF_ONLY']},error:{code:'ok'}});
 if(p==='/v2/post/publish/video/init/'){seen.ttInit=JSON.parse(raw.toString());return J(200,{data:{publish_id:'PUB1',upload_url:'http://localhost:4001/tt-up/1'},error:{code:'ok'}})}
 if(p==='/tt-up/1'&&PUT){seen.tt=raw.length;seen.ttRange=q.headers['content-range'];return J(201,{})}
 if(p==='/v2/post/publish/status/fetch/')return J(200,{data:{status:'PUBLISH_COMPLETE'},error:{code:'ok'}});
 J(404,{})}).listen(4001);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('GAGAL:',n))};
let sv;const start=async env=>{sv=spawn('node',['server/server.js'],{env:{...process.env,AUTH_MODE:'test',DATA_DIR:DIR,PORT:'3102',MOCK_PLATFORMS:'http://localhost:4001',DEMO_PAY:'1',ADMIN_EMAILS:'adm@test.id',POLL_MS:'10',PUBLIC_URL:B,...env},stdio:'ignore'});await sleep(800)};
const stop=async()=>{sv.kill();await sleep(300)};
const tok=(u,e)=>'Bearer test:'+u+':'+e;
const cl=(u,e,dev)=>async(p,body,m,h)=>{const r=await fetch(B+p,{method:m||(body?'POST':'GET'),headers:{'Content-Type':'application/json','X-Device':dev,Authorization:tok(u,e),...(h||{})},body:body?JSON.stringify(body):undefined});return{s:r.status,d:await r.json().catch(()=>({}))}};
const up=async(u,e,dev,buf,name)=>{const r=await fetch(B+'/api/upload',{method:'POST',headers:{'X-Device':dev,Authorization:tok(u,e),'X-Filename':encodeURIComponent(name),'Content-Type':'video/mp4'},body:buf});return{s:r.status,d:await r.json().catch(()=>({}))}};
(async()=>{
 await start();
 T('index + CSP',await(async()=>{const r=await fetch(B+'/');return r.status===200&&(r.headers.get('content-security-policy')||'').includes('identitytoolkit')})());
 T('traversal 404',(await fetch(B+'/%2e%2e/server/server.js')).status===404);
 T('tanpa token 401',(await fetch(B+'/api/me')).status===401);
 T('token palsu 401',(await fetch(B+'/api/me',{headers:{Authorization:'Bearer abc'}})).status===401);
 const A=cl('u1','a@test.id','devA'),me=await A('/api/me');T('me',me.s===200&&me.d.email==='a@test.id'&&me.d.admin===false);
 T('csrf origin',(await A('/api/license/activate',{key:'x'},'POST',{Origin:'http://evil.example'})).s===403);
 const c0=await A('/api/connect/youtube',{token:'good-yt-token'});T('connect tanpa lisensi 403',c0.s===403&&c0.d.code==='none');
 const key=(await A('/api/license/buy',{})).d.key;T('format kunci',/^SK(-[A-Z2-9]{4}){3}$/.test(key));
 T('aktivasi devA',(await A('/api/license/activate',{key})).s===200);T('lisensi ok',(await A('/api/license')).d.state==='ok');
 for(const[p,g,n]of[['youtube','good-yt-token','Kanal Uji'],['instagram','good-ig-token','@ig_uji'],['facebook','good-fb-token','FB Uji'],['threads','good-th-token','@th_uji'],['tiktok','good-tt-token','TT Uji']]){
  T(p+' token buruk',(await A('/api/connect/'+p,{token:'bad-token-123456'})).s===400);
  const x=await A('/api/connect/'+p,{token:g});T(p+' terhubung',x.s===200&&x.d.name===n)}
 const yk=await A('/api/connect/youtube',{token:'AIzaGoodKey123456'});T('youtube api key + warn',yk.s===200&&!!yk.d.warn);
 const cn=(await A('/api/connections')).d.connections;T('daftar koneksi tanpa token',Object.keys(cn).length===5&&!JSON.stringify(cn).includes('good-')&&cn.TikTok.name==='TT Uji');
 T('db terenkripsi',!fs.readFileSync(path.join(DIR,'db.json'),'utf8').includes('good-'));
 T('yt api key tidak bisa upload',await(async()=>{const v=await up('u1','a@test.id','devA',Buffer.alloc(10,1),'a.mp4');const r=await A('/api/post',{uploadId:v.d.id,caption:'x',platforms:['youtube']});return r.d.results[0].ok===false&&/OAuth/.test(r.d.results[0].error)})());
 await A('/api/connect/youtube',{token:'good-yt-token'});
 T('format salah 400',(await up('u1','a@test.id','devA',Buffer.alloc(10),'a.txt')).s===400);
 T('file kosong 400',(await up('u1','a@test.id','devA',Buffer.alloc(0),'a.mp4')).s===400);
 const buf=crypto.randomBytes(300000),U=await up('u1','a@test.id','devA',buf,'Review Produk.mp4');T('upload',U.s===200&&U.d.size===300000);
 const id=U.d.id,mu=B+'/media/'+id+'.mp4',m1=await fetch(mu),m2=await fetch(mu,{headers:{Range:'bytes=0-99'}});
 T('media 200',m1.status===200&&(await m1.arrayBuffer()).byteLength===300000);T('media range 206',m2.status===206&&(await m2.arrayBuffer()).byteLength===100);
 const R=await A('/api/post',{uploadId:id,caption:'Judul baris satu\nBaris dua #viral',platforms:['YouTube','instagram','facebook','threads','tiktok']});
 const by=Object.fromEntries((R.d.results||[]).map(x=>[x.platform,x]));
 T('semua platform ok',R.s===200&&Object.values(by).length===5&&Object.values(by).every(x=>x.ok));
 T('url hasil',by.YouTube.url==='https://youtu.be/YT123'&&by.Instagram.url.includes('instagram.com')&&by.Threads.url.includes('threads.net')&&by.Facebook.url.endsWith('/FBV1'));
 T('tiktok privat note',/privat/.test(by.TikTok.note));
 T('youtube byte + header',seen.yt===300000&&seen.ytLen==='300000'&&seen.ytAuth==='Bearer good-yt-token'&&seen.ytMeta.snippet.title==='Judul baris satu');
 T('tiktok byte + range + privasi',seen.tt===300000&&seen.ttRange==='bytes 0-299999/300000'&&seen.ttInit.post_info.privacy_level==='SELF_ONLY'&&seen.ttInit.source_info.video_size===300000);
 T('facebook pakai token halaman + url',seen.fbTok==='page-tok'&&seen.fbUrl===mu&&seen.fbDesc.includes('#viral'));
 T('instagram reels + url',seen.igType==='REELS'&&seen.igUrl===mu);T('threads video + url',seen.thType==='VIDEO'&&seen.thUrl===mu);
 T('media dihapus setelah posting',(await fetch(mu)).status===404);
 T('post ulang 404',(await A('/api/post',{uploadId:id,platforms:['youtube']})).s===404);
 await A('/api/connect/tiktok',null,'DELETE');
 const U2=await up('u1','a@test.id','devA',Buffer.alloc(50,2),'b.mp4'),R2=await A('/api/post',{uploadId:U2.d.id,platforms:['tiktok']});
 T('belum terhubung',R2.d.results[0].ok===false&&/Belum terhubung/.test(R2.d.results[0].error));
 const O=cl('u2','b@test.id','devX');T('user lain tanpa lisensi 403',(await up('u2','b@test.id','devX',Buffer.alloc(5),'a.mp4')).s===403);
 T('kunci milik akun lain 409',(await O('/api/license/activate',{key})).s===409);
 const Bd=cl('u1','a@test.id','devB');T('devB state perangkat',(await Bd('/api/license')).d.state==='perangkat');
 T('devB aktivasi 409',(await Bd('/api/license/activate',{key})).s===409);
 T('devB connect 403',(await Bd('/api/connect/facebook',{token:'good-fb-token'})).s===403);
 T('devB upload 403',(await up('u1','a@test.id','devB',Buffer.alloc(5),'a.mp4')).s===403);
 const X=cl('u3','c@test.id','devZ');let last=0;for(let i=0;i<10;i++)last=(await X('/api/license/activate',{key:'SK-SALA-HSAL-AHXX'})).s;T('rate limit aktivasi 429',last===429);
 T('non-admin 403',(await A('/api/admin/licenses')).s===403);
 const AD=cl('adm','adm@test.id','devAd'),L=await AD('/api/admin/licenses');T('admin list',L.s===200&&L.d.licenses.length>=1);
 T('admin buat kunci',/^SK-/.test((await AD('/api/admin/licenses',{})).d.key));
 const lid=L.d.licenses.find(x=>x.dev).id;
 T('admin reset',(await AD('/api/admin/licenses/'+lid+'/reset',{})).s===200);T('devA setelah reset none',(await A('/api/license')).d.state==='none');
 T('devB aktif setelah reset',(await Bd('/api/license/activate',{key})).s===200);T('devA kini perangkat',(await A('/api/license')).d.state==='perangkat');
 T('admin cabut',(await AD('/api/admin/licenses/'+lid+'/revoke',{})).s===200);T('devB invalid',(await Bd('/api/license')).d.state==='invalid');
 T('admin pulihkan',(await AD('/api/admin/licenses/'+lid+'/restore',{})).s===200);T('devB ok lagi',(await Bd('/api/license')).d.state==='ok');
 await stop();
 await start({PUBLIC_URL:''});
 const U3=await up('u1','a@test.id','devB',Buffer.alloc(80,3),'c.mp4'),R3=await Bd('/api/post',{uploadId:U3.d.id,caption:'tes',platforms:['instagram','youtube']});
 const b3=Object.fromEntries(R3.d.results.map(x=>[x.platform,x]));T('tanpa PUBLIC_URL: instagram error jelas',b3.Instagram.ok===false&&/PUBLIC_URL/.test(b3.Instagram.error)&&b3.YouTube.ok===true);
 await stop();mock.close();
 // adaptor Firestore dengan firebase-admin tiruan
 const data={},revoked=[];
 const doc=(c,i)=>({async get(){const v=(data[c]||{})[i];return{exists:!!v,data:()=>v&&JSON.parse(JSON.stringify(v))}},async set(d,o){(data[c]=data[c]||{})[i]=o&&o.merge?{...(data[c][i]||{}),...d}:d},async update(d){data[c][i]={...data[c][i],...d}}});
 const fdb={collection:c=>({doc:i=>doc(c,i),orderBy:()=>({limit:n=>({async get(){return{docs:Object.entries(data[c]||{}).sort((a,b)=>b[1].at-a[1].at).slice(0,n).map(([id,v])=>({id,data:()=>v}))}}})})}),async runTransaction(fn){return fn({get:r=>r.get(),update:(r,d)=>{r.update(d)},set:(r,d,o)=>{r.set(d,o)}})}};
 const fake={apps:[],initializeApp(){this.apps.push(1)},credential:{applicationDefault:()=>({})},firestore:()=>fdb,auth:()=>({revokeRefreshTokens:async u=>{revoked.push(u)}})};
 const ol=Module._load;Module._load=function(r,...a){return r==='firebase-admin'?fake:ol.call(this,r,...a)};
 const S=require('./server/store')('firebase',DIR);Module._load=ol;
 await S.put('licenses','h1',{uid:null,dev:null,off:false,at:2});await S.put('licenses','h0',{uid:null,dev:null,off:false,at:1});
 T('firestore bind ok',await S.bind('h1','u1','d1')==='ok'&&(await S.get('users','u1')).lic==='h1');
 T('firestore bind perangkat/milik/none',await S.bind('h1','u1','d2')==='perangkat'&&await S.bind('h1','u9','d1')==='milik'&&await S.bind('zz','u1','d1')==='none');
 await S.set('licenses','h1',{off:true});T('firestore off',await S.bind('h1','u1','d1')==='off');
 T('firestore list urut',(await S.list('licenses',5)).map(x=>x.id).join()==='h1,h0');
 await S.kick('u1');T('firestore kick',revoked[0]==='u1');
 console.log('LULUS',ok,'GAGAL',bad);fs.rmSync(DIR,{recursive:true,force:true});process.exit(bad?1:0)})();
