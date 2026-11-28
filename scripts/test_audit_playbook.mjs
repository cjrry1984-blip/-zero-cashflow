import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(process.env.AUDIT_HTML ?? new URL('../website-auditor.html', import.meta.url), 'utf8');
const auditScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('function renderPlaybookNext'));
assert.ok(auditScript, 'the production audit logic is under test');

function mockNode() {
  return { hidden: true, children: [], handlers: {}, addEventListener(k, f) { this.handlers[k] = f; },
    replaceChildren(...c) { this.children = c; }, append(...c) { this.children.push(...c); }, scrollIntoView() {} };
}
function report(list = [], groups = {}) {
  const audits = Object.fromEntries(list.map(([id, score, mode = 'numeric']) => [id, {id, score, title: 'Finding '+id, description: 'Actionable free detail', scoreDisplayMode: mode}]));
  const categories = Object.fromEntries(['performance','accessibility','best-practices','seo'].map(id => [id, {score: 0.75, auditRefs: (groups[id] ?? []).map(id=>({id}))}]));
  return {lighthouseResult:{audits,categories}};
}
function boot() {
  const nodes = new Map();
  const el = id => nodes.get(id) ?? nodes.set(id,mockNode()).get(id);
  el('site-url').value='https://example.com/path?case=private';
  let next = report(), calls = [];
  const globals = { URL, AbortController, setTimeout, clearTimeout, document:{ getElementById: el, createElement:mockNode, createTextNode:s=>s },
    fetch: async u=>{calls.push(u);if(next instanceof Error)throw next;return {ok:true,json:async()=>next};} };
  vm.runInNewContext(auditScript[1], globals);
  return {el,calls,submit(r) { next=r;return el('audit-form').handlers.submit({preventDefault() {}}); }};
}
test('first displayed supported finding offers a usable free step and optional Playbook',async()=>{
  const h=boot();
  await h.submit(report([['seo-issue',0.2],['speed-issue',0.4]],{seo:['seo-issue'],performance:['speed-issue']}));
  assert.equal(h.el('result').hidden,false);
  assert.equal(h.el('playbook-next').hidden,false);
  assert.equal(h.el('playbook-next-title').textContent,'Start with SEO');
  assert.match(h.el('playbook-next-free').textContent,/rerun the free audit/);
  assert.match(h.el('playbook-next-guide').textContent,/optional Playbook/);
  assert.equal(h.el('actions').children.length,2);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].hostname,'www.googleapis.com');
});
test('supports speed and accessibility without requiring a purchase',async()=>{
  const h=boot();
  for (const [key,title] of [['performance','Start with speed'],['accessibility','Start with accessibility']]) {
    await h.submit(report([['issue',0.4]],{[key]:['issue']}));
    assert.equal(h.el('playbook-next-title').textContent,title);
  }
});
test('unmapped, passing, and manual items do not produce a misleading offer',async()=>{
  const h=boot();
  await h.submit(report([['no',0.1],['manual',0.2,'manual'],['pass',0.95]],{'best-practices':['no'],seo:['manual','pass']}));
  assert.equal(h.el('playbook-next').hidden,true);
  assert.equal(h.el('actions').children[0].children[0].textContent,'Finding no');
});
test('new results clear stale guidance; API failure leaves only fallback',async()=>{
  const h=boot();
  await h.submit(report([['issue',0.4]],{seo:['issue']}));
  assert.equal(h.el('playbook-next').hidden,false);
  await h.submit(report());
  assert.equal(h.el('playbook-next').hidden,true);
  assert.equal(h.el('actions').children[0].children[0].textContent,'No scored issues returned');
  await h.submit(new Error('Test API failure'));
  assert.equal(h.el('result').hidden,true);
  assert.equal(h.el('error').hidden,false);
});
test('keeps the verified Payhip guard, free checklist, print control, and no new network integrations',()=>{
  assert.match(html,/<a href="#website-fix-playbook">See the Website Fix Playbook \(€9\)<\/a>/);
  assert.match(html,/data-product-checkout="website_playbook" hidden[^>]*href="https:\/\/payhip\.com\/b\/xCQTj"/);
  assert.equal([...html.matchAll(/data-product-checkout="website_playbook"/g)].length,1);
  assert.match(html,/Open the free checklist/);
  assert.match(html,/Print \/ Save as PDF/);
  assert.match(html,/src="assets\/activate-checkout\.js"/);
  assert.equal([...auditScript[1].matchAll(/\bfetch\(/g)].length,1);
});
