// Penyimpanan data produksi hanya di Firestore; tidak ada fallback file lokal.
module.exports=(mode,dir)=>{
 const admin=require('firebase-admin');
 if(!admin.apps.length){
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum diatur.');
  let serviceAccount;try{serviceAccount=JSON.parse(raw)}catch(e){throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON valid.')}
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
 }
 const db=admin.firestore(),ref=(c,i)=>db.collection(c).doc(i);
 return{
  admin,
  async get(c,i){const s=await ref(c,i).get();return s.exists?s.data():null},
  async set(c,i,d){await ref(c,i).set(d,{merge:true})},
  async put(c,i,d){await ref(c,i).set(d)},
  async list(c,n){const s=await db.collection(c).orderBy('at','desc').limit(n).get();return s.docs.map(d=>({id:d.id,...d.data()}))},
  async bind(h,uid,dev){return db.runTransaction(async t=>{
   const r=ref('licenses',h),s=await t.get(r);if(!s.exists)return'none';
   const l=s.data();if(l.off)return'off';if(l.uid&&l.uid!==uid)return'milik';if(l.dev&&l.dev!==dev)return'perangkat';
   t.update(r,{uid,dev});t.set(ref('users',uid),{lic:h},{merge:true});return'ok'})},
  async kick(uid){await admin.auth().revokeRefreshTokens(uid)}
 }
};