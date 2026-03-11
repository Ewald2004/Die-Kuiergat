/* ═══════════════════════════════════════════
   BLAZE & BARREL — script.js
═══════════════════════════════════════════ */

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');
const navBackdrop = document.getElementById('navBackdrop');

function toggleNav(force) {
  const open = force !== undefined ? force : !navLinks.classList.contains('open');
  navLinks.classList.toggle('open', open);
  navBackdrop.classList.toggle('open', open);
  const spans = hamburger.querySelectorAll('span');
  spans[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)' : '';
  spans[1].style.opacity   = open ? '0' : '1';
  spans[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger.addEventListener('click', () => toggleNav());
navBackdrop.addEventListener('click', () => toggleNav(false));
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => toggleNav(false));
});

/* ── Menu Tabs ── */
const tabs = document.querySelectorAll('.menu-tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // deactivate all
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu-grid').forEach(g => g.classList.add('hidden'));
    // activate clicked
    tab.classList.add('active');
    const id = `menu-${tab.dataset.tab}`;
    const grid = document.getElementById(id);
    if (grid) grid.classList.remove('hidden');
  });
});

/* ── Modal helpers ── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

/* ── Toast ── */
function showToast(msg, duration = 3200) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}





/* ════════════════════════════════════
   SPECIALS — Interactive Features
════════════════════════════════════ */

function handleSpecialOrder(specialName) {
  showToast(`🔥 ${specialName} added to your order!`);
  // Here you could add logic to add to cart, open reservation modal, etc.
}

function handleMenuOrder(menuItem) {
  showToast(`🍽️ ${menuItem} added to your order!`);
  // Here you could add logic to add to cart, update order total, etc.
}

function updateSpecialsTime() {
  const now = new Date();
  const hours = now.getHours();
  const specialsCards = document.querySelectorAll('.special-card');

  // Example: Highlight lunch special during lunch hours (11am-3pm)
  const isLunchTime = hours >= 11 && hours < 15;
  specialsCards.forEach(card => {
    if (card.querySelector('.special-badge').textContent.includes('Lunch') && isLunchTime) {
      card.style.border = '3px solid var(--flame)';
      card.style.boxShadow = '0 0 20px rgba(232,66,10,0.3)';
    } else {
      card.style.border = '';
      card.style.boxShadow = '';
    }
  });
}

// Initialize specials functionality
document.addEventListener('DOMContentLoaded', () => {
  // Add click handlers to special buttons
  document.querySelectorAll('.btn-special').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const specialName = e.target.closest('.special-content').querySelector('h3').textContent;
      handleSpecialOrder(specialName);
    });
  });

  // Add click handlers to menu order buttons
  document.querySelectorAll('.btn-menu-order').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.menu-card-body').querySelector('h3').textContent;
      handleMenuOrder(menuItem);
    });
  });

  // Update specials based on time
  updateSpecialsTime();
  setInterval(updateSpecialsTime, 60000); // Check every minute
});

/* ════════════════════════════════════
   GALLERY — Upload & Lightbox
════════════════════════════════════ */

let galleryImages = []; // stores all src strings for lightbox
let lightboxIndex = 0;

/* Collect initial gallery images */
function updateGalleryVisibility() {
  document.querySelectorAll('.gallery-category').forEach(cat => {
    const grid = cat.querySelector('.gallery-grid');
    if (grid && grid.children.length === 0) {
      cat.style.display = 'none';
    } else {
      cat.style.display = '';
    }
  });
}

function refreshGalleryIndex() {
  galleryImages = Array.from(
    document.querySelectorAll('#galleryFloorGrid .gallery-item img, #galleryBarGrid .gallery-item img')
  ).map(img => img.src);
  updateGalleryVisibility();
}
refreshGalleryIndex();

// remove any gallery images that fail to load (missing folder etc.)
document.querySelectorAll('.gallery-item img').forEach(img => {
  img.addEventListener('error', () => {
    const item = img.closest('.gallery-item');
    if (item) {
      item.remove();
      refreshGalleryIndex();
    }
  });
});

/* ── Lightbox open ── */
// delegate clicks on any image item (works for both hardcoded and uploaded photos)
document.addEventListener('click', e => {
  const item = e.target.closest('.gallery-item');
  if (!item) return;
  const img = item.querySelector('img');
  if (!img) return;
  refreshGalleryIndex();
  lightboxIndex = galleryImages.indexOf(img.src);
  openLightbox(lightboxIndex);
});

function openLightbox(index) {
  lightboxIndex = index;
  document.getElementById('lightboxImg').src = galleryImages[lightboxIndex];
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
function shiftLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + galleryImages.length) % galleryImages.length;
  document.getElementById('lightboxImg').src = galleryImages[lightboxIndex];
}
// Keyboard nav
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowRight')  shiftLightbox(1);
  if (e.key === 'ArrowLeft')   shiftLightbox(-1);
});

/* ── File upload handler ── */
const fileInput  = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const galleryGrid = document.getElementById('galleryGrid');

fileInput.addEventListener('change', e => handleFiles(e.target.files));

// Drag & drop
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
// Clicking the zone (not the button) also triggers upload
uploadZone.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') fileInput.click();
});

function handleFiles(files) {
  let count = 0;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast(`⚠️ "${file.name}" exceeds 20MB limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      addImageToGallery(ev.target.result, file.name.replace(/\.[^.]+$/, ''));
      count++;
      if (count === files.length || count === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
        showToast(`📸 ${count} photo${count > 1 ? 's' : ''} added to gallery!`);
      }
    };
    reader.readAsDataURL(file);
  });
}

function addImageToGallery(src, label = 'Your Photo') {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.innerHTML = `
    <img src="${src}" alt="${label}" loading="lazy"/>
    <div class="gallery-overlay"><span>${label}</span></div>
    <button class="gallery-remove-btn" title="Remove photo">✕</button>
  `;
  // Remove button
  item.querySelector('.gallery-remove-btn').addEventListener('click', e => {
    e.stopPropagation();
    item.style.transition = 'opacity 0.3s';
    item.style.opacity = '0';
    setTimeout(() => { item.remove(); refreshGalleryIndex(); }, 300);
  });

  // choose container based on label text (category) or default to floor
  const containerId = label === 'The Bar' ? 'galleryBarGrid' : 'galleryFloorGrid';
  const container = document.getElementById(containerId) || document.getElementById('galleryFloorGrid');
  container.appendChild(item);
  refreshGalleryIndex();

  // Animate in
  item.style.opacity = '0';
  item.style.transform = 'scale(0.9)';
  item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      item.style.opacity = '1';
      item.style.transform = 'scale(1)';
    });
  });
}

/* ── Remove button styles injected via JS ── */
(function injectRemoveBtnStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .gallery-remove-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 28px; height: 28px;
      background: rgba(232,66,10,0.85);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 0.8rem;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 10;
    }
    .gallery-item:hover .gallery-remove-btn { display: flex; }
    .gallery-remove-btn:hover { background: #c73009; }
  `;
  document.head.appendChild(style);
})();

/* ── Scroll reveal (Intersection Observer) ── */
const revealEls = document.querySelectorAll(
  '.menu-card, .event-card, .about-img-col, .about-text-col, .contact-left, .contact-right'
);
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      entry.target.style.opacity   = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(28px)';
  revealObserver.observe(el);
});

/* ── Touch swipe for lightbox ── */
(function addSwipeSupport() {
  const lb = document.getElementById('lightbox');
  let touchStartX = 0;
  lb.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) shiftLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 140) current = sec.getAttribute('id');
  });
  navAnchors.forEach(a => {
    a.classList.remove('active-link');
    if (a.getAttribute('href') === `#${current}`) a.classList.add('active-link');
  });
});