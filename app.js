// ODD GEN: shared behaviour: intro, mobile menu, YouTube player modal, vault "notify me",
// form submissions and the ticket counter.

// Form inbox: the Google Apps Script web app URL (see google-apps-script/README.md).
// While it's empty, forms fall back to opening the visitor's email app.
const FORMS_URL = '';
const CREW_EMAIL = 'oddgenproductions@gmail.com';

// Sends one form to the Google Sheet. Resolves true when it was saved, false otherwise.
function sendForm(form, data) {
  if (!FORMS_URL) return Promise.resolve(false);
  // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer.
  return fetch(FORMS_URL, { method: 'POST', body: JSON.stringify(Object.assign({ form }, data)) })
    .then((r) => r.json())
    .then((r) => r.ok === true)
    .catch(() => false);
}

// Fallback when the inbox isn't reachable: a pre-filled email to the crew.
function mailForm(subject, data) {
  const body = Object.keys(data).map((k) => `${k}: ${data[k] || '-'}`).join('\n');
  location.href = `mailto:${CREW_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Intro (home page only; the <head> script decides whether it plays). Click to skip.
const intro = document.querySelector('.intro');
if (intro && document.documentElement.classList.contains('intro-on')) {
  const root = document.documentElement;
  intro.addEventListener('animationend', (e) => { if (e.animationName === 'intro-lift') root.classList.remove('intro-on'); });
  intro.addEventListener('click', () => root.classList.remove('intro-on', 'intro-hero'));
}

// Mobile menu
const menuBtn = document.querySelector('.menu-btn');
const menu = document.querySelector('.mobile-menu');
if (menuBtn && menu) {
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
}

// Video modal: any element with data-video="<youtube id>" opens the player
const modal = document.querySelector('.video-modal');
if (modal) {
  const frame = modal.querySelector('.video-frame');
  let lastFocus = null;
  const close = () => {
    modal.classList.remove('open');
    frame.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-video]');
    if (!trigger) return;
    e.preventDefault();
    lastFocus = trigger;
    const id = trigger.dataset.video;
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${trigger.dataset.title || 'ODD GEN video'}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.video-close').focus();
  });
  modal.querySelector('.video-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
}

// Vault "Notify me" toggles
document.querySelectorAll('.notify').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'You’ll be notified' : 'Notify me';
  });
});

// Ticket counter: shows come from the event rows (data-show, optional data-price per ticket)
const counter = document.getElementById('ticket-form');
if (counter) {
  const showSelect = document.getElementById('tk-show');
  const qtyInput = document.getElementById('tk-qty');
  const total = document.getElementById('tk-total');
  const status = document.getElementById('tk-status');
  const events = [...document.querySelectorAll('.event[data-show]')];

  events.forEach((ev) => {
    const opt = document.createElement('option');
    opt.value = ev.dataset.show;
    opt.textContent = ev.dataset.show;
    opt.dataset.price = ev.dataset.price || '';
    showSelect.appendChild(opt);
  });

  const setQty = (n) => { qtyInput.value = String(Math.min(10, Math.max(1, n))); updateTotal(); };
  function updateTotal() {
    const price = Number(showSelect.selectedOptions[0]?.dataset.price);
    total.textContent = price ? `Total ₹${(price * Number(qtyInput.value)).toLocaleString('en-IN')} · pay after we confirm` : 'Price confirmed when we call you back';
  }
  counter.querySelector('[data-step="-1"]').addEventListener('click', () => setQty(Number(qtyInput.value) - 1));
  counter.querySelector('[data-step="1"]').addEventListener('click', () => setQty(Number(qtyInput.value) + 1));
  qtyInput.addEventListener('change', () => setQty(Number(qtyInput.value) || 1));
  showSelect.addEventListener('change', updateTotal);
  updateTotal();

  // "Get tickets" on an event row jumps here with that show picked
  document.querySelectorAll('[data-ticket-show]').forEach((a) => a.addEventListener('click', () => {
    showSelect.value = a.dataset.ticketShow;
    updateTotal();
  }));

  counter.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!counter.reportValidity()) return;
    const data = {
      'Show': showSelect.value,
      'Tickets': qtyInput.value,
      'Name': document.getElementById('tk-name').value.trim(),
      'Phone / WhatsApp': document.getElementById('tk-phone').value.trim(),
      'Email': document.getElementById('tk-email').value.trim(),
      'Note': document.getElementById('tk-note').value.trim(),
      website: counter.elements.website.value,
    };
    const btn = counter.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    sendForm('tickets', data).then((saved) => {
      btn.disabled = false;
      btn.textContent = 'Request tickets';
      if (saved) {
        status.textContent = `Got it, ${data['Name'].split(' ')[0]}! ${data['Tickets']} ticket(s) for ${data['Show']} are on hold. We'll WhatsApp or call you on ${data['Phone / WhatsApp']} to confirm and share payment details.`;
        counter.reset();
        setQty(1);
      } else {
        delete data.website;
        mailForm(`Ticket request · ${data['Show']}`, data);
        status.textContent = `Your email app should have opened with the request. Hit send and we'll confirm. Nothing opened? WhatsApp or email us at ${CREW_EMAIL}.`;
      }
      status.hidden = false;
    });
  });
}
