import { createClient } from './vendor/supabase.js';

// Public browser credentials for the existing CargoLink project; RLS enforces access.
const db = createClient('https://iacahumfwacpknggqjtd.supabase.co', 'sb_publishable_zFpKvhZPkptRkV-9JQNn4A_yM-4-wM7');
const root = document.getElementById('root');
const types = ['Ocean Freight', 'Air Freight', 'Trucking', 'Warehousing'];
const icons = ['↗', '✈', '→', '▦'];
const schema = {
  'Ocean Freight': ['Port of loading', 'Port of destination', 'Cargo type', 'Equipment', 'Service type', 'Ready date'],
  'Air Freight': ['Origin airport', 'Destination airport', 'Cargo type', 'Weight kg', 'Service type', 'Ready date'],
  Trucking: ['Pickup address', 'Delivery address', 'Cargo type', 'Truck type', 'Weight tonnes', 'Ready date'],
  Warehousing: ['Storage location', 'Storage type', 'Space sqm', 'Duration days', 'Cargo type', 'Start date'],
};
const roles = { shipper: 'Cargo owner / importer / exporter', agent: 'Freight forwarding agent', trucker: 'Trucking provider' };
const storageKey = 'cargolink.quote.v1';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let service = 'Ocean Freight', user = null, companies = [], company = null, quote = {}, pending = false;
let routeVersion = 0, currentPage = 'home', currentId = '', returnRoute = null, authMode = 'signin';
let ready = false, busy = false, authVersion = 0;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved && typeof saved === 'object') {
    quote = saved.quote || {};
    pending = Boolean(saved.pending);
    if (types.includes(saved.service)) service = saved.service;
  }
} catch { /* Private browsing may disable session storage. The form still works in memory. */ }
function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ quote, service, pending })); } catch { /* Nonessential persistence. */ }
}
function notice(message = '', kind = 'error') {
  const el = document.getElementById('notice');
  el.textContent = message;
  el.dataset.kind = kind;
}
function check(result) { if (result.error) throw result.error; return result.data; }
function messageFor(error) {
  if (error.code === '23505') return 'Your company has already submitted a quotation for this RFQ.';
  if (error.code === '42501') return 'This action is not permitted. Check your company verification and service type. If these are correct, contact the platform administrator.';
  return error.message || 'Something went wrong. Please try again.';
}
function inputType(name) {
  return /date/i.test(name) ? 'date' : /Weight|Space|Duration/.test(name) ? 'number' : 'text';
}
function field(name, value = '') {
  const options = name === 'Service type' ? (service === 'Air Freight' ? ['Airport to airport', 'Door to door', 'Door to airport', 'Airport to door'] : ['Port to port', 'Door to door', 'Door to port', 'Port to door']) : name === 'Equipment' ? ['20ft', '40ft', '40ft high cube', 'LCL', 'Reefer'] : null;
  const type = inputType(name);
  const attrs = `data-field="${esc(name)}" name="${esc(name)}" required`;
  return `<label>${esc(name)}${options ? `<select ${attrs}>${options.map(v => `<option ${v === value ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : `<input ${attrs} type="${type}" ${type === 'number' ? `min="${name === 'Duration days' ? 1 : .01}" step="${name === 'Duration days' ? 1 : 'any'}"` : ''} value="${esc(value)}" placeholder="${esc(name)}">`}</label>`;
}
function capture() {
  const form = document.getElementById('quote-form');
  if (!form) return;
  const previous = quote[service] || {};
  const details = { ...previous.details };
  form.querySelectorAll('[data-field]').forEach(el => { details[el.dataset.field] = el.value; });
  quote[service] = { details, notes: form.elements.notes.value };
  persist();
}
function extra() {
  const value = document.querySelector('[data-field="Service type"]')?.value || '';
  const names = value === 'Door to door' ? ['Pickup address', 'Delivery address'] : value.startsWith('Door to ') ? ['Pickup address'] : value.endsWith(' to door') ? ['Delivery address'] : [];
  const target = document.getElementById('extra');
  if (target) target.innerHTML = names.map(n => field(n, quote[service]?.details?.[n])).join('');
}
function home() {
  const values = quote[service] || {};
  return `<section class="hero"><div><p class="eyebrow">Africa's freight connections, in one place</p><h1>Your cargo.<br>Our continent.<br><em>Connected.</em></h1><p>From the first mile to the final destination. Connect with freight providers and find the right way forward.</p><div class="hero-links"><a href="#quote-form" class="button" data-scroll="quote-form">Request a quote ↗</a><a href="#market">Explore the marketplace →</a></div></div><div class="hero-art" aria-hidden="true"><svg viewBox="0 0 400 300" fill="none"><path d="M130 35L205 28L237 57L276 60L301 95L276 132L254 174L221 235L199 267L176 238L169 194L142 167L123 123L90 108L88 77Z" fill="#8bb58a" fill-opacity=".3" stroke="#b8d998" stroke-width="1.5"/><path d="M112 89Q210 35 271 104Q320 190 207 235M112 89Q110 185 207 235M112 89L251 159L207 235" stroke="#c5e595" stroke-width="1.5" stroke-dasharray="5 7"/><g fill="#d9f1a8"><circle cx="112" cy="89" r="6"/><circle cx="271" cy="104" r="6"/><circle cx="251" cy="159" r="6"/><circle cx="207" cy="235" r="6"/></g><text x="53" y="72" fill="#d1e1d9" font-size="11">WEST AFRICA</text><text x="278" y="149" fill="#d1e1d9" font-size="11">EAST AFRICA</text></svg><span class="route-label">Ocean · Air · Road · Storage</span></div></section><div class="container"><section class="quote-panel" aria-label="Freight quotation"><div class="tabs" role="tablist" aria-label="Freight service">${types.map((t, i) => `<button type="button" role="tab" id="tab-${i}" aria-selected="${t === service}" aria-controls="quote-fields" tabindex="${t === service ? 0 : -1}" data-service="${esc(t)}" class="${t === service ? 'active' : ''}">${icons[i]} ${esc(t)}</button>`).join('')}</div><form id="quote-form" class="form-body"><div class="section-head"><div><h2>Where can we take your cargo?</h2><p>Share the details. Let freight providers come to you.</p></div><span class="step">01 / REQUEST A QUOTE</span></div><div id="quote-fields" role="tabpanel" aria-labelledby="tab-${types.indexOf(service)}"><div class="grid">${schema[service].map(n => field(n, values.details?.[n])).join('')}</div><div id="extra" class="grid"></div><label class="notes-label">Additional requirements <span class="muted">(optional)</span><textarea name="notes" id="notes" maxlength="5000" placeholder="Tell us about dimensions, handling or delivery requirements…">${esc(values.notes)}</textarea></label></div><div class="form-bottom"><p class="muted">Your request is saved on this tab as you go. Sign in to publish and receive quotations.</p><button type="submit">Get freight quotes ↗</button></div></form></section><section class="how"><p class="eyebrow">Less searching. More moving.</p><h2>From request to the right connection.</h2><div class="steps"><article><span class="number">01 / TELL US WHAT MOVES</span><h3>One request. Every detail.</h3><p>Choose your service and share your cargo requirements in a few simple steps.</p></article><article><span class="number">02 / FIND YOUR OPTIONS</span><h3>Quotations in one place.</h3><p>Verified freight providers submit their offers directly to your request.</p></article><article><span class="number">03 / MOVE FORWARD</span><h3>Your cargo. Your choice.</h3><p>Compare price and transit time, then award the quotation that fits your needs.</p></article></div></section><section class="help"><div><h2>Every shipment starts with a conversation.</h2><p>Describe your cargo in your own words. We’ll include it in your quotation request.</p></div><button class="secondary" id="focus">Describe your shipment ↗</button></section></div>`;
}
function companySelector() {
  return companies.length > 1 ? `<label>Active company<select id="active-company">${companies.map(c => `<option value="${esc(c.id)}" ${c.id === company?.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : '';
}
function account() {
  if (!user) return `<div class="container"><section class="panel narrow"><p class="eyebrow">Welcome to CargoLink</p><h1>${authMode === 'signup' ? 'Create your account' : 'Good to see you.'}</h1><p class="muted">${pending ? 'Your quotation request is saved. Sign in to continue.' : 'Manage cargo requests and freight quotations in one place.'}</p><form id="auth-form"><label>Email address<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" ${authMode === 'signup' ? 'minlength="8"' : ''} required></label><div class="actions"><button type="submit">${authMode === 'signup' ? 'Create account' : 'Sign in'}</button><button type="button" class="secondary" id="auth-toggle">${authMode === 'signup' ? 'Back to sign in' : 'Create an account'}</button></div>${authMode === 'signup' ? '<p class="muted">Use at least 8 characters. You may need to confirm your email before signing in.</p>' : ''}</form></section></div>`;
  return `<div class="container"><section class="panel narrow"><p class="eyebrow">Your account</p><h1>${company ? esc(company.name) : 'Register your company'}</h1><p class="muted">${esc(user.email)}</p>${company ? `${companySelector()}<p>${esc(roles[company.role])}</p><p>Verification: <span class="badge">${esc(company.verification_status)}</span></p>${company.role !== 'shipper' && company.verification_status !== 'verified' ? '<div class="banner">Only verified providers can submit quotations. Your company verification is managed by the CargoLink team.</div>' : ''}<div class="actions"><a class="button" href="#dashboard">Open dashboard →</a><button id="logout" class="secondary">Sign out</button></div>` : `<p class="muted">Connect your business to your account. You can also publish a request as an individual customer.</p><form id="company-form"><label>Company name<input name="companyName" minlength="2" maxlength="200" required autocomplete="organization"></label><label>Company type<select name="companyRole">${Object.entries(roles).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label><button type="submit">Register company</button></form><div class="actions">${pending ? '<button id="publish-individual" class="secondary">Publish as individual customer</button>' : '<a href="#home" class="button secondary">Request a quote</a>'}<button id="logout" class="secondary">Sign out</button></div>`}${pending && company ? '<div class="banner">Your request is ready to publish.</div><button id="publish-individual">Publish saved request →</button>' : ''}</section></div>`;
}
function summary(r) {
  const d = r.details || {};
  const from = d['Port of loading'] || d['Origin airport'] || d['Pickup address'] || d['Storage location'] || 'Cargo request';
  const to = d['Port of destination'] || d['Destination airport'] || d['Delivery address'];
  return `${from}${to ? ` → ${to}` : ''}`;
}
function rfqRow(r) {
  return `<article class="record"><div><span class="badge">${esc(r.status)}</span><h3>${esc(summary(r))}</h3><p class="muted">${esc(r.service)} · ${esc(r.details?.['Cargo type'] || 'Cargo')} · ${r.created_at ? esc(new Date(r.created_at).toLocaleDateString()) : ''}</p></div><a class="button secondary" href="#rfq/${esc(r.id)}">View request →</a></article>`;
}
async function listing(mine) {
  if (!user) return account();
  let query = db.from('rfqs').select('*').order('created_at', { ascending: false }).limit(100);
  query = mine ? query.eq('owner_id', user.id) : query.eq('status', 'open');
  const rows = check(await query) || [];
  let bids = [];
  if (mine) bids = check(await db.from('bids').select('*,rfqs(id,service,details,status)').eq('provider_id', user.id).order('created_at', { ascending: false }).limit(100)) || [];
  return `<div class="container"><div class="section-head"><div><p class="eyebrow">${mine ? 'Your freight workspace' : 'Find your next opportunity'}</p><h1>${mine ? 'Dashboard' : 'RFQ Marketplace'}</h1><p class="muted">${mine ? 'Track your requests, quotations and awarded freight.' : 'Open cargo requests. Connect your expertise with the right shipment.'}</p></div><a href="#home" class="button">New freight request ↗</a></div>${mine ? `${!company ? '<div class="banner">Complete your business profile. <a href="#account"><u>Register your company →</u></a></div>' : `<div class="banner">${companySelector()}${esc(company.name)} · ${esc(roles[company.role])} · ${esc(company.verification_status)} <a href="#account"><u>Manage account</u></a></div>`}<div class="stats"><div class="stat"><b>${rows.length}</b><span>Recent requests</span></div><div class="stat"><b>${rows.filter(r => r.status === 'open').length}</b><span>Open requests</span></div><div class="stat"><b>${bids.length}</b><span>Recent quotations</span></div></div>` : ''}<section class="panel"><h2>${mine ? 'My cargo requests' : 'Open requests'}</h2>${rows.map(rfqRow).join('') || '<div class="empty">No requests here yet. Start with a new freight request.</div>'}<p class="muted">Showing up to 100 most recent requests.</p></section>${mine ? `<section class="panel"><h2>My submitted quotations</h2>${bids.map(b => `<article class="record"><div><span class="badge">${esc(b.status)}</span><h3>${esc(b.rfqs ? summary(b.rfqs) : 'Freight request')}</h3><p>${esc(b.currency)} ${esc(Number(b.amount).toLocaleString())} · ${esc(b.transit_days)} days</p></div><a class="button secondary" href="#rfq/${esc(b.rfq_id)}">View quotation →</a></article>`).join('') || '<p class="empty">No quotations submitted yet. Browse the marketplace to find cargo requests.</p>'}<a href="#market" class="button secondary">Browse marketplace →</a></section>` : ''}</div>`;
}
function bidEligibility(r, bids) {
  if (r.owner_id === user.id) return '';
  if (r.status !== 'open') return 'This request is no longer accepting quotations.';
  if (!company) return 'Register a provider company in your account to submit a quotation.';
  if (company.role === 'shipper') return 'Quotations are submitted by freight forwarding agents and trucking providers.';
  if (company.verification_status !== 'verified') return 'Your company must be verified by CargoLink before submitting quotations.';
  if (company.role !== (r.service === 'Trucking' ? 'trucker' : 'agent')) return 'This request requires a ' + (r.service === 'Trucking' ? 'trucking provider.' : 'freight forwarding agent.');
  if (bids.some(b => b.company_id === company.id)) return 'Your company has already submitted a quotation for this request.';
  return null;
}
async function detail(id) {
  if (!user) return account();
  const r = check(await db.from('rfqs').select('*').eq('id', id).single());
  const bids = check(await db.from('bids').select('*,companies(name)').eq('rfq_id', id).order('created_at', { ascending: false })) || [];
  const owner = r.owner_id === user.id;
  const eligibility = bidEligibility(r, bids);
  return `<div class="container"><a href="#${owner ? 'dashboard' : 'market'}" class="muted">← Back to ${owner ? 'dashboard' : 'marketplace'}</a><section class="panel"><p class="eyebrow">${esc(r.service)}</p><h1>${esc(summary(r))}</h1><span class="badge">${esc(r.status)}</span><dl class="details">${Object.entries(r.details || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${r.notes ? `<h3>Additional requirements</h3><p class="text">${esc(r.notes)}</p>` : ''}</section><section class="panel"><h2>${owner ? 'Received quotations' : 'Your quotations'}</h2>${bids.map(b => `<article class="record"><div><span class="badge">${esc(b.status)}</span><h3>${esc(b.companies?.name || 'Freight provider')}</h3><p>${esc(b.currency)} ${esc(Number(b.amount).toLocaleString())} · ${esc(b.transit_days)} days</p><p class="text muted">${esc(b.notes)}</p></div>${owner && r.status === 'open' && b.status === 'submitted' ? `<button data-award="${esc(b.id)}" data-rfqid="${esc(id)}">Award quotation</button>` : ''}</article>`).join('') || '<p class="empty">No quotations yet.</p>'}${!owner ? '<p class="muted">You can see your own quotations. Other providers’ offers are private.</p>' : ''}</section>${!owner ? eligibility ? `<div class="banner">${esc(eligibility)} <a href="#account"><u>Manage account →</u></a></div>` : `<section class="panel"><h2>Submit your quotation</h2><p class="muted">Quoting as ${esc(company.name)}. One quotation per company per request.</p><form id="bid-form" data-rfqid="${esc(id)}"><div class="grid"><label>Currency<select name="currency">${['USD', 'TZS', 'KES', 'NGN', 'UGX', 'RWF'].map(c => `<option>${c}</option>`).join('')}</select></label><label>Total amount<input name="amount" type="number" min="0.01" step="0.01" required></label><label>Transit / lead time (days)<input name="days" type="number" min="1" step="1" required></label></div><label class="notes-label">Quotation notes (optional)<textarea name="bidNotes" maxlength="5000"></textarea></label><div class="form-bottom"><p class="muted">Include any exclusions or special conditions in your notes.</p><button type="submit">Submit quotation →</button></div></form></section>` : ''}</div>`;
}
async function refresh() {
  const version = ++authVersion;
  const result = await db.auth.getSession();
  const session = check(result)?.session;
  const nextUser = session?.user || null;
  let nextCompanies = [];
  if (nextUser) {
    const memberships = check(await db.from('company_members').select('company_id').eq('user_id', nextUser.id)) || [];
    const owned = check(await db.from('companies').select('*').eq('owner_id', nextUser.id).order('created_at', { ascending: true })) || [];
    const memberCompanies = memberships.length ? check(await db.from('companies').select('*').in('id', memberships.map(m => m.company_id))) || [] : [];
    nextCompanies = [...new Map([...owned, ...memberCompanies].map(c => [c.id, c])).values()];
  }
  if (version !== authVersion) return;
  user = nextUser;
  companies = nextCompanies;
  company = companies.find(c => c.id === company?.id) || companies[0] || null;
  document.querySelector('.nav-account').textContent = user ? 'My account' : 'Sign in / Register';
}
async function show() {
  const version = ++routeVersion;
  const [page, id] = location.hash.slice(1).split('/');
  currentPage = ['home', 'account', 'market', 'dashboard', 'rfq'].includes(page) ? page : 'home';
  currentId = id || '';
  if (!ready && currentPage !== 'home') { root.innerHTML = '<div class="loading">Connecting to your freight workspace…</div>'; return; }
  if (!user && ['market', 'dashboard', 'rfq'].includes(currentPage)) returnRoute = location.hash;
  root.setAttribute('aria-busy', 'true');
  if (currentPage !== 'home') root.innerHTML = '<div class="loading">Loading your freight workspace…</div>';
  try {
    const html = currentPage === 'home' ? home() : currentPage === 'account' ? account() : currentPage === 'rfq' ? await detail(currentId) : await listing(currentPage === 'dashboard');
    if (version !== routeVersion) return;
    root.innerHTML = html;
    extra();
    document.querySelectorAll('nav a').forEach(a => a.getAttribute('href') === `#${currentPage}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  } catch (error) {
    if (version === routeVersion) root.innerHTML = `<div class="container"><section class="panel"><h1>We couldn’t load this page.</h1><p>${esc(messageFor(error))}</p><button id="retry">Try again</button> <a href="#home" class="button secondary">Get a quote</a></section></div>`;
  } finally { if (version === routeVersion) root.removeAttribute('aria-busy'); }
}
function go(hash) {
  if (location.hash === hash) return show();
  location.hash = hash;
}
async function publish() {
  if (!user) { pending = true; persist(); return go('#account'); }
  const saved = quote[service];
  if (!saved) throw new Error('Please complete your freight request first.');
  // Use only visible fields: hidden door addresses must not leak into other service options.
  const details = Object.fromEntries(schema[service].map(n => [n, saved.details[n]]));
  const route = details['Service type'] || '';
  if (route.startsWith('Door to ')) details['Pickup address'] = saved.details['Pickup address'];
  if (route.endsWith(' to door')) details['Delivery address'] = saved.details['Delivery address'];
  for (const [name, value] of Object.entries(details)) {
    if (!String(value || '').trim() || (inputType(name) === 'number' && !(Number(value) > 0))) throw new Error(`Please complete ${name.toLowerCase()} before publishing.`);
  }
  const r = check(await db.from('rfqs').insert({ owner_id: user.id, company_id: company?.id || null, service, details, notes: saved.notes || '' }).select().single());
  delete quote[service]; pending = false; persist();
  notice('Your freight request is published. Providers can now submit quotations.', 'success');
  go(`#rfq/${r.id}`);
}
async function run(control, task) {
  if (busy) return;
  busy = true;
  notice();
  const buttons = [...(control.closest('form') || root).querySelectorAll('button')];
  buttons.forEach(b => { b.disabled = true; });
  try { await task(); } catch (error) { notice(messageFor(error)); } finally {
    busy = false; buttons.forEach(b => { b.disabled = false; });
  }
}
document.addEventListener('input', e => { if (e.target.closest('#quote-form')) capture(); });
document.addEventListener('change', async e => {
  if (e.target.matches('[data-field="Service type"]')) { capture(); extra(); capture(); }
  if (e.target.id === 'active-company') { company = companies.find(c => c.id === e.target.value); await show(); }
});
document.addEventListener('keydown', e => {
  const tab = e.target.closest('[data-service]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const index = types.indexOf(service);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (index + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
  document.querySelectorAll('[data-service]')[next].click();
});
document.addEventListener('click', async e => {
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) { e.preventDefault(); document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return; }
  const b = e.target.closest('button');
  if (!b || (b.form && b.type === 'submit')) return;
  if (b.dataset.service) { capture(); service = b.dataset.service; persist(); await show(); document.querySelector('[data-service].active')?.focus({ preventScroll: true }); return; }
  if (b.id === 'focus') { document.getElementById('notes')?.focus(); return; }
  if (b.id === 'retry') return show();
  if (b.id === 'auth-toggle') { authMode = authMode === 'signin' ? 'signup' : 'signin'; return show(); }
  await run(b, async () => {
    if (b.id === 'logout') { check(await db.auth.signOut()); user = null; companies = []; company = null; quote = {}; pending = false; persist(); await refresh(); return go('#home'); }
    if (b.id === 'publish-individual') return publish();
    if (b.dataset.award) {
      if (!window.confirm('Award this quotation? This selects the provider and closes the request to new bids.')) return;
      check(await db.rpc('award_bid', { p_rfq_id: b.dataset.rfqid, p_bid_id: b.dataset.award }));
      notice('Quotation awarded successfully.', 'success'); return show();
    }
  });
});
document.addEventListener('submit', async e => {
  const form = e.target;
  if (!['quote-form', 'auth-form', 'company-form', 'bid-form'].includes(form.id)) return;
  e.preventDefault();
  await run(form.querySelector('button[type="submit"],button:not([type])'), async () => {
    if (!ready) throw new Error('We are still connecting. Please try again in a moment.');
    if (form.id === 'quote-form') {
      capture(); pending = true; persist();
      if (!user || !company) return go('#account');
      return publish();
    }
    if (form.id === 'auth-form') {
      const email = form.elements.email.value.trim(), password = form.elements.password.value;
      const data = check(await (authMode === 'signup' ? db.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/#account` } }) : db.auth.signInWithPassword({ email, password })));
      if (!data.session) { notice('Check your email for a confirmation link, then sign in. Your freight request is saved in this tab.', 'success'); return; }
      await refresh();
      if (pending) { if (company) return publish(); return go('#account'); }
      return go(company ? returnRoute || '#dashboard' : '#account');
    }
    if (form.id === 'company-form') {
      check(await db.rpc('register_company', { p_name: form.elements.companyName.value.trim(), p_role: form.elements.companyRole.value }));
      await refresh();
      if (pending) return publish();
      notice('Company registered successfully.', 'success'); return show();
    }
    if (form.id === 'bid-form') {
      const amount = Number(form.elements.amount.value), days = Number(form.elements.days.value);
      if (!(amount > 0) || !Number.isInteger(days) || days < 1) throw new Error('Enter a positive amount and a whole number of days.');
      check(await db.from('bids').insert({ rfq_id: form.dataset.rfqid, provider_id: user.id, company_id: company.id, currency: form.elements.currency.value, amount, transit_days: days, notes: form.elements.bidNotes.value.trim() }));
      notice('Your quotation has been submitted.', 'success'); return show();
    }
  });
});
window.addEventListener('hashchange', () => { show(); window.scrollTo(0, 0); });
show();
(async () => {
  try { await refresh(); ready = true; await show(); }
  catch (error) { ready = true; notice(`Connection problem: ${messageFor(error)}`); await show(); }
})();
// Defer database work outside the auth callback to avoid holding the auth lock.
db.auth.onAuthStateChange((event, session) => {
  if (!ready || busy || !['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) return;
  if (event === 'SIGNED_IN' && session?.user.id === user?.id) return;
  setTimeout(async () => {
    try { await refresh(); await show(); } catch (error) { notice(messageFor(error)); }
  }, 0);
});
