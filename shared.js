// shared.js — nav toggle + active state + lightbox

document.addEventListener('DOMContentLoaded', () => {

  // ── Mobile menu ──
  const btn  = document.getElementById('hamburger-btn');
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
