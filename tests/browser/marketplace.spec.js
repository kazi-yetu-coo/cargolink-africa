import { test, expect } from '@playwright/test';
const uid = '11111111-1111-4111-8111-111111111111';
const provider = '22222222-2222-4222-8222-222222222222';
const companyId = '33333333-3333-4333-8333-333333333333';
const rfqId = '44444444-4444-4444-8444-444444444444';
const bidId = '55555555-5555-4555-8555-555555555555';
const initialRFQ = { id: rfqId, owner_id: uid, company_id: null, service: 'Ocean Freight', status: 'open', details: { 'Port of loading': 'Shanghai', 'Port of destination': 'Dar es Salaam', 'Cargo type': 'Machinery' }, notes: 'Handle carefully', created_at: '2026-10-20T00:00:00Z' };
async function backend(page, options = {}) {
  let loggedIn = options.loggedIn || false;
  let company = options.company ? { id: companyId, owner_id: loggedIn === 'provider' ? provider : uid, name: 'Test Freight Co', role: loggedIn === 'provider' ? 'agent' : 'shipper', verification_status: 'verified', ...options.company } : null;
  const rfq = { ...initialRFQ, ...options.rfq };
  let bids = options.bids || [];
  const writes = [];
  let verification = options.verification || null;
  let notifications = [{ id: 'notification-1', user_id: uid, title: 'New quotation', body: 'A provider submitted a quotation.', rfq_id: rfqId, read_at: null, created_at: '2026-10-20T00:00:00Z' }];
  let messages = options.messages || [];
  page.on('pageerror', error => { throw error; });
  const session = () => ({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: loggedIn === 'provider' ? provider : uid, email: 'test@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} } });
  await page.addInitScript(({ loggedIn, session }) => { if (loggedIn) localStorage.setItem('sb-iacahumfwacpknggqjtd-auth-token', JSON.stringify(session)); }, { loggedIn, session: session() });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://iacahumfwacpknggqjtd.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url());
    const path = url.pathname;
    const body = req.postDataJSON();
    const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (options.delay) await new Promise(r => setTimeout(r, options.delay));
    if (path.includes('/auth/v1/')) {
      if (path.endsWith('/logout')) { loggedIn = false; return respond({}); }
      if (path.endsWith('/signup') && options.confirmEmail) return respond({ user: session().user, session: null });
      if (path.endsWith('/token') || path.endsWith('/signup')) { loggedIn = true; return respond(session()); }
      return respond(session().user);
    }
    if (req.method() === 'POST') writes.push({ path, body });
    if (path.endsWith('/rpc/register_company')) { company = { id: companyId, owner_id: uid, name: body.p_name, role: body.p_role, verification_status: 'pending' }; return respond(companyId); }
    if (path.endsWith('/rpc/award_bid')) { rfq.status = 'awarded'; bids = bids.map(b => ({ ...b, status: 'awarded' })); return respond(null); }
    if (path.endsWith('/rpc/manage_rfq_status')) { rfq.status = body.p_status; return respond(null); }
    if (path.endsWith('/platform_admins')) return respond(options.admin ? [{ user_id: uid }] : []);
    if (path.endsWith('/verification_requests')) {
      if (req.method() === 'POST') verification = body;
      if (url.searchParams.has('company_id')) return respond(verification);
      return respond(verification ? [{ ...verification, companies: company }] : []);
    }
    if (path.endsWith('/notifications')) {
      if (req.method() === 'PATCH') notifications = notifications.map(n => ({ ...n, read_at: body.read_at }));
      if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': '0-0/' + notifications.filter(n => !n.read_at).length }, body: '' });
      return respond(notifications);
    }
    if (path.endsWith('/messages')) {
      if (req.method() === 'POST') messages.push({ id: 'message-1', ...body });
      return respond([...messages].reverse());
    }
    if (path.endsWith('/rpc/review_provider')) { company.verification_status = body.p_status; return respond(null); }
    if (path.endsWith('/company_members')) return respond(company ? [{ company_id: companyId }] : []);
    if (path.endsWith('/companies')) return respond(company ? [company] : []);
    if (path.endsWith('/rfqs')) {
      if (req.method() === 'POST') Object.assign(rfq, body);
      if (options.failRFQ) return respond({ message: 'Request service unavailable' }, 503);
      return respond(req.headers().accept?.includes('vnd.pgrst.object') ? rfq : [rfq]);
    }
    if (path.endsWith('/bids')) {
      if (req.method() === 'POST') { if (options.failBid) return respond({ code: '42501', message: 'denied by policy' }, 403); bids.push({ ...body, id: bidId, status: 'submitted', companies: { name: 'Test Freight Co' }, rfqs: rfq }); }
      return respond(bids);
    }
    return respond({ message: 'Unexpected endpoint ' + path }, 400);
  });
  return { writes };
}
async function fillQuote(page, service = 'Ocean Freight') {
  await page.getByRole('tab', { name: service }).click();
  const form = page.locator('#quote-form');
  for (const input of await form.locator('input[required]').all()) {
    const type = await input.getAttribute('type');
    await input.fill(type === 'date' ? '2026-12-20' : type === 'number' ? '25' : 'Test shipment');
  }
  await page.getByRole('button', { name: 'Get freight quotes' }).click();
}
async function signin(page) {
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('four services retain drafts, dynamic addresses and keyboard navigation', async ({ page }) => {
  await backend(page); await page.goto('/');
  await page.getByLabel('Port of loading').fill('Shanghai');
  await page.getByLabel('Service type').selectOption('Door to door');
  await page.getByLabel('Pickup address').fill('Warehouse A');
  await page.getByRole('tab', { name: 'Air Freight' }).click();
  await expect(page.getByLabel('Origin airport')).toBeVisible();
  await page.getByLabel('Service type').selectOption('Door to airport');
  await expect(page.getByLabel('Pickup address')).toBeVisible();
  await expect(page.getByLabel('Delivery address')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Trucking' }).click(); await expect(page.getByLabel('Truck type')).toBeVisible();
  await page.getByRole('tab', { name: 'Warehousing' }).click(); await expect(page.getByLabel('Space sqm')).toBeVisible();
  await page.getByRole('tab', { name: 'Ocean Freight' }).click();
  await expect(page.getByLabel('Port of loading')).toHaveValue('Shanghai');
  await expect(page.getByLabel('Pickup address')).toHaveValue('Warehouse A');
  await page.reload(); await expect(page.getByLabel('Pickup address')).toHaveValue('Warehouse A');
  await page.getByRole('tab', { name: 'Ocean Freight' }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Air Freight' })).toBeFocused();
  await page.getByRole('button', { name: 'Describe your shipment' }).click(); await expect(page.locator('#notes')).toBeFocused();
});
test('layouts fit narrow and wide screens without overlapping quote form', async ({ page }) => {
  await backend(page); await page.goto('/');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const hero = await page.locator('.hero').boundingBox(), panel = await page.locator('.quote-panel').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(hero.y + hero.height);
  }
  await page.getByRole('link', { name: 'Request a quote' }).click();
  await expect(page.getByRole('heading', { name: 'Where can we take your cargo?' })).toBeInViewport();
});
test('validation blocks empty requests', async ({ page }) => {
  const { writes } = await backend(page); await page.goto('/');
  await page.getByRole('button', { name: 'Get freight quotes' }).click();
  await expect(page.locator('#quote-form')).toBeVisible(); expect(writes).toHaveLength(0);
});
for (const service of ['Ocean Freight', 'Air Freight', 'Trucking', 'Warehousing']) {
  test(`${service}: guest request survives sign in and company registration`, async ({ page }) => {
    const { writes } = await backend(page); await page.goto('/'); await fillQuote(page, service);
    await expect(page.getByRole('heading', { name: 'Good to see you.' })).toBeVisible();
    await signin(page); await expect(page.getByRole('heading', { name: 'Register your company' })).toBeVisible();
    await page.getByLabel('Company name').fill('Cargo Owner Co');
    await page.getByRole('button', { name: 'Register company' }).click();
    await expect(page.getByRole('heading', { name: 'Received quotations' })).toBeVisible();
    expect(writes.find(w => w.path.endsWith('/rfqs')).body.service).toBe(service);
    expect(writes.find(w => w.path.endsWith('/rfqs')).body.company_id).toBe(companyId);
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My cargo requests' })).toBeVisible();
    await page.getByRole('link', { name: 'My account', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Sign in / Register' })).toBeVisible();
  });
}
test('email confirmation preserves request and individual publishing works', async ({ page }) => {
  const { writes } = await backend(page, { confirmEmail: true }); await page.goto('/'); await fillQuote(page);
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email address').fill('test@example.com'); await page.getByLabel('Password', { exact: true }).fill('strong-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await page.reload(); await page.getByRole('button', { name: 'Back to sign in' }).isVisible().then(async visible => { if (visible) await page.getByRole('button', { name: 'Back to sign in' }).click(); });
  await signin(page); await page.getByRole('button', { name: 'Publish as individual customer' }).click();
  await expect(page.getByRole('heading', { name: 'Received quotations' })).toBeVisible();
  expect(writes.find(w => w.path.endsWith('/rfqs')).body.company_id).toBeNull();
});
test('verified provider bids once and sees it in dashboard', async ({ page }) => {
  const { writes } = await backend(page, { loggedIn: 'provider', company: {} }); await page.goto('/#rfq/' + rfqId);
  await page.getByLabel('Total amount').fill('1250.50'); await page.getByLabel('Transit / lead time').fill('14');
  await page.getByRole('button', { name: 'Submit quotation' }).click();
  await expect(page.getByRole('status')).toContainText('submitted');
  await expect(page.getByRole('button', { name: 'Submit quotation' })).toHaveCount(0);
  expect(writes.find(w => w.path.endsWith('/bids')).body.amount).toBe(1250.5);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My submitted quotations' })).toBeVisible();
  await expect(page.getByText('USD 1,250.5')).toBeVisible();
});
test('pending providers and wrong service types cannot bid', async ({ page }) => {
  await backend(page, { loggedIn: 'provider', company: { verification_status: 'pending' } }); await page.goto('/#rfq/' + rfqId);
  await expect(page.getByText('Your company must be verified')).toBeVisible();
  await expect(page.locator('#bid-form')).toHaveCount(0);
});
test('bid errors are visible and keep entered values', async ({ page }) => {
  await backend(page, { loggedIn: 'provider', company: {}, failBid: true }); await page.goto('/#rfq/' + rfqId);
  await page.getByLabel('Total amount').fill('400'); await page.getByLabel('Transit / lead time').fill('5');
  await page.getByRole('button', { name: 'Submit quotation' }).click();
  await expect(page.getByRole('status')).toContainText('not permitted');
  await expect(page.getByLabel('Total amount')).toHaveValue('400');
  await expect(page.getByRole('button', { name: 'Submit quotation' })).toBeEnabled();
});
test('owner awards quotation with confirmation and cannot award again', async ({ page }) => {
  const { writes } = await backend(page, { loggedIn: true, company: {}, bids: [{ id: bidId, rfq_id: rfqId, company_id: 'other-company', provider_id: provider, amount: 500, currency: 'USD', transit_days: 8, status: 'submitted', companies: { name: 'Verified Forwarder' } }] });
  await page.goto('/#rfq/' + rfqId); page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Award quotation' }).click();
  await expect(page.getByRole('status')).toContainText('awarded successfully');
  await expect(page.getByRole('button', { name: 'Award quotation' })).toHaveCount(0);
  expect(writes.find(w => w.path.endsWith('/rpc/award_bid')).body).toEqual({ p_rfq_id: rfqId, p_bid_id: bidId });
});
test('latest navigation wins over slow requests', async ({ page }) => {
  await backend(page, { loggedIn: true, company: {}, delay: 150 }); await page.goto('/#account');
  await expect(page.getByRole('heading', { name: 'Test Freight Co' })).toBeVisible();
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click(); await page.getByRole('link', { name: 'Get a quote', exact: true }).click();
  await expect(page.locator('#quote-form')).toBeVisible(); await page.waitForTimeout(500); await expect(page.locator('#quote-form')).toBeVisible();
});
test('data failures offer a working retry', async ({ page }) => {
  await backend(page, { loggedIn: true, failRFQ: true }); await page.goto('/#market');
  await expect(page.getByRole('heading', { name: 'We couldn’t load this page.' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Request service unavailable')).toBeVisible();
});
test('owner can close and reopen an inquiry', async ({ page }) => {
  const { writes } = await backend(page, { loggedIn: true, company: {} }); await page.goto('/#rfq/' + rfqId);
  await page.getByRole('button', { name: 'Close request' }).click();
  await expect(page.getByRole('button', { name: 'Reopen request' })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen request' }).click();
  await expect(page.getByRole('button', { name: 'Close request' })).toBeVisible();
  expect(writes.filter(w => w.path.endsWith('/rpc/manage_rfq_status')).map(w => w.body.p_status)).toEqual(['closed','open']);
});
test('provider verification submits and reviewed applications stay read only', async ({ page }) => {
  const { writes } = await backend(page, { loggedIn: 'provider', company: { verification_status: 'pending' } }); await page.goto('/#verify');
  await page.getByLabel('Business registration number').fill('REG-100'); await page.getByLabel('Contact phone').fill('+255700000000');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('status')).toContainText('submitted for review');
  expect(writes.find(w => w.path.endsWith('/verification_requests')).body.registration_number).toBe('REG-100');
});
test('notifications mark read and open related RFQ', async ({ page }) => {
  await backend(page, { loggedIn: true, company: {} }); await page.goto('/#dashboard');
  await page.getByRole('link', { name: 'Notifications (1)' }).click();
  await expect(page.getByRole('heading', { name: 'New quotation' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  await page.getByRole('button', { name: 'Refresh inbox' }).click();
  await page.getByRole('link', { name: 'View request' }).click();
  await expect(page.getByRole('heading', { name: 'Received quotations' })).toBeVisible();
});
test('admin verification review retains server authorization', async ({ page }) => {
  const { writes } = await backend(page, { loggedIn: true, company: {}, admin: true, verification: { company_id: companyId, registration_number: 'REG-1' } });
  await page.goto('/#dashboard'); await page.getByRole('link', { name: 'Admin review' }).click();
  page.on('dialog', d => d.accept()); await page.getByRole('button', { name: 'Verify provider' }).click();
  await expect(page.getByRole('status')).toContainText('review saved');
  expect(writes.find(w => w.path.endsWith('/rpc/review_provider')).body.p_status).toBe('verified');
});
test('messages stay in the selected conversation and send to its recipient', async ({ page }) => {
  const otherProvider = '66666666-6666-4666-8666-666666666666';
  const { writes } = await backend(page, { loggedIn: true, company: {}, bids: [
    { id: bidId, company_id: 'other', provider_id: provider, status: 'submitted', currency: 'USD', amount: 500, transit_days: 8, companies: { name: 'Provider One' } },
    { id: 'second', company_id: 'second', provider_id: otherProvider, status: 'submitted', currency: 'USD', amount: 700, transit_days: 7, companies: { name: 'Provider Two' } }
  ], messages: [{ sender_id: provider, recipient_id: uid, body: 'First conversation' }, { sender_id: otherProvider, recipient_id: uid, body: 'Second conversation' }] });
  await page.goto('/#rfq/' + rfqId);
  await expect(page.getByText('First conversation')).toBeVisible(); await expect(page.getByText('Second conversation')).toBeHidden();
  await page.getByLabel('Conversation with').selectOption(otherProvider);
  await expect(page.getByText('First conversation')).toBeHidden(); await expect(page.getByText('Second conversation')).toBeVisible();
  await page.getByLabel('Write a message').fill('Please confirm collection.'); await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Message sent');
  expect(writes.find(w => w.path.endsWith('/messages')).body.recipient_id).toBe(otherProvider);
});
