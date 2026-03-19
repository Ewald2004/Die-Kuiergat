
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

/* ── Ticker loop ── */
let tickerLoopFrame = 0;

async function loadTickerFromCsv() {
  const ticker = document.querySelector('.ticker');
  if (!ticker) return;

  try {
    const response = await fetch('Details/ticker.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    const entries = lines
      .slice(1)
      .map(line => {
        const [icon = '', ...rest] = line.split(',');
        const text = rest.join(',').trim();
        return { icon: icon.trim(), text };
      })
      .filter(item => item.text);

    if (!entries.length) return;

    ticker.innerHTML = entries
      .map(item => `<span>${item.icon ? `${item.icon} ` : ''}${item.text}</span>`)
      .join('');

    // Reset cached base markup so loop setup uses the latest ticker content.
    delete ticker.dataset.baseMarkup;
  } catch {
    // Keep the inline ticker content as fallback when CSV cannot be loaded.
  }
}

function getCsvLines(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('-->'));
}

function parseCsvRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const ch = row[i];

    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function resolvePhotoPath(photoPath) {
  const path = (photoPath || '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('/') || hasFileExtension(path)) return path;

  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];
  for (const ext of extensions) {
    const candidate = `${path}${ext}`;
    try {
      const res = await fetch(candidate, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return candidate;
    } catch { /* try next */ }
  }
  return '';
}

function buildEventPhotoPath(photoDirectory, photoFile) {
  const file = (photoFile || '').trim();
  if (!file) return '';

  if (/^https?:\/\//i.test(file) || file.startsWith('/')) {
    return file;
  }

  const directory = (photoDirectory || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
  return directory ? `${directory}/${file}` : file;
}

function hasFileExtension(path) {
  const cleanPath = (path || '').split('?')[0].split('#')[0];
  return /\.[a-z0-9]{2,5}$/i.test(cleanPath);
}

async function resolveEventPhotoPath(photoDirectory, photoFile) {
  const basePath = buildEventPhotoPath(photoDirectory, photoFile);
  if (!basePath) return '';

  // Keep absolute URLs and explicit file extensions untouched.
  if (/^https?:\/\//i.test(basePath) || basePath.startsWith('/') || hasFileExtension(basePath)) {
    return basePath;
  }

  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jfif'];

  for (const ext of extensions) {
    const candidate = `${basePath}${ext}`;
    try {
      const response = await fetch(candidate, { method: 'HEAD', cache: 'no-store' });
      if (response.ok) return candidate;
    } catch {
      // Continue trying other extensions.
    }
  }

  return '';
}

async function loadEventsFromCsv() {
  const eventsGrid = document.getElementById('eventsGrid');
  if (!eventsGrid) return;

  // Events are CSV-driven only; clear inline content before loading.
  eventsGrid.innerHTML = '';

  try {
    const response = await fetch('Details/events.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    const rows = lines.slice(1).map(parseCsvRow);
    const entriesWithPhotos = await Promise.all(rows.map(async (row) => {
        const [day = '', month = '', title = '', description = '', photoDirectory = '', photoFile = ''] = row;
        return {
          day: day.trim(),
          month: month.trim(),
          title: title.trim(),
          description: description.trim(),
          photoPath: await resolveEventPhotoPath(photoDirectory, photoFile)
        };
      }));

    const entries = entriesWithPhotos.filter((item) => item.title);

    if (!entries.length) return;

    eventsGrid.innerHTML = entries.map((item) => {
      const safeTitle = escapeHtml(item.title);
      const safeDay = escapeHtml(item.day || '--');
      const safeMonth = escapeHtml(item.month || '---');
      const safeDescription = escapeHtml(item.description).replace(/\|/g, '<br/>');
      const safePhotoPath = escapeHtml(item.photoPath);
      const photoMarkup = safePhotoPath
        ? `<img class="event-photo" src="${safePhotoPath}" alt="${safeTitle} photo" loading="lazy"/>`
        : '';

      return `<div class="event-card">${photoMarkup}<div class="event-date"><span class="day">${safeDay}</span><span class="month">${safeMonth}</span></div><div class="event-info"><h3>${safeTitle}</h3><p>${safeDescription}</p></div></div>`;
    }).join('');
  } catch {
    // Keep the events section empty when CSV cannot be loaded.
  }
}

async function loadDescriptionsFromCsv() {
  const descriptionNodes = Array.from(document.querySelectorAll('[data-desc-key]'));
  if (!descriptionNodes.length) return;

  try {
    const response = await fetch('Details/descriptions.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    const descriptionsByKey = new Map();
    lines.slice(1).map(parseCsvRow).forEach((row) => {
      const [key = '', text = ''] = row;
      const normalizedKey = key.trim();
      if (!normalizedKey) return;
      descriptionsByKey.set(normalizedKey, text);
    });

    descriptionNodes.forEach((node) => {
      const key = (node.dataset.descKey || '').trim();
      if (!key || !descriptionsByKey.has(key)) return;

      const value = descriptionsByKey.get(key) || '';
      node.innerHTML = escapeHtml(value).replace(/\|/g, '<br/>');
    });
  } catch {
    // Keep inline copy as fallback when CSV cannot be loaded.
  }
}

function getSpecialCardByKey(key) {
  const normalized = key.trim().toLowerCase();
  const order = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5
  };

  const index = order[normalized];
  if (!index) return null;
  return document.querySelector(`#specials .special-card:nth-of-type(${index})`);
}

async function loadSpecialChangesFromCsv() {
  try {
    const response = await fetch('Details/special changes.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    lines.slice(1).map(parseCsvRow).forEach((row) => {
      const [day = '', name = '', originalPrice = '', discountedPrice = ''] = row;
      const card = getSpecialCardByKey(day);
      if (!card) return;

      const nameEl = card.querySelector('.special-content h3');
      const originalEl = card.querySelector('.special-price .original');
      const discountedEl = card.querySelector('.special-price .discounted');

      if (name.trim() && nameEl) {
        nameEl.textContent = name.trim();
      }
      if (originalPrice.trim() && originalEl) {
        originalEl.textContent = originalPrice.trim();
      }
      if (discountedPrice.trim() && discountedEl) {
        discountedEl.textContent = discountedPrice.trim();
      }
    });
  } catch {
    // Keep inline specials content as fallback when CSV cannot be loaded.
  }
}

function getMenuTargetForCategory(category) {
  const normalized = category.trim().toLowerCase();
  const mapping = {
    'lightmeals':      { searchId: 'menu-lightMeals',  insertId: 'menu-lightMeals' },
    'seafood':         { searchId: 'menu-seafood',      insertId: 'menu-seafood' },
    'pizza':           { searchId: 'menu-Pizza',         insertId: 'menu-Pizza' },
    'addons':          { searchId: 'menu-addOns',        insertId: 'menu-addOns-AddOns' },
    'addons/addons':   { searchId: 'menu-addOns',        insertId: 'menu-addOns-AddOns' },
    'addons/sauces':   { searchId: 'menu-addOns',        insertId: 'menu-addOns-sauces' },
    'drinks':          { searchId: 'menu-drinks',        insertId: 'menu-drinks-beers' },
    'drinks/beers':    { searchId: 'menu-drinks',        insertId: 'menu-drinks-beers' },
  };
  return mapping[normalized] || null;
}

function createMenuCard(itemName, price, description, resolvedPhoto) {
  const photo = resolvedPhoto || 'Photos/Food/Test.jpg';
  const descHtml = description.trim()
    ? `<p>${escapeHtml(description.trim())}</p>`
    : '';
  const card = document.createElement('div');
  card.className = 'menu-card';
  card.innerHTML = `<img class="menu-card-img" src="${escapeHtml(photo)}" alt="${escapeHtml(itemName)} photo" loading="lazy"/><div class="menu-card-body"><h3>${escapeHtml(itemName)}</h3>${descHtml}<span class="price">${escapeHtml(price.trim())}</span></div>`;
  return card;
}

function setMenuItemDetails(scopeElement, itemName, newPrice, newDescription = '', resolvedPhoto = '') {
  const cards = Array.from(scopeElement.querySelectorAll('.menu-card'));
  const match = cards.find((card) => {
    const title = card.querySelector('.menu-card-body h3');
    return title && title.textContent.trim().toLowerCase() === itemName.trim().toLowerCase();
  });

  if (!match) return false;

  const body = match.querySelector('.menu-card-body');
  if (!body) return false;

  const imgNode = match.querySelector('.menu-card-img');
  if (imgNode && resolvedPhoto) {
    imgNode.src = resolvedPhoto;
    imgNode.dataset.missingHandled = '';
    imgNode.classList.remove('is-broken');
    match.classList.remove('no-image');
  }

  const priceNode = match.querySelector('.price');
  if (priceNode && newPrice.trim()) {
    priceNode.textContent = newPrice.trim();
  }

  if (newDescription.trim()) {
    let descriptionNode = body.querySelector('p');
    if (!descriptionNode) {
      descriptionNode = document.createElement('p');
      if (priceNode) {
        body.insertBefore(descriptionNode, priceNode);
      } else {
        body.appendChild(descriptionNode);
      }
    }
    descriptionNode.textContent = newDescription.trim();
  }

  return true;
}

async function loadMenuPriceChangesFromCsv() {
  try {
    const response = await fetch('Details/menu price changes.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    const rows = lines.slice(1).map(parseCsvRow);

    await Promise.all(rows.map(async (row) => {
      const [category = '', itemName = '', price = '', description = '', photoPath = ''] = row;
      if (!itemName.trim()) return;

      const resolvedPhoto = await resolvePhotoPath(photoPath);
      const target = category.trim() ? getMenuTargetForCategory(category) : null;

      if (target) {
        const searchGrid = document.getElementById(target.searchId);
        if (searchGrid) {
          const found = setMenuItemDetails(searchGrid, itemName, price, description, resolvedPhoto);
          if (!found) {
            const insertContainer = document.getElementById(target.insertId) || searchGrid;
            insertContainer.appendChild(createMenuCard(itemName, price, description, resolvedPhoto));
          }
          return;
        }
      }

      // Fallback: search all menu sections if category is blank/unknown.
      const allMenuGrids = Array.from(document.querySelectorAll('#menu .menu-grid'));
      allMenuGrids.some((grid) => setMenuItemDetails(grid, itemName, price, description, resolvedPhoto));
    }));
  } catch {
    // Keep inline prices as fallback when CSV cannot be loaded.
  }
}

async function loadContactDetailsFromCsv() {
  const contactDetails = document.getElementById('contactDetails');
  if (!contactDetails) return;

  try {
    const response = await fetch('Details/contact details.csv', { cache: 'no-store' });
    if (!response.ok) return;

    const csvText = await response.text();
    const lines = getCsvLines(csvText);
    if (lines.length <= 1) return;

    const rows = lines.slice(1).map(parseCsvRow);
    const entries = rows
      .map((row) => {
        const [label = '', value = '', icon = 'fas fa-circle-info'] = row;
        return {
          label: label.trim(),
          value: value.trim(),
          icon: icon.trim() || 'fas fa-circle-info'
        };
      })
      .filter((item) => item.label && item.value);

    if (!entries.length) return;

    contactDetails.innerHTML = entries.map((item) => {
      const safeLabel = escapeHtml(item.label);
      const safeIcon = escapeHtml(item.icon || '•');
      const valueWithBreaks = escapeHtml(item.value).replace(/\|/g, '<br/>');

      return `<div class="contact-item"><span class="contact-item-icon" aria-hidden="true">${safeIcon}</span><div><strong>${safeLabel}</strong><span>${valueWithBreaks}</span></div></div>`;
    }).join('');
  } catch {
    // Keep inline contact details as fallback when CSV cannot be loaded.
  }
}

function setupTickerLoop() {
  const ticker = document.querySelector('.ticker');
  const tickerWrap = document.querySelector('.ticker-wrap');
  if (!ticker || !tickerWrap) return;

  if (!ticker.dataset.baseMarkup) {
    ticker.dataset.baseMarkup = Array.from(ticker.children)
      .map((item) => item.outerHTML)
      .join('');
  }

  ticker.style.animation = 'none';
  ticker.innerHTML = ticker.dataset.baseMarkup;

  const baseItems = Array.from(ticker.children).map((item) => item.outerHTML);
  if (!baseItems.length) return;

  let safety = 0;
  while (ticker.scrollWidth < tickerWrap.clientWidth * 2 && safety < 12) {
    ticker.insertAdjacentHTML('beforeend', baseItems.join(''));
    safety += 1;
  }

  const loopMarkup = ticker.innerHTML;
  ticker.insertAdjacentHTML('beforeend', loopMarkup);

  const half = ticker.children.length / 2;
  Array.from(ticker.children).slice(half).forEach((item) => {
    item.setAttribute('aria-hidden', 'true');
  });

  requestAnimationFrame(() => {
    ticker.style.setProperty('--ticker-distance', `-${ticker.scrollWidth / 2}px`);
    ticker.style.removeProperty('animation');
  });
}

function queueTickerLoopSetup() {
  cancelAnimationFrame(tickerLoopFrame);
  tickerLoopFrame = requestAnimationFrame(() => {
    requestAnimationFrame(setupTickerLoop);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadTickerFromCsv();
  await loadDescriptionsFromCsv();
  await loadSpecialChangesFromCsv();
  await loadMenuPriceChangesFromCsv();
  await loadEventsFromCsv();
  await loadContactDetailsFromCsv();
  await loadGalleryFromFolders();
  queueTickerLoopSetup();
});
window.addEventListener('load', async () => {
  await loadTickerFromCsv();
  queueTickerLoopSetup();
});
window.addEventListener('resize', queueTickerLoopSetup);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(queueTickerLoopSetup);
}

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

/* ── Drinks Sub-Tabs ── */
const drinksSubtabGroups = document.querySelectorAll('.drinks-subtabs');
drinksSubtabGroups.forEach(group => {
  const tabs = group.querySelectorAll('.drinks-subtab');
  const section = group.closest('.menu-grid');
  const sectionPrefix = group.dataset.submenuPrefix || (section ? section.id : 'menu-drinks');

  tabs.forEach(subTab => {
    subTab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      if (section) {
        section.querySelectorAll('.drinks-subgrid').forEach(grid => grid.classList.add('hidden'));
      }

      subTab.classList.add('active');
      const targetId = `${sectionPrefix}-${subTab.dataset.drinksTab}`;
      const targetGrid = document.getElementById(targetId);
      if (targetGrid) targetGrid.classList.remove('hidden');
    });
  });
});

/* ════════════════════════════════════
  GALLERY — Lightbox
════════════════════════════════════ */

let galleryImages = []; // stores all src strings for lightbox
let lightboxIndex = 0;

/* Collect initial gallery images */
function updateGalleryVisibility() {
  document.querySelectorAll('.gallery-category').forEach(cat => {
    const grid = cat.querySelector('.gallery-grid');
    const visibleItems = grid
      ? Array.from(grid.children).filter((item) => !item.classList.contains('is-hidden-broken')).length
      : 0;
    if (grid && visibleItems === 0) {
      cat.style.display = 'none';
    } else {
      cat.style.display = '';
    }
  });
}

function refreshGalleryIndex() {
  galleryImages = Array.from(
    document.querySelectorAll('#galleryFloorGrid .gallery-item img, #galleryBarGrid .gallery-item img')
  )
    .filter((img) => !img.classList.contains('is-broken') && !img.closest('.is-hidden-broken'))
    .map(img => img.src);
  updateGalleryVisibility();
}
refreshGalleryIndex();

function isImagePath(pathname) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(pathname);
}

async function fetchImageUrlsFromFolder(folderPath) {
  try {
    const response = await fetch(folderPath, { cache: 'no-store' });
    if (!response.ok) return null;

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href]'));
    if (!links.length) return null;

    const folderUrl = new URL(folderPath, window.location.href);
    const imageUrls = links
      .map((link) => link.getAttribute('href') || '')
      .map((href) => {
        try {
          return new URL(href, folderUrl);
        } catch {
          return null;
        }
      })
      .filter((url) => url && isImagePath(url.pathname))
      .map((url) => url.href);

    const unique = Array.from(new Set(imageUrls));
    unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return unique;
  } catch {
    return null;
  }
}

function renderGalleryItems(grid, imageUrls, altText) {
  grid.innerHTML = imageUrls
    .map((src) => `<div class="gallery-item"><img src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" loading="lazy"/></div>`)
    .join('');
}

async function loadGalleryFromFolders() {
  const galleryConfigs = [
    { gridId: 'galleryFloorGrid', folder: 'Photos/Floor/', alt: 'Restaurant interior' },
    { gridId: 'galleryBarGrid', folder: 'Photos/Bar/', alt: 'Bar area' }
  ];

  await Promise.all(galleryConfigs.map(async (config) => {
    const grid = document.getElementById(config.gridId);
    if (!grid) return;

    const imageUrls = await fetchImageUrlsFromFolder(config.folder);
    if (!imageUrls || !imageUrls.length) return;

    renderGalleryItems(grid, imageUrls, config.alt);
  }));

  refreshGalleryIndex();
}

function handleBrokenImage(img) {
  if (!img || img.dataset.missingHandled === '1') return;

  // Never mark the lightbox image as broken; it starts empty and is populated on click.
  if (img.id === 'lightboxImg' || img.closest('.lightbox')) return;

  // Ignore placeholders without a real source.
  const rawSrc = (img.getAttribute('src') || '').trim();
  if (!rawSrc) return;

  img.dataset.missingHandled = '1';

  const galleryItem = img.closest('.gallery-item');
  if (galleryItem) {
    img.classList.add('is-broken');
    galleryItem.classList.add('is-hidden-broken');
    refreshGalleryIndex();
    return;
  }

  const menuCard = img.closest('.menu-card');
  if (menuCard) {
    img.classList.add('is-broken');
    menuCard.classList.add('no-image');
    return;
  }

  const specialCard = img.closest('.special-card');
  if (specialCard) {
    img.classList.add('is-broken');
    specialCard.classList.add('is-hidden-broken');
    return;
  }

  const aboutFrame = img.closest('.about-img-frame');
  if (aboutFrame) {
    const aboutSection = img.closest('.about');
    const aboutCol = img.closest('.about-img-col');
    img.classList.add('is-broken');
    if (aboutCol) aboutCol.classList.add('is-hidden-broken');
    if (aboutSection) aboutSection.classList.add('no-image');
    return;
  }

  img.classList.add('is-broken');
}

// Catch broken image paths globally so no empty image blocks remain.
document.addEventListener('error', (event) => {
  const target = event.target;
  if (target && target.tagName === 'IMG') {
    handleBrokenImage(target);
  }
}, true);

// Handle images that already finished loading in a broken state.
document.querySelectorAll('img').forEach((img) => {
  const hasSource = Boolean((img.getAttribute('src') || '').trim());
  if (hasSource && img.complete && img.naturalWidth === 0) {
    handleBrokenImage(img);
  }
});

/* ── Lightbox open ── */
// delegate clicks on any image item (works for both hardcoded and uploaded photos)
document.addEventListener('click', e => {
  const item = e.target.closest('.gallery-item');
  if (!item) return;
  const img = item.querySelector('img');
  if (!img) return;
  if (img.classList.contains('is-broken') || item.classList.contains('is-hidden-broken')) return;
  refreshGalleryIndex();
  lightboxIndex = galleryImages.indexOf(img.src);
  if (lightboxIndex < 0 || galleryImages.length === 0) return;
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

/* ── Scroll reveal (Intersection Observer) ── */
const revealEls = document.querySelectorAll(
  '.menu-card, .event-card, .about-img-col, .about-text-col, .contact-left'
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