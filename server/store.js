// Penyimpanan data: Firestore (produksi) atau file JSON (hanya uji/dev saat AUTH_MODE=test)
const fs=require('fs'),path=require('path');
module.exports=(mode,dir)=>{
 if(mode==='firebase'){
  const admin=require('firebase-admin');
  if(!admin.apps.length)admin.initializeApp({credential:admin.credential.applicationDefault()});
  const db=admin.firestore(),ref=(c,i)=>db.collection(c).doc(i);
  return{
   admin,
   async get(c,i){const s=await ref(c,i).get();return s.exists?s.data():null},
   async set(c,i,d){await ref(c,i).set(d,{merge:true})},
   async put(c,i,d){await ref(c,i).set(d)},
   async list(c,n){const s=await db.collection(c).orderBy('at','desc').limit(n).get();return s.docs.map(d=>({id:d.id,...d.data()}))},
   // 1 kunci = 1 perangkat, atomik (transaksi)
   async bind(h,uid,dev){return db.runTransaction(async t=>{
    const r=ref('licenses',h),s=await t.get(r);if(!s.exists)return'none';
    const l=s.data();if(l.off)return'off';if(l.uid&&l.uid!==uid)return'milik';if(l.dev&&l.dev!==dev)return'perangkat';
    t.update(r,{uid,dev});t.set(ref('users',uid),{lic:h},{merge:true});return'ok'})},
   async kick(uid){await admin.auth().revokeRefreshTokens(uid)}}}
 const F=path.join(dir,'db.json');let db={};try{db=JSON.parse(fs.readFileSync(F,'utf8'))}catch(e){}
 const save=()=>{fs.writeFileSync(F+'.tmp',JSON.stringify(db));fs.renameSync(F+'.tmp',F)};
 return{
  async get(c,i){const v=(db[c]||{})[i];return v?JSON.parse(JSON.stringify(v)):null},
  async set(c,i,d){(db[c]=db[c]||{})[i]={...(db[c][i]||{}),...d};save()},
  async put(c,i,d){(db[c]=db[c]||{})[i]=d;save()},
  async list(c,n){return Object.entries(db[c]||{}).map(([id,v])=>({id,...v})).sort((a,b)=>b.at-a.at).slice(0,n)},
  async bind(h,uid,dev){const l=(db.licenses||{})[h];if(!l)return'none';if(l.off)return'off';if(l.uid&&l.uid!==uid)return'milik';if(l.dev&&l.dev!==dev)return'perangkat';
   l.uid=uid;l.dev=dev;(db.users=db.users||{})[uid]={...(db.users[uid]||{}),lic:h};save();return'ok'},
  async kick(){}}};
