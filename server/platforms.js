// Verifikasi token dan upload ke tiap platform lewat API resmi.
// PENTING: belum diuji dengan token asli (hanya dengan platform tiruan). Uji per platform dulu. Lihat README.
const https=require('https'),http=require('http'),fs=require('fs');
const MOCK=process.env.MOCK_PLATFORMS||'',GV=process.env.GRAPH_VERSION||'v23.0',POLL=+process.env.POLL_MS||3000;
const q=encodeURIComponent,U=u=>MOCK?MOCK+new URL(u).pathname+new URL(u).search:u,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FORM={'Content-Type':'application/x-www-form-urlencoded'};
const J=async(u,o)=>{const r=await fetch(U(u),o);return{ok:r.ok,s:r.status,h:r.headers,d:await r.json().catch(()=>({}))}};
const post=(u,body,h)=>J(u,{method:'POST',headers:h||FORM,body});
const em=x=>{const e=x.d&&(x.d.error||x.d);return(e&&(typeof e==='string'?e:e.message||e.code))||'HTTP '+x.s};
const need=c=>{if(!c.url)throw new Error('PUBLIC_URL belum diatur (butuh URL https publik agar platform bisa mengambil video).')};
// PUT sebagian file (streaming) dengan Content-Length eksplisit
const put=(url,headers,file,a,b)=>new Promise((ok,no)=>{
 const u=new URL(url),r=(u.protocol==='https:'?https:http).request(u,{method:'PUT',headers:{...headers,'Content-Length':b-a+1}},res=>{
  let t='';res.on('data',c=>t+=c);res.on('end',()=>{let d={};try{d=JSON.parse(t)}catch(e){}ok({ok:res.statusCode<300,s:res.statusCode,d})})});
 r.on('error',no);fs.createReadStream(file,{start:a,end:b}).pipe(r)});
async function wait4(get,okv,bad,nama){for(let i=0;i<60;i++){const s=await get();if(okv.includes(s))return;if(bad.includes(s))throw new Error(nama+' gagal memproses video.');await sleep(POLL)}throw new Error(nama+' terlalu lama memproses video.')}

// ===== Cek token =====
const VER={
 youtube:async t=>{
  if(/^AIza/.test(t)){const x=await J('https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=ID&key='+q(t));return x.ok?{ok:true,name:'API key valid',meta:{apikey:true},warn:'API key tidak bisa upload ke YouTube; pakai access token OAuth.'}:{ok:false}}
  const x=await J('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:'Bearer '+t}}),n=x.d.items&&x.d.items[0];
  return x.ok&&n?{ok:true,name:n.snippet.title}:{ok:false}},
 instagram:async t=>{
  let x=await J('https://graph.instagram.com/me?fields=user_id,username&access_token='+q(t));
  if(x.ok&&x.d.username)return{ok:true,name:'@'+x.d.username,meta:{host:'https://graph.instagram.com/'+GV,id:x.d.user_id||x.d.id}};
  x=await J('https://graph.facebook.com/'+GV+'/me/accounts?fields=instagram_business_account%7Busername%7D&access_token='+q(t));
  const a=x.ok&&(x.d.data||[]).find(p=>p.instagram_business_account),b=a&&a.instagram_business_account;
  return b?{ok:true,name:'@'+b.username,meta:{host:'https://graph.facebook.com/'+GV,id:b.id}}:{ok:false}},
 facebook:async t=>{const x=await J('https://graph.facebook.com/'+GV+'/me?fields=id,name&access_token='+q(t));return x.ok&&x.d.id?{ok:true,name:x.d.name}:{ok:false}},
 threads:async t=>{const x=await J('https://graph.threads.net/v1.0/me?fields=id,username&access_token='+q(t));return x.ok&&x.d.id?{ok:true,name:'@'+(x.d.username||x.d.id),meta:{id:x.d.id}}:{ok:false}},
 tiktok:async t=>{const x=await J('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',{headers:{Authorization:'Bearer '+t}}),u=x.d.data&&x.d.data.user;return x.ok&&u?{ok:true,name:u.display_name||u.open_id}:{ok:false}}};

// ===== Upload. c = {token,meta,file,size,mime,url,caption,title} -> {url,note} =====
async function ytUp(c){
 if(c.meta&&c.meta.apikey)throw new Error('API key tidak bisa upload ke YouTube. Gunakan access token OAuth (scope youtube.upload).');
 const i=await J('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Length':String(c.size),'X-Upload-Content-Type':c.mime},body:JSON.stringify({snippet:{title:c.title,description:c.caption},status:{privacyStatus:process.env.YT_PRIVACY||'public'}})});
 const loc=i.h.get('location');if(!i.ok||!loc)throw new Error(em(i));
 const r=await put(loc,{'Content-Type':c.mime},c.file,0,c.size-1);if(!r.ok||!r.d.id)throw new Error(em(r));
 return{url:'https://youtu.be/'+r.d.id}}
async function fbUp(c){
 need(c);const g='https://graph.facebook.com/'+GV;
 const pg=await J(g+'/me/accounts?fields=id,name,access_token&access_token='+q(c.token));
 const t=pg.ok&&pg.d.data&&pg.d.data[0]?{id:pg.d.data[0].id,tok:pg.d.data[0].access_token}:{id:'me',tok:c.token};
 const r=await post(g+'/'+t.id+'/videos','file_url='+q(c.url)+'&description='+q(c.caption)+'&access_token='+q(t.tok));
 if(!r.ok||!r.d.id)throw new Error(em(r));return{url:'https://www.facebook.com/'+r.d.id}}
async function igUp(c){
 need(c);const m=c.meta||{},H=m.host,id=m.id;if(!H||!id)throw new Error('Hubungkan ulang Instagram.');
 const mk=await post(H+'/'+id+'/media','media_type=REELS&video_url='+q(c.url)+'&caption='+q(c.caption)+'&access_token='+q(c.token));
 if(!mk.ok||!mk.d.id)throw new Error(em(mk));
 await wait4(async()=>(await J(H+'/'+mk.d.id+'?fields=status_code&access_token='+q(c.token))).d.status_code,['FINISHED'],['ERROR','EXPIRED'],'Instagram');
 const pb=await post(H+'/'+id+'/media_publish','creation_id='+q(mk.d.id)+'&access_token='+q(c.token));
 if(!pb.ok||!pb.d.id)throw new Error(em(pb));
 const pl=await J(H+'/'+pb.d.id+'?fields=permalink&access_token='+q(c.token));return{url:pl.d.permalink||''}}
async function thUp(c){
 need(c);const H='https://graph.threads.net/v1.0',id=c.meta&&c.meta.id;if(!id)throw new Error('Hubungkan ulang Threads.');
 const mk=await post(H+'/'+id+'/threads','media_type=VIDEO&video_url='+q(c.url)+'&text='+q(c.caption)+'&access_token='+q(c.token));
 if(!mk.ok||!mk.d.id)throw new Error(em(mk));
 await wait4(async()=>(await J(H+'/'+mk.d.id+'?fields=status&access_token='+q(c.token))).d.status,['FINISHED'],['ERROR','EXPIRED'],'Threads');
 const pb=await post(H+'/'+id+'/threads_publish','creation_id='+q(mk.d.id)+'&access_token='+q(c.token));
 if(!pb.ok||!pb.d.id)throw new Error(em(pb));
 const pl=await J(H+'/'+pb.d.id+'?fields=permalink&access_token='+q(c.token));return{url:pl.d.permalink||''}}
async function ttUp(c){
 const A={Authorization:'Bearer '+c.token,'Content-Type':'application/json; charset=UTF-8'},B='https://open.tiktokapis.com/v2/post/publish/';
 const ci=await J(B+'creator_info/query/',{method:'POST',headers:A});if(!ci.ok)throw new Error(em(ci));
 const opts=(ci.d.data&&ci.d.data.privacy_level_options)||[],lvl=opts.includes('PUBLIC_TO_EVERYONE')?'PUBLIC_TO_EVERYONE':(opts[0]||'SELF_ONLY');
 const big=c.size>64*1048576,cs=big?32*1048576:c.size,n=big?Math.floor(c.size/cs):1;
 const ini=await J(B+'video/init/',{method:'POST',headers:A,body:JSON.stringify({post_info:{title:c.caption.slice(0,2200),privacy_level:lvl,disable_duet:false,disable_comment:false,disable_stitch:false},source_info:{source:'FILE_UPLOAD',video_size:c.size,chunk_size:cs,total_chunk_count:n}})});
 const d=ini.d.data||{};if(!ini.ok||!d.upload_url)throw new Error(em(ini));
 for(let i=0;i<n;i++){const s=i*cs,e=i===n-1?c.size-1:s+cs-1,r=await put(d.upload_url,{'Content-Type':c.mime,'Content-Range':'bytes '+s+'-'+e+'/'+c.size},c.file,s,e);if(!r.ok)throw new Error('Unggah ke TikTok gagal (HTTP '+r.s+')')}
 await wait4(async()=>{const st=await J(B+'status/fetch/',{method:'POST',headers:A,body:JSON.stringify({publish_id:d.publish_id})});return st.d.data&&st.d.data.status},['PUBLISH_COMPLETE'],['FAILED'],'TikTok');
 return{url:'',note:lvl==='SELF_ONLY'?'tampil privat (aplikasi belum diaudit TikTok)':''}}
module.exports={VER,PL:{youtube:ytUp,instagram:igUp,facebook:fbUp,threads:thUp,tiktok:ttUp}};
