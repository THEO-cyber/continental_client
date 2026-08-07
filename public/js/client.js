/* Continental Automobile — public site interactivity + realtime + PWA */
(function () {
  'use strict';

  var grid = document.getElementById('product-grid');
  var search = document.getElementById('search');
  var chipsWrap = document.getElementById('category-chips');
  var emptyMsg = document.getElementById('empty-msg');
  var activeCategory = '';

  var resultsCount = document.getElementById('results-count');
  var searchClear = document.getElementById('search-clear');
  var showMoreBtn = document.getElementById('show-more');

  // With 500+ products server-rendered (full SEO value — every one is real,
  // indexable HTML), showing all matches at once would dump an overwhelming
  // wall of cards on a visitor. Reveal them in batches instead; filters reset
  // the batch back to the first page.
  var BATCH_SIZE = 30;
  var visibleCount = BATCH_SIZE;

  // ---------- filtering (over server-rendered cards) ----------
  function applyFilter() {
    if (!grid) return;
    var q = (search && search.value || '').trim().toLowerCase();
    var cards = grid.querySelectorAll('.card');
    var matched = [];
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var matchCat = !activeCategory || card.getAttribute('data-category') === activeCategory;
      var hay = (card.getAttribute('data-name') || '') + ' ' + (card.getAttribute('data-brand') || '');
      var matchQ = !q || hay.indexOf(q) !== -1;
      if (matchCat && matchQ) matched.push(card);
      else card.style.display = 'none';
    }
    for (var j = 0; j < matched.length; j++) {
      matched[j].style.display = j < visibleCount ? '' : 'none';
    }
    if (emptyMsg) emptyMsg.hidden = matched.length !== 0;
    if (resultsCount) resultsCount.textContent = Math.min(visibleCount, matched.length) + ' / ' + matched.length;
    if (searchClear) searchClear.hidden = !q;
    if (showMoreBtn) showMoreBtn.hidden = matched.length <= visibleCount;
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      visibleCount += BATCH_SIZE;
      applyFilter();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      search.value = '';
      visibleCount = BATCH_SIZE;
      applyFilter();
      search.focus();
    });
  }

  function bindChips() {
    if (!chipsWrap) return;
    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip-filter');
      if (!btn) return;
      activeCategory = btn.getAttribute('data-category') || '';
      var all = chipsWrap.querySelectorAll('.chip-filter');
      for (var i = 0; i < all.length; i++) all[i].classList.toggle('active', all[i] === btn);
      visibleCount = BATCH_SIZE;
      applyFilter();
    });
  }

  if (search) {
    search.addEventListener('input', function () {
      visibleCount = BATCH_SIZE;
      applyFilter();
    });
  }
  bindChips();
  applyFilter(); // establish the initial batch — without this all cards stay visible on load

  function selectCategory(category, scroll) {
    if (!chipsWrap) return;
    activeCategory = category || '';
    var all = chipsWrap.querySelectorAll('.chip-filter');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('active', (all[i].getAttribute('data-category') || '') === activeCategory);
    }
    visibleCount = BATCH_SIZE;
    applyFilter();
    if (scroll) {
      var catalog = document.getElementById('catalog');
      if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Category cards scroll to the catalog with that category pre-selected
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.cat-card');
    if (card) selectCategory(card.getAttribute('data-category'), true);
  });

  // Footer/product-page category links arrive as /lang?category=x#catalog
  var urlCategory = new URLSearchParams(window.location.search).get('category');
  if (urlCategory && chipsWrap && chipsWrap.querySelector('[data-category="' + urlCategory + '"]')) {
    selectCategory(urlCategory, false);
  }

  // ---------- mobile navigation ----------
  var navToggle = document.getElementById('nav-toggle');
  var siteHeader = document.querySelector('.site-header');
  if (navToggle && siteHeader) {
    navToggle.addEventListener('click', function () {
      var open = siteHeader.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    var mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          siteHeader.classList.remove('nav-open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // ---------- back to top ----------
  var backTop = document.getElementById('back-top');
  if (backTop) {
    window.addEventListener('scroll', function () {
      backTop.hidden = window.scrollY < 600;
    }, { passive: true });
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- scroll reveal (skipped for reduced-motion users) ----------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bindReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    var items = document.querySelectorAll('.card:not(.in), .cat-card:not(.in), .step:not(.in), .faq-item:not(.in), .contact-item:not(.in)');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.add('reveal');
      observer.observe(items[i]);
    }
  }
  bindReveal();

  // ---------- toast ----------
  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2500);
  }

  // ---------- realtime: refresh catalog when superadmin changes products ----------
  // Re-fetches this page's server-rendered HTML and swaps in the fresh grid,
  // so the visible catalog always matches the store's live inventory.
  var refreshTimer;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshCatalog, 400);
  }

  function refreshCatalog() {
    if (!grid) return; // product detail page: nothing to swap
    fetch(window.location.pathname, { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var freshGrid = doc.getElementById('product-grid');
        var freshChips = doc.getElementById('category-chips');
        if (freshGrid) grid.innerHTML = freshGrid.innerHTML;
        if (freshChips && chipsWrap) {
          chipsWrap.innerHTML = freshChips.innerHTML;
          var again = chipsWrap.querySelector('[data-category="' + activeCategory + '"]');
          if (!again) activeCategory = '';
          var all = chipsWrap.querySelectorAll('.chip-filter');
          for (var i = 0; i < all.length; i++) {
            all[i].classList.toggle('active', (all[i].getAttribute('data-category') || '') === activeCategory);
          }
        }
        applyFilter();
        showToast(grid.getAttribute('data-msg-updated') || 'Updated');
      })
      .catch(function () { /* offline: keep current view */ });
  }

  if (typeof io !== 'undefined') {
    try {
      // This site is hosted separately from the API/realtime server —
      // window.API_BASE is injected by the page shell (see _lib/render.ts).
      var API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '';
      var socket = API_BASE
        ? io(API_BASE, { transports: ['websocket', 'polling'] })
        : io({ transports: ['websocket', 'polling'] });
      socket.on('catalog:changed', scheduleRefresh);
    } catch (e) { /* realtime unavailable: page still works */ }
  }

  // ---------- PWA ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
