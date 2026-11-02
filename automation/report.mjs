// Aggregate data only. Never upload raw API responses, tokens or customer details.
import {appendFileSync} from 'node:fs';
const endpoint=new URL(process.env.PAYHIP_WORKER_URL);
if(endpoint.protocol!=='https:' || !endpoint.hostname.endsWith('.workers.dev') || endpoint.username || endpoint.password || endpoint.search || endpoint.hash)throw Error('Expected HTTPS workers.dev base URL');
if(!process.env.PAYHIP_REPORT_TOKEN)throw Error('Missing report token');
const response=await fetch(new URL('/report',endpoint),{headers:{authorization:`Bearer ${process.env.PAYHIP_REPORT_TOKEN}`},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error(`Report failed: HTTP ${response.status}`);
const r=await response.json();
if(!Array.isArray(r.totals)||!Number.isSafeInteger(r.followups_due)||!Number.isFinite(Date.parse(r.period_start)))throw Error('Invalid report');
const lines=['# Izzopac Payhip webhook report',`UTC day: ${new Date(r.period_start).toISOString().slice(0,10)}`,'','Currency | Event | Count | Amount (minor units)','--- | --- | --- | ---'];
for(const t of r.totals){
 if(!/^[A-Z]{3}$/.test(t.currency)||!['paid','refunded'].includes(t.type)||!Number.isSafeInteger(t.events)||!Number.isSafeInteger(t.amount_minor))throw Error('Invalid totals');
 lines.push(`${t.currency} | ${t.type} | ${t.events} | ${t.amount_minor}`);
}
lines.push('',`Follow-ups due: ${r.followups_due}`,'','Whole transaction amounts containing Q6StN, including other basket items. Gross amounts; fees/taxes not deducted. Currencies are never added together.','No events does not prove zero sales. Reconcile Payhip dashboard; reporting only covers received webhooks.','Refunds: deduplication uses transaction/date/amount; inspect ambiguous partial refunds manually.','Customer drafts and addresses are only available through the separate admin endpoint.');
appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
