/**
 * DOCX Viewer Bridge Script
 *
 * Runs inside docx-viewer://docxViewer.html and:
 * - Renders DOCX via docx-preview
 * - Provides PDF-like floating toolbar UI (same markup/styles as PDF viewer)
 * - Receives commands via postMessage and emits events back to parent
 */

(() => {
  'use strict';

  // DOM elements
  const viewerContainer = document.getElementById('viewerContainer');
  const mount = document.getElementById('docxMount');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // Toolbar DOM (match PDF viewer IDs)
  const wbToolbar = document.getElementById('wbToolbar');
  const wbPrev = document.getElementById('wbPrev');
  const wbNext = document.getElementById('wbNext');
  const wbPageForm = document.getElementById('wbPageForm');
  const wbPageInput = document.getElementById('wbPageInput');
  const wbPageTotal = document.getElementById('wbPageTotal');
  const wbZoomOut = document.getElementById('wbZoomOut');
  const wbZoomIn = document.getElementById('wbZoomIn');
  const wbZoomLabel = document.getElementById('wbZoomLabel');
  const wbZoomMenu = document.getElementById('wbZoomMenu');
  const wbHand = document.getElementById('wbHand');
  const wbDownload = document.getElementById('wbDownload');

  // Viewer state
  let currentUrl = null;
  let totalPages = 0;
  let currentPage = 1;
  let zoom = 1;
  let zoomMode = 'page-width'; // 'auto' | 'page-fit' | 'page-width' | 'custom'
  let zoomMenuOpen = false;
  let handMode = false;

  // Scale containers (transform-based zoom)
  let scaleOuter = null;
  let scaleInner = null;
  let baseDocHeight = 0;
  let baseDocWidth = 0;

  // Trackpad pinch zoom state (ctrl/meta + wheel on Chromium)
  let pinchActive = false;
  let pinchStartZoom = 1;
  let pinchAccumulatedDelta = 0;
  let pinchAnchor = null;
  let pinchRafId = null;
  let pinchEndTimer = null;

  // When set, avoid re-applying fit modes on resize (prevents layout thrash during width animations).
  let suspendFitOnResizeUntil = 0;

  // Velocity tracking for acceleration
  let lastWheelTime = 0;
  let velocity = 0;

  // Drag-to-pan state (hand tool)
  let handDragging = false;
  let handStart = null; // { x, y, scrollLeft, scrollTop }

  // Throttling
  let lastScrollRaf = 0;

  const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
  const ZOOM_PRESETS = [
    { label: 'Auto', value: 'auto' },
    { label: 'Page Fit', value: 'page-fit' },
    { label: 'Page Width', value: 'page-width' },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
    { label: '300%', value: 3.0 },
  ];

  const PINCH_WHEEL_EXP_DIVISOR = 300;
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Acceleration curve: velocity -> multiplier (ported from PDF viewer)
  function getAccelerationMultiplier(vel) {
    const absVel = Math.abs(vel);
    if (absVel < 0.5) return 1;
    const accel = 1 + 1.5 * (1 - Math.exp(-absVel / 3));
    return Math.min(accel, 2.5);
  }

  function isEditableTarget(target) {
    if (!target) return false;
    const el = target;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return true;
    try {
      if (el.isContentEditable) return true;
    } catch {}
    return false;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.classList.add('hidden');
    else el.classList.remove('hidden');
  }

  function setLoading(isLoading) {
    setHidden(loadingIndicator, !isLoading);
  }

  function setError(message) {
    if (!errorMessage) return;
    const msg = message ? String(message) : '';
    errorMessage.textContent = msg;
    setHidden(errorMessage, !msg);
    if (msg) sendToParent('ERROR', { message: msg });
  }

  function sendToParent(type, payload = {}) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, ...payload }, '*');
      }
    } catch {}
  }

  function getPages() {
    if (!mount) return [];
    return Array.from(mount.querySelectorAll('.docx'));
  }

  function ensureScaleContainers() {
    if (!mount) return;
    if (scaleOuter && scaleInner && scaleOuter.parentElement === mount) return;

    mount.innerHTML = '';
    scaleOuter = document.createElement('div');
    scaleOuter.id = 'docxScaleOuter';
    scaleInner = document.createElement('div');
    scaleInner.id = 'docxScaleInner';
    scaleOuter.appendChild(scaleInner);
    mount.appendChild(scaleOuter);
  }

  function getDocxWrapper() {
    if (!scaleInner) return null;
    return scaleInner.querySelector('.docx-wrapper') || scaleInner;
  }

  function refreshBaseSize() {
    const wrapper = getDocxWrapper();
    if (!wrapper) return;
    const h = wrapper.scrollHeight || wrapper.getBoundingClientRect().height;
    const w = wrapper.scrollWidth || wrapper.getBoundingClientRect().width;
    if (Number.isFinite(h) && h > 0) baseDocHeight = h;
    if (Number.isFinite(w) && w > 0) baseDocWidth = w;
  }

  function updateScaleContainers() {
    if (!scaleOuter || !scaleInner) return;
    const z = typeof zoom === 'number' && isFinite(zoom) ? zoom : 1;
    scaleInner.style.transform = `scale(${z})`;
    if (baseDocWidth > 0) scaleInner.style.width = `${baseDocWidth}px`;
    const minWidth = viewerContainer ? viewerContainer.clientWidth : 0;
    const scaledWidth = baseDocWidth > 0 ? baseDocWidth * z : minWidth;
    scaleOuter.style.width = `${Math.max(minWidth, scaledWidth)}px`;
    scaleOuter.style.height = `${Math.max(1, baseDocHeight * z)}px`;
    scaleOuter.style.display = 'flex';
    scaleOuter.style.alignItems = 'flex-start';
    // Match PDF/PPTX feel:
    // - If the scaled content fits the viewport, center it (zoom out stays centered).
    // - If it overflows, left-align so the scrollable region includes the true left edge (no clipping).
    const fits = scaledWidth <= minWidth + 1;
    scaleOuter.style.justifyContent = fits ? 'center' : 'flex-start';
    scaleInner.style.transformOrigin = fits ? 'top center' : 'top left';
  }

  function getPrimaryPageSize() {
    const pages = getPages();
    const pageEl = pages[0] || null;
    if (!pageEl) return null;
    const rect = pageEl.getBoundingClientRect();
    // Convert from current scaled CSS pixels -> unscaled pixels.
    const z = typeof zoom === 'number' && isFinite(zoom) ? zoom : 1;
    const w = rect.width / z;
    const h = rect.height / z;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return { w, h };
  }

  function computeZoomForMode(mode) {
    if (!viewerContainer) return zoom;
    const viewportW = Math.max(1, viewerContainer.clientWidth);
    const viewportH = Math.max(1, viewerContainer.clientHeight);
    const margin = 32; // match docx wrapper padding feel
    const availW = Math.max(1, viewportW - margin);
    const availH = Math.max(1, viewportH - margin - 96); // keep space for toolbar

    const primary = getPrimaryPageSize();
    const pageW = primary?.w ?? baseDocWidth ?? viewportW;
    const pageH = primary?.h ?? 1;

    if (!Number.isFinite(pageW) || pageW <= 0) return zoom;

    if (mode === 'page-width') {
      return clamp(availW / pageW, MIN_ZOOM, MAX_ZOOM);
    }
    if (mode === 'page-fit') {
      if (!Number.isFinite(pageH) || pageH <= 0) return clamp(availW / pageW, MIN_ZOOM, MAX_ZOOM);
      return clamp(Math.min(availW / pageW, availH / pageH), MIN_ZOOM, MAX_ZOOM);
    }
    // auto: prefer width, but don't exceed 100% unless already zoomed > 1
    if (mode === 'auto') {
      const z = clamp(availW / pageW, MIN_ZOOM, MAX_ZOOM);
      return z;
    }
    return zoom;
  }

  function setZoomMode(mode) {
    const m = mode === 'page-fit' || mode === 'page-width' || mode === 'auto' ? mode : 'custom';
    zoomMode = m;
    if (m === 'custom') return;
    const desired = computeZoomForMode(m);
    // Anchor to viewport center for mode changes (PDF-like)
    if (viewerContainer) {
      const rect = viewerContainer.getBoundingClientRect();
      const anchor = getViewportAnchor(rect.width / 2, rect.height / 2, zoom);
      setZoom(desired, anchor, { keepMode: true });
    } else {
      setZoom(desired, null, { keepMode: true });
    }
  }

  function maybeRecenterHorizontally() {
    if (!viewerContainer) return;
    if (!Number.isFinite(baseDocWidth) || baseDocWidth <= 0) return;
    const z = typeof zoom === 'number' && isFinite(zoom) ? zoom : 1;
    const scaledWidth = baseDocWidth * z;
    const viewportWidth = viewerContainer.clientWidth;
    // When content fits, keep scroll at 0 so we see true centered layout (flex centering).
    if (scaledWidth <= viewportWidth + 1) {
      viewerContainer.scrollLeft = 0;
    }
  }

  function getViewportAnchor(viewportX, viewportY, baseZoom) {
    if (!viewerContainer) return null;
    const rect = viewerContainer.getBoundingClientRect();
    const clientX = rect.left + viewportX;
    const clientY = rect.top + viewportY;

    const z = typeof baseZoom === 'number' && isFinite(baseZoom) ? baseZoom : zoom;

    try {
      const el = document.elementFromPoint(clientX, clientY);
      const pageEl = el && el.closest ? el.closest('.docx') : null;

      if (pageEl) {
        const pages = getPages();
        const pageIndex = pages.indexOf(pageEl);
        if (pageIndex >= 0) {
          const pr = pageEl.getBoundingClientRect();
          return {
            kind: 'page',
            pageIndex,
            withinXUnscaled: (clientX - pr.left) / z,
            withinYUnscaled: (clientY - pr.top) / z,
            viewportX,
            viewportY,
          };
        }
      }
    } catch {}

    // Fallback: anchor to scroll content coordinates
    return {
      kind: 'content',
      contentXUnscaled: (viewerContainer.scrollLeft + viewportX) / z,
      contentYUnscaled: (viewerContainer.scrollTop + viewportY) / z,
      viewportX,
      viewportY,
    };
  }

  function applyViewportAnchor(anchor, nextZoom) {
    if (!viewerContainer || !anchor) return;
    const z = typeof nextZoom === 'number' && isFinite(nextZoom) ? nextZoom : zoom;

    if (anchor.kind === 'content') {
      viewerContainer.scrollLeft = Math.max(0, anchor.contentXUnscaled * z - anchor.viewportX);
      viewerContainer.scrollTop = Math.max(0, anchor.contentYUnscaled * z - anchor.viewportY);
      return;
    }

    const pages = getPages();
    const pageEl = pages[anchor.pageIndex];
    if (!pageEl || !scaleInner) return;

    const scaleRect = scaleInner.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();

    const contentLeftUnscaled = (pageRect.left - scaleRect.left) / z;
    const contentTopUnscaled = (pageRect.top - scaleRect.top) / z;

    viewerContainer.scrollLeft = Math.max(
      0,
      (contentLeftUnscaled + anchor.withinXUnscaled) * z - anchor.viewportX,
    );
    viewerContainer.scrollTop = Math.max(
      0,
      (contentTopUnscaled + anchor.withinYUnscaled) * z - anchor.viewportY,
    );
  }

  function updateToolbar() {
    if (wbPageTotal) wbPageTotal.textContent = String(totalPages || 0);
    if (wbPageInput) wbPageInput.value = String(currentPage || 1);
    if (wbPrev) wbPrev.disabled = currentPage <= 1;
    if (wbNext) wbNext.disabled = totalPages ? currentPage >= totalPages : false;
    if (wbZoomLabel) {
      if (zoomMode === 'page-width') wbZoomLabel.textContent = 'Width';
      else if (zoomMode === 'page-fit') wbZoomLabel.textContent = 'Fit';
      else if (zoomMode === 'auto') wbZoomLabel.textContent = 'Auto';
      else wbZoomLabel.textContent = `${Math.round((zoom || 1) * 100)}%`;
    }
    if (wbHand) wbHand.classList.toggle('wb-active', !!handMode);
  }

  function applyZoomStyle() {
    updateScaleContainers();
    maybeRecenterHorizontally();
  }

  function applyZoom() {
    applyZoomStyle();
    updateToolbar();
    sendToParent('ZOOM_CHANGED', { zoom });
  }

  function goToPage(page) {
    const pages = getPages();
    if (!pages.length) return;
    const targetPage = clamp(Number(page) || 1, 1, pages.length);
    const el = pages[targetPage - 1];
    if (!el) return;
    currentPage = targetPage;
    updateToolbar();
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
    sendToParent('PAGE_CHANGED', { page: currentPage, total: totalPages });
  }

  function prevPage() {
    goToPage(currentPage - 1);
  }

  function nextPage() {
    goToPage(currentPage + 1);
  }

  function setZoom(nextZoom, anchor, opts) {
    const z = Number(nextZoom);
    if (!isFinite(z)) return;
    const prevZoom = zoom;
    const next = clamp(z, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(next - prevZoom) < 1e-6) return;

    const resolvedAnchor = anchor || (() => {
      if (!viewerContainer) return null;
      const rect = viewerContainer.getBoundingClientRect();
      return getViewportAnchor(rect.width / 2, rect.height / 2, prevZoom);
    })();

    if (!(opts && opts.keepMode)) {
      zoomMode = 'custom';
    }

    zoom = next;
    applyZoomStyle();

    // After zoom is applied, re-anchor the viewport to prevent jump.
    requestAnimationFrame(() => {
      try {
        if (resolvedAnchor) applyViewportAnchor(resolvedAnchor, zoom);
      } catch {}
      updateToolbar();
      sendToParent('ZOOM_CHANGED', { zoom });
    });
  }

  function zoomToNearest(target, direction) {
    const z = Number(target);
    if (!isFinite(z)) return 1;
    if (direction > 0) {
      for (const lvl of ZOOM_LEVELS) {
        if (lvl > z + 1e-6) return lvl;
      }
      return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    }
    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      if (ZOOM_LEVELS[i] < z - 1e-6) return ZOOM_LEVELS[i];
    }
    return ZOOM_LEVELS[0];
  }

  function zoomIn() {
    setZoom(zoomToNearest(zoom, +1));
  }

  function zoomOut() {
    setZoom(zoomToNearest(zoom, -1));
  }

  function closeZoomMenu() {
    if (!wbZoomMenu || !wbZoomLabel) return;
    zoomMenuOpen = false;
    wbZoomMenu.classList.add('hidden');
    wbZoomLabel.setAttribute('aria-expanded', 'false');
  }

  function openZoomMenu() {
    if (!wbZoomMenu || !wbZoomLabel) return;
    zoomMenuOpen = true;
    wbZoomMenu.classList.remove('hidden');
    wbZoomLabel.setAttribute('aria-expanded', 'true');

    // Build menu contents on open to keep in sync with CSS/DOM.
    wbZoomMenu.innerHTML = '';
    for (const item of ZOOM_PRESETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wb-menu-item';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        closeZoomMenu();
        if (typeof item.value === 'string') {
          setZoomMode(item.value);
        } else {
          setZoom(item.value);
        }
      });
      wbZoomMenu.appendChild(btn);
    }
  }

  function toggleZoomMenu() {
    if (zoomMenuOpen) closeZoomMenu();
    else openZoomMenu();
  }

  function setTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    if (theme === 'dark') html.classList.add('dark');
    else if (theme === 'light') html.classList.add('light');
  }

  function setAppStyle(fontFamily) {
    try {
      if (fontFamily && typeof fontFamily === 'string') {
        document.documentElement.style.setProperty('--wb-font', fontFamily);
      }
    } catch {}
  }

  function setHandMode(enabled) {
    handMode = !!enabled;
    if (viewerContainer) viewerContainer.classList.toggle('wb-grab', handMode);
    updateToolbar();
    sendToParent('HAND_MODE_CHANGED', { enabled: handMode });
  }

  function updateCurrentPageFromScroll() {
    if (!viewerContainer || !mount) return;
    const pages = getPages();
    if (!pages.length) return;

    const sr = viewerContainer.getBoundingClientRect();
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pages.length; i++) {
      const pr = pages[i].getBoundingClientRect();
      const dist = Math.abs(pr.top - sr.top);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    const next = best + 1;
    if (next !== currentPage) {
      currentPage = next;
      updateToolbar();
      sendToParent('PAGE_CHANGED', { page: currentPage, total: totalPages });
    }
  }

  async function loadDocx(url) {
    if (!url) {
      setError('No DOCX URL provided');
      return;
    }
    if (!mount || !viewerContainer) {
      setError('Viewer not initialized');
      return;
    }
    if (!window.docx || typeof window.docx.renderAsync !== 'function') {
      setError('DOCX renderer failed to load');
      return;
    }

    currentUrl = String(url);
    setError('');
    setLoading(true);
    sendToParent('LOADING_STARTED', { url: currentUrl });

    try {
      const resp = await fetch(currentUrl);
      if (!resp.ok) throw new Error('Failed to fetch file');
      const blob = await resp.blob();

      ensureScaleContainers();
      if (!scaleInner) throw new Error('Viewer not initialized');

      await window.docx.renderAsync(blob, scaleInner, undefined, {
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
      });

      refreshBaseSize();
      updateScaleContainers();

      // If images load later, refresh height.
      try {
        const wrapper = getDocxWrapper();
        if (wrapper) {
          const imgs = wrapper.querySelectorAll('img');
          imgs.forEach((img) => {
            img.addEventListener('load', () => {
              refreshBaseSize();
              updateScaleContainers();
            });
          });
        }
      } catch {}

      // Apply initial fit mode once dimensions are known.
      if (zoomMode === 'page-width' || zoomMode === 'page-fit' || zoomMode === 'auto') {
        const desired = computeZoomForMode(zoomMode);
        zoom = desired;
        applyZoomStyle();
      }

      const pages = getPages();
      totalPages = pages.length || 0;
      currentPage = 1;
      updateToolbar();
      applyZoom();

      try {
        viewerContainer.scrollTop = 0;
        viewerContainer.scrollLeft = 0;
      } catch {}

      setLoading(false);
      sendToParent('DOC_LOADED', { pageCount: totalPages, page: currentPage, zoom });
    } catch (err) {
      setLoading(false);
      setError(err && err.message ? err.message : 'Failed to load document');
    }
  }

  function getState() {
    return { page: currentPage, pageCount: totalPages, zoom, url: currentUrl, handMode };
  }

  function handleCommand(command) {
    if (!command || typeof command.type !== 'string') return;
    switch (command.type) {
      case 'LOAD_DOCX':
        loadDocx(command.url);
        break;
      case 'GO_TO_PAGE':
        goToPage(command.page);
        break;
      case 'NEXT_PAGE':
        nextPage();
        break;
      case 'PREV_PAGE':
        prevPage();
        break;
      case 'SET_ZOOM':
        setZoom(command.zoom);
        break;
      case 'SET_ZOOM_MODE':
        setZoomMode(command.mode);
        break;
      case 'ZOOM_IN':
        zoomIn();
        break;
      case 'ZOOM_OUT':
        zoomOut();
        break;
      case 'GET_STATE':
        sendToParent('STATE', getState());
        break;
      case 'SET_THEME':
        setTheme(command.theme);
        break;
      case 'SET_APP_STYLE':
        setAppStyle(command.fontFamily);
        break;
      case 'SUSPEND_FIT_ON_RESIZE':
        try {
          const ms = Number(command.ms);
          const dur = Number.isFinite(ms) ? Math.max(0, ms) : 400;
          suspendFitOnResizeUntil = Math.max(suspendFitOnResizeUntil, performance.now() + dur);
        } catch {}
        break;
      default:
        break;
    }
  }

  function wireToolbar() {
    if (wbPrev) wbPrev.addEventListener('click', prevPage);
    if (wbNext) wbNext.addEventListener('click', nextPage);
    if (wbZoomIn) wbZoomIn.addEventListener('click', zoomIn);
    if (wbZoomOut) wbZoomOut.addEventListener('click', zoomOut);
    if (wbDownload) wbDownload.addEventListener('click', () => sendToParent('DOWNLOAD_REQUESTED', {}));
    if (wbHand) wbHand.addEventListener('click', () => setHandMode(!handMode));

    if (wbPageForm && wbPageInput) {
      wbPageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        goToPage(wbPageInput.value);
      });
      wbPageInput.addEventListener('focus', () => {
        try {
          wbPageInput.select();
        } catch {}
      });
    }

    if (wbZoomLabel) {
      wbZoomLabel.setAttribute('aria-expanded', 'false');
      wbZoomLabel.addEventListener('click', (e) => {
        e.preventDefault();
        toggleZoomMenu();
      });
    }

    document.addEventListener('mousedown', (e) => {
      if (!zoomMenuOpen) return;
      const t = e.target;
      if (wbZoomMenu && wbZoomMenu.contains(t)) return;
      if (wbZoomLabel && wbZoomLabel.contains(t)) return;
      closeZoomMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeZoomMenu();
    });
  }

  function wireScrollTracking() {
    if (!viewerContainer) return;
    viewerContainer.addEventListener(
      'scroll',
      () => {
        if (lastScrollRaf) return;
        lastScrollRaf = requestAnimationFrame(() => {
          lastScrollRaf = 0;
          updateCurrentPageFromScroll();
        });
      },
      { passive: true },
    );
  }

  function wireHandDrag() {
    if (!viewerContainer) return;

    viewerContainer.addEventListener('mousedown', (e) => {
      if (!handMode) return;
      if (e.button !== 0) return;
      if (wbToolbar && wbToolbar.contains(e.target)) return;
      if (isEditableTarget(e.target)) return;
      handDragging = true;
      handStart = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewerContainer.scrollLeft,
        scrollTop: viewerContainer.scrollTop,
      };
      try {
        viewerContainer.classList.add('wb-grab');
      } catch {}
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!handDragging || !handStart || !viewerContainer) return;
      const dx = e.clientX - handStart.x;
      const dy = e.clientY - handStart.y;
      viewerContainer.scrollLeft = handStart.scrollLeft - dx;
      viewerContainer.scrollTop = handStart.scrollTop - dy;
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      handDragging = false;
      handStart = null;
    });
  }

  function wireKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (isEditableTarget(e.target)) return;

      // Forward global shortcuts to app
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = String(e.key || '').toLowerCase();
        if (key === 'k' || key === 'i') {
          e.preventDefault();
          e.stopPropagation();
          sendToParent('SHORTCUT', { action: key === 'k' ? 'search' : 'ai' });
          return;
        }
      }

      switch (e.key) {
        case 'PageUp':
        case 'ArrowUp':
          prevPage();
          e.preventDefault();
          break;
        case 'PageDown':
        case 'ArrowDown':
          nextPage();
          e.preventDefault();
          break;
        case 'Home':
          goToPage(1);
          e.preventDefault();
          break;
        case 'End':
          goToPage(totalPages || 1);
          e.preventDefault();
          break;
        case '+':
        case '=':
          if (e.metaKey || e.ctrlKey) {
            zoomIn();
            e.preventDefault();
          }
          break;
        case '-':
          if (e.metaKey || e.ctrlKey) {
            zoomOut();
            e.preventDefault();
          }
          break;
        case '0':
          if (e.metaKey || e.ctrlKey) {
            setZoom(1);
            e.preventDefault();
          }
          break;
      }
    });
  }

  function wireCopyHandling() {
    document.addEventListener('copy', () => {
      try {
        const sel = window.getSelection ? window.getSelection() : null;
        const text = sel ? String(sel.toString() || '') : '';
        if (text.trim().length > 0) {
          sendToParent('COPY', { text });
        }
      } catch {}
    });
  }

  function wirePinchZoom() {
    if (!viewerContainer) return;

    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      // Prevent browser zoom; we implement in-view zoom.
      event.preventDefault();

      const rect = viewerContainer.getBoundingClientRect();
      const viewportX = event.clientX - rect.left;
      const viewportY = event.clientY - rect.top;

      // Calculate velocity for acceleration (ported from PDF viewer)
      const now = performance.now();
      const dt = now - lastWheelTime;
      if (dt > 0 && dt < 200) {
        const instantVelocity = Math.abs(event.deltaY) / dt * 16;
        velocity = velocity * 0.7 + instantVelocity * 0.3;
      } else {
        velocity = Math.abs(event.deltaY) * 0.1;
      }
      lastWheelTime = now;

      if (!pinchActive) {
        pinchActive = true;
        pinchStartZoom = zoom || 1;
        pinchAccumulatedDelta = 0;
        pinchAnchor = getViewportAnchor(viewportX, viewportY, pinchStartZoom);
      } else if (pinchAnchor) {
        pinchAnchor.viewportX = viewportX;
        pinchAnchor.viewportY = viewportY;
      }

      const accelMultiplier = getAccelerationMultiplier(velocity);
      pinchAccumulatedDelta += event.deltaY * accelMultiplier;

      const desiredZoom = clamp(
        pinchStartZoom * Math.exp(-pinchAccumulatedDelta / PINCH_WHEEL_EXP_DIVISOR),
        MIN_ZOOM,
        MAX_ZOOM,
      );

      if (pinchRafId !== null) cancelAnimationFrame(pinchRafId);
      pinchRafId = requestAnimationFrame(() => {
        pinchRafId = null;
        if (!pinchAnchor) return;

        zoomMode = 'custom';
        zoom = desiredZoom;
        applyZoomStyle();
        applyViewportAnchor(pinchAnchor, zoom);
        updateToolbar();
        sendToParent('ZOOM_CHANGED', { zoom });
      });

      if (pinchEndTimer) clearTimeout(pinchEndTimer);
      pinchEndTimer = setTimeout(() => {
        pinchActive = false;
        pinchStartZoom = zoom || pinchStartZoom;
        pinchAccumulatedDelta = 0;
        pinchAnchor = null;
        pinchEndTimer = null;
        velocity = 0;
      }, 160);
    };

    viewerContainer.addEventListener('wheel', onWheel, { passive: false });
  }

  function wireResizeHandling() {
    if (!viewerContainer) return;

    const onResize = () => {
      if (performance.now() < suspendFitOnResizeUntil) return;
      // Keep layout box in sync with viewport sizing changes (e.g., panel open/close).
      if (zoomMode === 'page-width' || zoomMode === 'page-fit' || zoomMode === 'auto') {
        const desired = computeZoomForMode(zoomMode);
        // Avoid thrashing if already close.
        if (Math.abs(desired - zoom) > 0.005) {
          const rect = viewerContainer.getBoundingClientRect();
          const anchor = getViewportAnchor(rect.width / 2, rect.height / 2, zoom);
          setZoom(desired, anchor, { keepMode: true });
          return;
        }
      }
      updateScaleContainers();
      maybeRecenterHorizontally();
    };

    // Prefer ResizeObserver for accurate iframe-internal sizing changes.
    if (typeof ResizeObserver !== 'undefined') {
      try {
        const ro = new ResizeObserver(() => onResize());
        ro.observe(viewerContainer);
      } catch {}
    }

    window.addEventListener('resize', onResize, { passive: true });
  }

  // Listen for postMessage from parent
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    if (event.data && event.data.type) handleCommand(event.data);
  });

  function init() {
    setHidden(loadingIndicator, true);
    setHidden(errorMessage, true);
    updateToolbar();
    applyZoom();
    setHandMode(false);
    wireToolbar();
    wireScrollTracking();
    wireHandDrag();
    wireKeyboard();
    wireCopyHandling();
    wirePinchZoom();
    wireResizeHandling();
    sendToParent('READY');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.docxViewerBridge = { handleCommand, getState, loadDocx };
})();
