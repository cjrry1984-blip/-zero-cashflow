const json = (data, status = 200) => new Response(JSON.stringify(data), {
 status, headers: {'content-type':'application/json', 'cache-control':'no-store', 'x-content-type-options':'nosniff'}
});
export async function digest(value) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function equal(a,b) {
 if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
 let diff=0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff===0;
}
export function normalize(p, key, now) {
 if (!['paid','refunded'].includes(p.type)) return null;
 if (!Array.isArray(p.items) || !p.items.some(i=>i.product_key===key)) return null;
 // Store the whole transaction total, including other basket items. Never claim product-only revenue.
 const occurred=p.type==='paid'?p.date:p.date_refunded;
 const amount=p.type==='paid'?p.price:p.amount_refunded;
 if(typeof p.id!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(p.id) ||
 !Number.isSafeInteger(occurred)||occurred<0||occurred>now+300 ||
 !Number.isSafeInteger(amount)||amount<0 || !/^[A-Z]{3}$/.test(p.currency)) throw Error('Invalid event');
 return {event_key: p.type==='paid'?`paid:${p.id}`:`refunded:${p.id}:${occurred}:${amount}`,
 transaction_id:p.id,type:p.type,occurred,received:now,currency:p.currency,amount,
 // No IP addresses, names, raw payload, signature or license keys stored.
 email:typeof p.email==='string' && p.email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)?p.email:null,
 opted_out:p.unconsented_from_emails===false?0:1};
}
async function readBody(request) {
 const reader=request.body?.getReader(); if(!reader) throw Error('Empty');
 const chunks=[];let size=0;
 while(true){ const {done,value}=await reader.read();if(done)break;size+=value.length;
 if(size>65536){await reader.cancel();throw Error('Too large');} chunks.push(value); }
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export async function buildReport(env,now) {
 // Previous full UTC day, so delayed Actions starts give the same period.
 const end=Math.floor(now/86400)*86400, start=end-86400;
 const totals=await env.DB.prepare(`SELECT currency,type,COUNT(*) AS events,SUM(amount) AS amount_minor
 FROM events WHERE occurred>=? AND occurred<? GROUP BY currency,type ORDER BY currency,type`).bind(start,end).all();
 const due=await env.DB.prepare(`SELECT COUNT(*) AS count FROM events p WHERE p.type='paid'
 AND p.followup_done=0 AND p.opted_out=0 AND p.email IS NOT NULL AND p.occurred<=?
 AND NOT EXISTS(SELECT 1 FROM events r WHERE r.transaction_id=p.transaction_id AND r.type='refunded')`).bind(now-3*86400).first();
 const last=await env.DB.prepare('SELECT MAX(received) AS last_received FROM events').first();
 return {period_start:new Date(start*1000).toISOString(),period_end:new Date(end*1000).toISOString(),
 basis:'whole transactions containing Q6StN; amounts in minor units; currencies separate; webhook observations, not reconciled sales',
 totals:totals.results,followups_due:due.count,last_received:last.last_received,
 warning:'No events does not prove zero sales. Check Payhip dashboard and webhook configuration. Refund duplicates use id/date/amount; reconcile ambiguous partial refunds manually.'};
}
export default {
 async scheduled(event,env) {
  const report=await buildReport(env,Math.floor(event.scheduledTime/1000));
  await env.DB.prepare('INSERT INTO daily_reports (period_start,generated_at,report_json) VALUES (?,?,?) ON CONFLICT(period_start) DO UPDATE SET generated_at=excluded.generated_at,report_json=excluded.report_json')
   .bind(report.period_start,Math.floor(Date.now()/1000),JSON.stringify(report)).run();
 },
 async fetch(request,env) {
 const url=new URL(request.url), now=Math.floor(Date.now()/1000);
 try {
 if(url.pathname==='/health' && request.method==='GET') {
 await env.DB.prepare('SELECT 1').first();return json({status:'ready',sales_verified:false});
 }
 if(url.pathname==='/webhook' && request.method==='POST') {
 if(!env.PAYHIP_API_KEY || !env.WEBHOOK_TOKEN || !env.PRODUCT_KEY) return json({error:'Not configured'},503);
 if(!equal(url.searchParams.get('token'),env.WEBHOOK_TOKEN))return json({error:'Unauthorized'},401);
 let p;try{p=await readBody(request);}catch{return json({error:'Invalid body (maximum 64 KiB)'},400);}
 if(!equal(p?.signature,await digest(env.PAYHIP_API_KEY)))return json({error:'Unauthorized'},401);
 let e;try{e=normalize(p,env.PRODUCT_KEY,now);}catch{return json({error:'Invalid event'},400);}
 if(!e)return json({status:'ignored'});
 const result=await env.DB.prepare(`INSERT OR IGNORE INTO events
 (event_key,transaction_id,type,occurred,received,currency,amount,email,opted_out)
 VALUES (?,?,?,?,?,?,?,?,?)`).bind(...Object.values(e)).run();
 return json({status:result.meta.changes?'recorded':'duplicate'});
 }
 if(['/report','/followups','/followups/done'].includes(url.pathname)) {
 const secret=url.pathname==='/report'?env.REPORT_TOKEN:env.ADMIN_TOKEN;
 if(!secret || !equal(request.headers.get('authorization'),`Bearer ${secret}`))return json({error:'Unauthorized'},401);
 if(url.pathname==='/report' && request.method==='GET') {
 return json(await buildReport(env,now));
 }
 if(url.pathname==='/followups' && request.method==='GET') {
 const rows=await env.DB.prepare(`SELECT p.event_key,p.email,p.occurred FROM events p WHERE p.type='paid'
 AND p.followup_done=0 AND p.opted_out=0 AND p.email IS NOT NULL AND p.occurred<=?
 AND NOT EXISTS(SELECT 1 FROM events r WHERE r.transaction_id=p.transaction_id AND r.type='refunded')
 ORDER BY p.occurred LIMIT 100`).bind(now-3*86400).all();
 return json({items:rows.results.map(r=>({...r,draft:'Thank you for choosing the Solo Service Business Follow-Up Kit. Have you been able to open the files? Reply if you need help getting started.'})),limit:100});
 }
 if(url.pathname==='/followups/done' && request.method==='POST') {
 let body;try{body=await readBody(request);}catch{return json({error:'Invalid body'},400);}
 if(typeof body.event_key!=='string'||body.event_key.length>110)return json({error:'Invalid key'},400);
 const result=await env.DB.prepare("UPDATE events SET followup_done=1 WHERE event_key=? AND type='paid'").bind(body.event_key).run();
 return json({updated:result.meta.changes});
 }
 return json({error:'Method not allowed'},405);
 }
 return json({error:'Not found'},404);
 }catch {return json({error:'Storage temporarily unavailable; retry later'},503);}
}};
