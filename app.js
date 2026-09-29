// ODD GEN — shared behaviour: intro, mobile menu, YouTube player modal, vault "notify me".

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

// Video modal — any element with data-video="<youtube id>" opens the player
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
