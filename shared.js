// shared.js — nav injection + toggle + active state + lightbox

// ── Nav HTML (edit here to update nav across all pages) ──
const NAV_DESKTOP = `
  <a href="index.html" class="nav-name">Emily Nicoll</a>
  <div class="nav-section">
    <span class="nav-label">music + art</span>
    <a href="album-art.html">album art</a>
    <a href="music-videos.html">music videos</a>
    <a href="pacific-spirit.html">pacific spirit</a>
  </div>
  <div class="nav-divider"></div>
  <div class="nav-section">
    <span class="nav-label">digital works</span>
    <a href="whimsies.html">whimsies</a>
    <a href="hypnotics.html">hypnotics</a>
    <a href="spinning-flowers.html">spinning flowers</a>
    <a href="still-image-series.html">still image series</a>
    <a href="animations.html">animations</a>
    <a href="resonance-reverie.html">resonance &amp; reverie</a>
    <a href="pellucid-petals.html">pellucid petals</a>
  </div>
  <div class="nav-divider"></div>
  <div class="nav-section">
    <a href="information.html">information</a>
    <a href="https://aquaregiarecords.com/" target="_blank" class="nav-ext-link">aquaregia</a>
  </div>
`;

const NAV_MOBILE_MENU = `
  <div class="mobile-menu-label">music + art</div>
  <a href="album-art.html">album art</a>
  <a href="music-videos.html">music videos</a>
  <a href="pacific-spirit.html">pacific spirit</a>
  <div class="mobile-menu-divider"></div>
  <div class="mobile-menu-label">digital works</div>
  <a href="whimsies.html">whimsies</a>
  <a href="hypnotics.html">hypnotics</a>
  <a href="spinning-flowers.html">spinning flowers</a>
  <a href="still-image-series.html">still image series</a>
  <a href="animations.html">animations</a>
  <a href="resonance-reverie.html">resonance &amp; reverie</a>
  <a href="pellucid-petals.html">pellucid petals</a>
  <div class="mobile-menu-divider"></div>
  <a href="information.html">information</a>
  <a href="https://aquaregiarecords.com/" target="_blank">aquaregia ↗</a>
`;

document.addEventListener('DOMContentLoaded', () => {

  // ── Inject mobile name button ──
  if (!document.querySelector('.mobile-name')) {
    const mobileNameEl = document.createElement('a');
    mobileNameEl.className = 'mobile-name';
    mobileNameEl.href = 'index.html';
    mobileNameEl.textContent = 'Emily Nicoll';
    document.body.insertBefore(mobileNameEl, document.body.firstChild);
  }

  // ── Inject nav ──
  const desktopNav = document.querySelector('nav.left-nav');
  if (desktopNav) desktopNav.innerHTML = NAV_DESKTOP;

  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) mobileMenu.innerHTML = NAV_MOBILE_MENU;

  // ── Mobile menu toggle ──
  const btn = document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => menu.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // ── Active nav link ──
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.left-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href === currentFile) a.classList.add('active');
  });

  // ── Lightbox ──
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <span class="lightbox-close">close ✕</span>
    <div class="lightbox-inner"></div>
    <div class="lb-caption"></div>
  `;
  document.body.appendChild(lb);

  const lbInner   = lb.querySelector('.lightbox-inner');
  const lbCaption = lb.querySelector('.lb-caption');
  const lbClose   = lb.querySelector('.lightbox-close');

  function openLightbox(src, caption, isVideo) {
    lbInner.innerHTML = isVideo
      ? `<video src="${src}" autoplay loop muted playsinline></video>`
      : `<img src="${src}" alt="${caption || ''}">`;
    lbCaption.textContent = caption || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lbInner.innerHTML = '';
    document.body.style.overflow = '';
  }

  lb.addEventListener('click', e => {
    if (e.target === lb || e.target === lbClose) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

  document.querySelectorAll('.grid-item img').forEach(img => {
    img.addEventListener('click', () => {
      const cap = img.closest('.grid-item')?.querySelector('.caption')?.textContent;
      openLightbox(img.src, cap, false);
    });
  });

  document.querySelectorAll('.grid-item video').forEach(vid => {
    vid.addEventListener('click', () => {
      const cap = vid.closest('.grid-item')?.querySelector('.caption')?.textContent;
      openLightbox(vid.src, cap, true);
    });
  });

});
