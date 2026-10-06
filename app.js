// ODD GEN: shared behaviour: intro, mobile menu, YouTube player modal, vault "notify me",
// form submissions and the ticket counter.

// Form inbox: the Google Apps Script web app URL (see google-apps-script/README.md).
// While it's empty, forms are emailed to the crew through FormSubmit instead.
const FORMS_URL = '';
const CREW_EMAIL = 'oddgenproductions@gmail.com';
const FORM_SUBJECTS = { tickets: 'Ticket purchase', booking: 'Booking enquiry', writer: 'Writer application' };

// Sends one form to the crew. Resolves true when it was delivered, false otherwise.
function sendForm(form, data) {
  if (FORMS_URL) {
    // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer.
    return fetch(FORMS_URL, { method: 'POST', body: JSON.stringify(Object.assign({ form }, data)) })
      .then((r) => r.json())
      .then((r) => r.ok === true)
      .catch(() => false);
  }
  // FormSubmit emails the fields to CREW_EMAIL (one-time "Activate" click from that inbox).
  const payload = Object.assign({}, data);
  const who = payload['Full name'] || payload['Name'] || payload['Pen name'] || 'someone';
  payload._subject = `oddgen.in: ${FORM_SUBJECTS[form]} from ${who}`;
  payload._template = 'table';
  payload._captcha = 'false';
  payload._honey = payload.website || '';
  delete payload.website;
  if (payload['Email']) { payload.email = payload['Email']; delete payload['Email']; } // FormSubmit sets reply-to from "email"
  return fetch(`https://formsubmit.co/ajax/${CREW_EMAIL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((r) => String(r.success) === 'true')
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
  const UPI_ID = 'drmayurgiri46@okaxis';
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  const UPI_APPS = {
    gpay: { android: 'com.google.android.apps.nbu.paisa.user', ios: 'gpay://upi/pay?' },
    phonepe: { android: 'com.phonepe.app', ios: 'phonepe://pay?' },
    paytm: { android: 'net.one97.paytm', ios: 'paytmmp://pay?' },
    bhim: { android: 'in.org.npci.upiapp', ios: 'bhim://upi/pay?' },
  };
  const showSelect = document.getElementById('tk-show');
  const qtyInput = document.getElementById('tk-qty');
  const amountEl = document.getElementById('tk-amount');
  const status = document.getElementById('tk-status');

  document.querySelectorAll('.event[data-show]').forEach((ev) => {
    const opt = document.createElement('option');
    opt.value = ev.dataset.show;
    opt.textContent = ev.dataset.show;
    opt.dataset.price = ev.dataset.price || '';
    showSelect.appendChild(opt);
  });

  const amount = () => (Number(showSelect.selectedOptions[0]?.dataset.price) || 0) * Number(qtyInput.value);
  function updateAmount() {
    const total = amount();
    const qty = Number(qtyInput.value);
    amountEl.textContent = total ? `₹${total.toLocaleString('en-IN')}` : 'Price TBA';
    // The UPI ID stays unencoded: some UPI apps misread "%40" in place of "@".
    // Payee name matches the bank account holder, so apps don't flag a name mismatch.
    const params = `pa=${UPI_ID}&pn=Mayur%20Giri&cu=INR&tn=${encodeURIComponent(`ODD GEN tickets x${qty}`)}${total ? `&am=${total}.00` : ''}`;
    const upiUri = `upi://pay?${params}`;
    // A bare upi:// link opens whatever app the phone defaults to (often WhatsApp), so each button targets its app:
    // Android intents name the app's package; iOS uses each app's own URL scheme.
    document.querySelectorAll('.tc-apps [data-app]').forEach((el) => {
      const app = UPI_APPS[el.dataset.app];
      if (!app) { el.href = upiUri; return; }
      el.href = IS_ANDROID ? `intent://pay?${params}#Intent;scheme=upi;package=${app.android};end` : `${app.ios}${params}`;
    });
    // Redraw the QR with the amount baked in; the static QR (no amount) stays if the generator didn't load.
    if (window.qrcode) {
      const qr = qrcode(0, 'M');
      qr.addData(upiUri);
      qr.make();
      document.getElementById('tk-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true, alt: `UPI QR code to pay ${total ? '₹' + total : ''} to ${UPI_ID}` });
      document.getElementById('tk-qr-caption').textContent = total ? `Scan to pay ₹${total.toLocaleString('en-IN')}` : 'Scan to pay';
    }
  }
  const setQty = (n) => { qtyInput.value = String(Math.min(10, Math.max(1, n))); updateAmount(); };
  counter.querySelector('[data-step="-1"]').addEventListener('click', () => setQty(Number(qtyInput.value) - 1));
  counter.querySelector('[data-step="1"]').addEventListener('click', () => setQty(Number(qtyInput.value) + 1));
  qtyInput.addEventListener('change', () => setQty(Number(qtyInput.value) || 1));
  showSelect.addEventListener('change', updateAmount);
  updateAmount();

  document.getElementById('tk-copy').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(UPI_ID).then(done, () => {});
  });

  // "Get tickets" on an event row jumps here with that show picked
  document.querySelectorAll('[data-ticket-show]').forEach((a) => a.addEventListener('click', () => {
    showSelect.value = a.dataset.ticketShow;
    updateAmount();
  }));

  counter.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!counter.reportValidity()) return;
    const total = amount();
    const data = {
      'Show': showSelect.value,
      'Tickets': qtyInput.value,
      'Amount paid': total ? `₹${total}` : 'Price TBA',
      'Full name': document.getElementById('tk-name').value.trim(),
      'WhatsApp': document.getElementById('tk-phone').value.trim(),
      'Email': document.getElementById('tk-email').value.trim(),
      'UPI transaction ID': document.getElementById('tk-utr').value.trim(),
      website: counter.elements.website.value,
    };
    const btn = counter.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    sendForm('tickets', data).then((sent) => {
      btn.disabled = false;
      btn.textContent = "I've paid, send my details";
      if (sent) {
        status.textContent = `Thanks, ${data['Full name'].split(' ')[0]}! We've got your details for ${data['Tickets']} ticket(s) to ${data['Show']}. Once we've matched your payment (UPI ref ${data['UPI transaction ID']}), we'll send your entry pass on WhatsApp to ${data['WhatsApp']}.`;
        counter.reset();
        setQty(1);
      } else {
        delete data.website;
        mailForm(`Ticket purchase: ${data['Show']}`, data);
        status.textContent = `Your email app should have opened with your details. Hit send so we can match your payment. Nothing opened? Email ${CREW_EMAIL} with your name and UPI transaction ID.`;
      }
      status.hidden = false;
    });
  });
}
