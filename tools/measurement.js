/* IZZOPAC: optional aggregate measurement. Never read calculator inputs. */
(() => {
  'use strict';
  const endpoint = 'https://izzopac-solutions.goatcounter.com/count';
  const key = 'izzopac_measurement_v1';
  const params = new URLSearchParams(location.search);
  const source = ['facebook', 'instagram'].includes(params.get('utm_source')) ? params.get('utm_source') : 'direct-other';
  const campaign = ['launch_14d', 'toolbox_launch'].includes(params.get('utm_campaign')) ? params.get('utm_campaign') : 'none';
  const content = /^(0[1-9]|10|intro|calculator)$/.test(params.get('utm_content') || '') ? params.get('utm_content') : 'none';
  const test = params.get('measurement_test') === '1';
  const prefix = test ? 'test-' : '';
  const attribution = `${source}/${campaign}/${content}`;
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const panel = document.getElementById('measurement-choice');
  const status = document.getElementById('measurement-status');
  let choice = '';
  let loaded = false;
  let pageSent = false;
  try { choice = localStorage.getItem(key) || ''; } catch (_) {}
  function remember(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function count(path, title, event) {
    if (choice !== 'yes' || blocked || typeof window.goatcounter?.count !== 'function') return;
    try { window.goatcounter.count({path, title, event, referrer: '', query: '', screen: [0, 0, 1]}); } catch (_) {}
  }
  function pageview() {
    if (pageSent || choice !== 'yes' || blocked || typeof window.goatcounter?.count !== 'function') return;
    pageSent = true;
    count(`/${prefix}calculator/${attribution}`, 'IZZOPAC calculator visit', false);
  }
  function start() {
    if (blocked || choice !== 'yes') return;
    if (loaded) { pageview(); return; }
    loaded = true;
    window.goatcounter = {no_onload: true, no_events: true, endpoint, referrer: '', query: '', screen: [0, 0, 1]};
    const script = document.createElement('script');
    script.src = 'https://gc.zgo.at/count.js';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      // The vendor client otherwise includes location.search automatically.
      const original = window.goatcounter.get_data;
      window.goatcounter.get_data = vars => {
        const data = original(vars);
        data.q = '';
        data.s = 0;
        return data;
      };
      pageview();
    };
    script.onerror = () => { loaded = false; };
    document.head.appendChild(script);
  }
  function update() {
    panel.hidden = blocked || choice !== '';
    status.textContent = blocked ? 'Optional statistics are off because of your browser privacy preference.' : choice === 'yes' ? 'Optional statistics: on.' : 'Optional statistics: off.';
  }
  document.getElementById('measurement-allow').addEventListener('click', () => { remember('yes'); update(); start(); });
  document.getElementById('measurement-decline').addEventListener('click', () => { remember('no'); update(); });
  document.getElementById('measurement-settings').addEventListener('click', () => {
    if (blocked) { update(); return; }
    remember(''); update(); panel.focus();
  });
  document.querySelectorAll('a[href]').forEach(anchor => {
    const url = new URL(anchor.href, location.href);
    if (url.hostname !== 'payhip.com') return;
    const product = anchor.dataset.product || (url.pathname === '/Izzopac' ? 'store' : 'contact');
    if (!['Bo4CA', 'FXWte', 'TsARD', 'mqa8e', 'Ijg8S', 'Hh1UA', 'store'].includes(product)) return;
    anchor.addEventListener('click', () => count(`${prefix}product-click/${product}/${attribution}`, `Product click: ${product}`, true));
  });
  update();
  start();
})();