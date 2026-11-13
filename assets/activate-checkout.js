/* IZZOPAC Payhip checkout links: static, validated fallback for products
 * that already have a verified Payhip URL in data/checkout-links.json.
 * Never store paid downloads or credentials in the public repository.
 */
(() => {
  'use strict';
  // Campaign labels only: no visitor identifiers, cookies, fingerprinting or tracking calls.
  function taggedCheckout(url, key) {
    const valid = validUrl(url);
    if (!valid) return null;
    const target = new URL(valid);
    const incoming = new URLSearchParams(location.search);
    const fromPhotographers =
      incoming.get('utm_campaign') === 'photographer_booking_flow';
    const safeLabel = value => /^[a-zA-Z0-9_-]{1,80}$/.test(value || '') ? value : null;
    const defaultSource = key === 'quickcards' ? 'izzopac_quickcards' : key === 'chaos_premium' ? 'izzopac_chaos' : 'izzopac_auditor';
    target.searchParams.set('utm_source', safeLabel(incoming.get('utm_source')) || defaultSource);
    target.searchParams.set('utm_medium', safeLabel(incoming.get('utm_medium')) || 'website');
    target.searchParams.set('utm_campaign', safeLabel(incoming.get('utm_campaign')) || (fromPhotographers ?
      'photographer_booking_flow' : (key === 'quickcards' ? 'quickcards' : key === 'chaos_premium' ? 'chaos_premium' : 'free_website_audit')));
    const variant = safeLabel(incoming.get('utm_content'));
    if (variant) target.searchParams.set('utm_content', variant);
    return target.href;
  }
  const validUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        url.hostname === 'payhip.com' &&
        /^\/b\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) ? url.href : null;
    } catch { return null; }
  };
  async function activate() {
    const links = [...document.querySelectorAll('[data-product-checkout]')];
    if (!links.length) return;
    const setNotice = (key, message) => {
      const node = document.querySelector('[data-pending-checkout="' + key + '"]');
      if (node) { node.textContent = message; node.hidden = false; }
    };
    // Only a verified configuration may expose a purchase link.
    // Keep pending products unavailable while loading and on network errors.
    for (const link of links) link.hidden = true;
    try {
      const response = await fetch('data/checkout-links.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Checkout configuration unavailable');
      const config = await response.json();
      for (const link of links) {
        const key = link.dataset.productCheckout;
        const entry = config[key];
        const next = entry?.status === 'verified' ? validUrl(entry.url) : null;
        const current = validUrl(link.getAttribute('href'));
        if (next) {
          link.href = taggedCheckout(next, key);
          link.hidden = false;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          const pending = document.querySelector('[data-pending-checkout="' + key + '"]');
          if (pending) pending.hidden = true;
        } else {
          // Explicitly pending or invalid configuration: do not offer a checkout.
          link.hidden = true;
          setNotice(key, 'Checkout is temporarily unavailable. Please contact support.');
        }
        if (!current && !next) link.hidden = true;
      }
    } catch {
      for (const link of links) {
        const key = link.dataset.productCheckout;
        link.hidden = true;
        setNotice(key, 'Checkout is temporarily unavailable. Please contact support.');
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, {once:true});
  else activate();
})();
