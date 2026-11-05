// App data is stored in Cloudflare D1 through its REST API. Firebase Admin is retained only for ID-token verification/revocation.
const admin=require('firebase-admin');
if(!admin.apps.length){
 if(process.env.AUTH_MODE==='test')admin.initializeApp();
 else{
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum diatur.');
  let serviceAccount;try{serviceAccount=JSON.parse(raw)}catch(e){throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON valid.')}
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
 }
}
const testData=new Map();
const account=process.env.CLOUDFLARE_ACCOUNT_ID,db=process.env.CLOUDFLARE_D1_DATABASE_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(process.env.AUTH_MODE!=='test'&&(!account||!db||!token))throw new Error('CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, dan CLOUDFLARE_API_TOKEN wajib diatur.');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account||'test')}/d1/database/${encodeURIComponent(db||'test')}/query`;
async function query(sql,params=[]){
 if(process.env.AUTH_MODE==='test'){
  if(sql.startsWith('CREATE TABLE'))return{meta:{changes:0},results:[]};
  if(sql.startsWith('SELECT value')){const v=testData.get(testKey(params[0],params[1]));return{meta:{changes:0},results:v===undefined?[]:[{value:v}]}}
  if(sql.startsWith('SELECT item_key')){const rows=[...testData.entries()].map(([k,value])=>({key:JSON.parse(k),value})).filter(x=>x.key[0]===String(params[0])).map(x=>({item_key:x.key[1],value:x.value}));return{meta:{changes:0},results:rows.slice(0,params[1])}}
  if(sql.startsWith('UPDATE')){const key=testKey(params[2],params[3]);if(testData.get(key)!==params[4])return{meta:{changes:0},results:[]};testData.set(key,params[0]);return{meta:{changes:1},results:[]}}
  if(sql.startsWith('INSERT')){testData.set(testKey(params[0],params[1]),params[2]);return{meta:{changes:1},results:[]}}
  throw new Error('Unsupported test D1 query');
 }

 const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({sql,params})});
 const d=await r.json().catch(()=>null);if(!r.ok||!d||d.success!==true)throw new Error('Cloudflare D1 gagal: '+((d&&d.errors&&d.errors[0]&&d.errors[0].message)||`HTTP ${r.status}`));
 return d.result?.[0];
}
let ready;
const ensure=()=>ready||(ready=query('CREATE TABLE IF NOT EXISTS satuklik_data (collection TEXT NOT NULL, item_key TEXT NOT NULL, value TEXT NOT NULL, at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(collection,item_key))'));
const ref=(c,i)=>[String(c),String(i)],testKey=(c,i)=>JSON.stringify([String(c),String(i)]);
module.exports=()=>({
 admin,
 async get(c,i){await ensure();const r=await query('SELECT value FROM satuklik_data WHERE collection=? AND item_key=?',ref(c,i));return r?.results?.length?JSON.parse(r.results[0].value):null},
 async set(c,i,d){await ensure();const old=await this.get(c,i);await this.put(c,i,{...(old||{}),...d})},
 async put(c,i,d){await ensure();await query('INSERT INTO satuklik_data(collection,item_key,value,at) VALUES(?,?,?,?) ON CONFLICT(collection,item_key) DO UPDATE SET value=excluded.value, at=excluded.at',[String(c),String(i),JSON.stringify(d),Number(d.at)||Date.now()])},
 async list(c,n){await ensure();const r=await query('SELECT item_key,value FROM satuklik_data WHERE collection=? ORDER BY at DESC LIMIT ?', [String(c),Math.max(0,Number(n)||0)]);return(r?.results||[]).map(x=>({id:x.item_key,...JSON.parse(x.value)}))},
 async bind(h,uid,dev){
  await ensure();const old=await this.get('licenses',h);if(!old)return'none';if(old.off)return'off';if(old.uid&&old.uid!==uid)return'milik';if(old.dev&&old.dev!==dev)return'perangkat';
  const l={...old,uid,dev},r=await query('UPDATE satuklik_data SET value=?,at=? WHERE collection=? AND item_key=? AND value=?',[JSON.stringify(l),Date.now(),'licenses',String(h),JSON.stringify(old)]);
  if(!r?.meta?.changes)return'perangkat';await this.set('users',uid,{lic:h});return'ok'
 },
 async kick(uid){await admin.auth().revokeRefreshTokens(uid)}
});
