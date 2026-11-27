(()=>{const rows=new Map();const chans=[];let hhs={};
function q(table){let filters=[],op='select',payload=null,single=false;
 const api={select(){return api},eq(k,v){filters.push([k,v]);return api},maybeSingle(){single=true;return api},
 upsert(r){op='upsert';payload=r;return api},delete(){op='delete';return api},
 then(res,rej){try{res(run())}catch(e){rej(e)}}};
 function match(r){return filters.every(([k,v])=>r[k]===v)}
 function run(){ if(op==='upsert'){const k=payload.household+'|'+payload.coll+'|'+payload.id;const ex=rows.has(k);rows.set(k,payload);chans.forEach(c=>c({eventType:ex?'UPDATE':'INSERT',new:payload}));return {error:null}}
  if(op==='delete'){for(const [k,r] of [...rows]) if(match(r)){rows.delete(k);chans.forEach(c=>c({eventType:'DELETE',old:r}))}return {error:null}}
  const d=[...rows.values()].filter(match).map(r=>({id:r.id,data:r.data})); return {data:single?(d[0]||null):d,error:null}}
 return api}
window.supabase={createClient(){return {
 functions:{invoke:async(n,{body})=>{window.__ai=(window.__ai||[]).concat([body]); if(body.task==='ping')return {data:{ok:true,data:{claude:true,speech:true}}}; if(body.task==='stt_token')return {data:{ok:false,error:'Kein Spracherkennungs-Schlüssel'}}; if(body.task==='diary')return {data:{ok:true,data:{foods:[{name:'Vollkornbrot',label:'2 Scheiben',grams:100},{name:'Gouda',label:'2 Scheiben',grams:40},{name:'Banane',grams:120}],plans:[],recipes:[]}}}; if(body.task==='meal')return {data:{ok:true,data:{ideas:[{title:'Linsen-Spinat-Curry',why:'Bringt Eisen und Folat, mit Paprika wird das Eisen besser aufgenommen.',use:['Linsen','Spinat','Zwiebeln'],buy:['Paprika rot','Kokosmilch'],steps:['Zwiebeln anbraten, Linsen und Kokosmilch dazu.','20 Minuten köcheln, am Ende Spinat und Paprika unterheben.']},{title:'Ofenlachs mit Kartoffeln',why:'Lachs liefert Vitamin D und Omega-3.',use:['Kartoffeln'],buy:['Lachs'],steps:['Kartoffeln 25 Minuten backen, Lachs die letzten 12 Minuten dazu.']}]}}}; if(body.task==='recipe')return {data:{ok:true,data:{title:'Chili',servings:4,ingredients:[{name:'Hackfleisch',amount:'500 g'},{name:'Kidneybohnen',amount:'1 Dose'}],steps:['Anbraten','Köcheln']}}}; return {error:{message:'x'}};}},
 auth:{getSession:async()=>({data:{session:null}}),signInAnonymously:async()=>({error:null})},
 rpc:async(n,a)=>{ if(n==='news_get'){const r=await fetch('dev/news.json');return {data:window.__newsEmpty?{loading:true}:await r.json(),error:null}} if(n==='push_setup')return {data:window.__pushFail?null:a.p_pub,error:window.__pushFail?{message:'x'}:null}; if(n==='push_test')return {data:null,error:null}; if(n==='create_household'){const r={id:'h1',code:'ABCD2345'};hhs[r.code]=r;return {data:r,error:null}}
   const c=(a.p_code||'').toUpperCase(); if(c==='ABCD2345') return {data:{id:'h1',code:c},error:null}; return hhs[c]?{data:hhs[c],error:null}:{data:null,error:{message:'not_found'}}},
 from:t=>q(t),
 channel(){const ch={on(_a,_b,cb){chans.push(cb);return ch},subscribe(){return ch}};return ch}}}};})();
