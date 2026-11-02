import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{digest} from '../worker.mjs';
function setup(){
 const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../migrations/0001_sales.sql',import.meta.url),'utf8'));
 const env={PAYHIP_API_KEY:'fake-test-key',WEBHOOK_TOKEN:'fake-webhook-token',REPORT_TOKEN:'fake-report-token',ADMIN_TOKEN:'fake-admin-token',PRODUCT_KEY:'Q6StN',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};}};}}};return {env,db};
}
const now=Math.floor(Date.now()/1000);
async function payload(overrides={}){return {id:'synthetic-1',type:'paid',date:now-4*86400,price:1799,currency:'USD',email:'test@example.com',unconsented_from_emails:false,items:[{product_key:'Q6StN'}],signature:await digest('fake-test-key'),...overrides};}
function post(p,token='fake-webhook-token'){return new Request(`https://test/webhook?token=${token}`,{method:'POST',body:JSON.stringify(p)});}
function admin(path,token='fake-admin-token',body){return new Request(`https://test${path}`,{method:body?'POST':'GET',headers:{authorization:`Bearer ${token}`},body:body?JSON.stringify(body):undefined});}
test('authentication fails closed and oversized/malformed input rejected',async()=>{
 const {env,db}=setup(); const p=await payload();
 assert.equal((await worker.fetch(post(p,'wrong'),env)).status,401);
 assert.equal((await worker.fetch(post({...p,signature:'bad'}),env)).status,401);
 assert.equal((await worker.fetch(post({...p,price:-1}),env)).status,400);
 assert.equal((await worker.fetch(post({...p,extra:'x'.repeat(70000)}),env)).status,400);
 assert.equal((await worker.fetch(post(null),env)).status,401);
 assert.equal((await worker.fetch(admin('/report','wrong'),env)).status,401);
 assert.equal((await worker.fetch(admin('/followups','fake-report-token'),env)).status,401);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM events').get().n,0);
});
test('atomic retry deduplication, product filter, queue, mark done, refund before paid',async()=>{
 const {env,db}=setup();const p=await payload();
 const responses=await Promise.all(Array.from({length:10},()=>worker.fetch(post(p),env)));
 assert.ok(responses.every(r=>r.status===200));
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM events').get().n,1);
 await worker.fetch(post(await payload({id:'other',items:[{product_key:'other'}]})),env);
 let queue=await (await worker.fetch(admin('/followups'),env)).json(); assert.equal(queue.items.length,1);
 await worker.fetch(admin('/followups/done','fake-admin-token',{event_key:'paid:synthetic-1'}),env);
 queue=await (await worker.fetch(admin('/followups'),env)).json();assert.equal(queue.items.length,0);
 const refund=await payload({id:'refund-first',type:'refunded',date_refunded:now-100,amount_refunded:500});
 await worker.fetch(post(refund),env);await worker.fetch(post(refund),env);
 await worker.fetch(post(await payload({id:'refund-first'})),env);
 await worker.fetch(post(await payload({id:'opt-out',unconsented_from_emails:true})),env);
 queue=await (await worker.fetch(admin('/followups'),env)).json();assert.equal(queue.items.length,0);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM events WHERE type='refunded'").get().n,1);
});
test('UTC report separates currencies and refunds and exposes no personal data',async()=>{
 const {env}=setup();const date=Math.floor(now/86400)*86400-10;
 await worker.fetch(post(await payload({date})),env);
 await worker.fetch(post(await payload({date,id:'eur',currency:'EUR',price:1900})),env);
 await worker.fetch(post(await payload({type:'refunded',date_refunded:date,amount_refunded:500})),env);
 const response=await worker.fetch(admin('/report','fake-report-token'),env); const report=await response.json();
 assert.equal(response.status,200);assert.equal(report.totals.length,3);
 assert.equal(report.totals.find(x=>x.currency==='USD'&&x.type==='paid').amount_minor,1799);
 assert.ok(!JSON.stringify(report).includes('test@example.com'));
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('storage failure returns retryable 503; health checks storage',async()=>{
 const {env}=setup();env.DB.prepare=()=>{throw Error('sensitive details');};
 assert.equal((await worker.fetch(post(await payload()),env)).status,503);
 assert.equal((await worker.fetch(new Request('https://test/health'),env)).status,503);
});
