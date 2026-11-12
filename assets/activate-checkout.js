/* IZZOPAC Payhip checkout links: static, validated fallback for products
 * that already have a verified Payhip URL in data/checkout-links.json.
 * Never store paid downloads or credentials in the public repository.
 */
(() => {
  'use strict';
  // Campaign labels only: no visitor identifiers, cookies, fingerprinting or tracking calls.
  function taggedCheckout(url) {
    const valid = validUrl(url);
    if (!valid) return null;
    const target = new URL(valid);
    const incoming = new URLSearchParams(location.search);
    const fromPhotographers =
      incoming.get('utm_campaign') === 'photographer_booking_flow';
    target.searchParams.set('utm_source', 'izzopac_auditor');
    target.searchParams.set('utm_medium', 'website');
    target.searchParams.set('utm_campaign', fromPhotographers ?
      'photographer_booking_flow' : 'free_website_audit');
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
    // HTML already contains a validated Payhip fallback for active products.
    // Config fetch refreshes the destination; network failure never hides that link.
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
          link.href = taggedCheckout(next);
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
        const fallback = validUrl(link.getAttribute('href'));
        link.hidden = !fallback;
        if (fallback) {
          link.href = taggedCheckout(fallback);
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else setNotice(key, 'Checkout is temporarily unavailable. Please contact support.');
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, {once:true});
  else activate();
})();
