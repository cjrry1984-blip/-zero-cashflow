import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/activate-checkout.js', import.meta.url), 'utf8');
const config = {
  quickcards: {status: 'verified', url: 'https://payhip.com/b/fixture-cards'},
  website_playbook: {status: 'verified', url: 'https://payhip.com/b/fixture-playbook'},
  chaos_premium: {status: 'verified', url: 'https://payhip.com/b/fixture-chaos'}
};
const playbookKey = 'website_playbook';
const playbook = config[playbookKey];

async function simulate({
  key = playbookKey,
  search = '',
  getResponse = async () => ({ok: true, json: async () => config})
} = {}) {
  const button = {
    dataset: {productCheckout: key},
    href: config[key].url,
    hidden: false,
    getAttribute(name) { return this[name] ?? null; }
  };
  const notice = {hidden: true, textContent: ''};
  const document = {
    readyState: 'complete',
    querySelectorAll(selector) {
      return selector === '[data-product-checkout]' ? [button] : [];
    },
    querySelector(selector) {
      return selector === '[data-pending-checkout="' + key + '"]' ? notice : null;
    }
  };
  const requests = [];
  const fetch = (url, {cache}) => {
    requests.push({url, cache});
    return getResponse();
  };
  const location = new URL('https://izzopac.test/website-auditor.html' + search);
  vm.runInNewContext(source, {document, location, URL, URLSearchParams, fetch}, {
    filename: 'activate-checkout.js'
  });
  assert.equal(button.hidden, true, 'A static checkout link must stay hidden while fetching');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(requests, [{url: 'data/checkout-links.json', cache: 'no-store'}]);
  return {button, notice};
}

function assertOpenCheckout({button, notice}, key, labels) {
  assert.equal(button.hidden, false);
  assert.equal(notice.hidden, true);
  assert.equal(button.target, '_blank');
  assert.ok(button.rel.split(/\s+/).includes('noopener'));
  assert.ok(button.rel.split(/\s+/).includes('noreferrer'));

  const target = new URL(button.href);
  const productPath = new URL(config[key].url).pathname;
  assert.equal(target.origin, 'https://payhip.com');
  assert.equal(target.username + target.password, '');
  if (target.pathname === '/buy') {
    assert.deepEqual(target.searchParams.getAll('link'), [productPath.split('/')[2]]);
    target.searchParams.delete('link');
  } else {
    assert.equal(target.pathname, productPath);
  }
  assert.deepEqual([...target.searchParams].sort(), Object.entries(labels).sort());
}

const routes = [
  ['quickcards', 'izzopac_quickcards', 'quickcards'],
  [playbookKey, 'izzopac_auditor', 'free_website_audit'],
  ['chaos_premium', 'izzopac_chaos', 'chaos_premium']
];
for (const [key, sourceLabel, campaign] of routes) {
  test(key + ' activates a verified route with its default labels', async () => {
    assertOpenCheckout(await simulate({key}), key, {
      utm_source: sourceLabel, utm_medium: 'website', utm_campaign: campaign
    });
  });
}

test('forwards safe photographer labels and excludes unrelated query parameters', async () => {
  const search = '?utm_source=photography_checklist&utm_medium=website&' +
    'utm_campaign=photographer_booking_flow&utm_content=booking-a&' +
    'utm_term=ignored&gclid=ignored&coupon=ignored&link=ignored';
  assertOpenCheckout(await simulate({search}), playbookKey, {
    utm_source: 'photography_checklist', utm_medium: 'website',
    utm_campaign: 'photographer_booking_flow', utm_content: 'booking-a'
  });
});

test('preserves another safe campaign and replaces invalid labels with safe defaults', async () => {
  const search = '?utm_campaign=other&utm_source=person%40example.org&' +
    'utm_medium=two+words&utm_content=' + 'x'.repeat(81);
  assertOpenCheckout(await simulate({search}), playbookKey, {
    utm_source: 'izzopac_auditor', utm_medium: 'website', utm_campaign: 'other'
  });
});

const configurationResponse = entries => async () => ({ok: true, json: async () => entries});
const scenarios = [
  ['network error', async () => { throw new Error('offline'); }],
  ['HTTP error', async () => ({ok: false, json: async () => config})],
  ['invalid JSON', async () => ({ok: true, json: async () => { throw new SyntaxError('invalid JSON'); }})],
  ['missing entry', configurationResponse({})],
  ['pending entry with a stale URL', configurationResponse({[playbookKey]: {...playbook, status: 'pending'}})],
  ['unknown status', configurationResponse({[playbookKey]: {...playbook, status: 'draft'}})]
];
const invalidUrls = [
  ['empty URL', ''],
  ['HTTP URL', 'http://payhip.com/b/fixture-playbook'],
  ['lookalike host', 'https://payhip.com.example.org/b/fixture-playbook'],
  ['nonstandard port', 'https://payhip.com:8443/b/fixture-playbook'],
  ['embedded credentials', 'https://user:password@payhip.com/b/fixture-playbook'],
  ['non-product path', 'https://payhip.com/Izzopac'],
  ['invalid product path', 'https://payhip.com/b/fixture-playbook/extra'],
  ['direct checkout without a product', 'https://payhip.com/buy']
];
for (const [label, url] of invalidUrls) {
  scenarios.push([label, configurationResponse({[playbookKey]: {status: 'verified', url}})]);
}
for (const [label, getResponse] of scenarios) {
  test('keeps checkout hidden after ' + label, async () => {
    const {button, notice} = await simulate({getResponse});
    assert.equal(button.hidden, true);
    assert.equal(notice.hidden, false);
    assert.match(notice.textContent, /temporarily unavailable/i);
  });
}
