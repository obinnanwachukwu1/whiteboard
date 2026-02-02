/**
 * PDF Viewer Bridge Script
 * 
 * This script runs inside the pdf.js viewer webview and handles:
 * 1. Initializing the PDFViewer with EventBus
 * 2. Listening for commands from the parent (React)
 * 3. Sending events back to the parent
 */

(function() {
  'use strict';
  
  // Get references to pdf.js globals
  const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
  const pdfjsViewer = window.pdfjsViewer || window['pdfjs-dist/web/pdf_viewer'];
  
  // Configure pdf.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.js';
  
  // Viewer state
  let pdfViewer = null;
  let pdfDocument = null;
  let loadingTask = null;
  let eventBus = null;
  let linkService = null;
  let currentUrl = null;
  let selectionMode = 'text'; // 'text' or 'hand'

  // When set, avoid re-applying fit/auto scale modes on resize.
  // This prevents expensive relayout loops during container width animations (e.g. AI panel open/close).
  let suspendFitOnResizeUntil = 0;

  // Trackpad pinch zoom state (ctrl/meta + wheel on Chromium)
  let pinchActive = false;
  let pinchStartScale = 1;
  let pinchAccumulatedDelta = 0;
  let pinchAnchor = null; // { contentX, contentY, viewportX, viewportY }
  let pinchRafId = null;
  let pinchEndTimer = null;
  
  // Velocity tracking for acceleration
  let lastWheelTime = 0;
  let lastWheelDelta = 0;
  let velocity = 0;
  
  // Zoom constants
  const PINCH_WHEEL_EXP_DIVISOR = 300;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;
  
  // Acceleration curve: velocity -> multiplier
  // At low velocity (slow pinch): multiplier ~1 (precise control)
  // At high velocity (fast pinch): multiplier up to ~2.5 (faster zoom)
  function getAccelerationMultiplier(vel) {
    const absVel = Math.abs(vel);
    // Threshold below which no acceleration (for precise control)
    if (absVel < 0.5) return 1;
    // Sigmoid-like curve: ramps up smoothly from 1 to ~2.5
    // velocity of ~2 gives ~1.5x, velocity of ~5+ gives ~2.5x
    const accel = 1 + 1.5 * (1 - Math.exp(-absVel / 3));
    return Math.min(accel, 2.5);
  }

  // Hand-tool drag pan state
  let handDragging = false;
  let handStart = null; // { x, y, scrollLeft, scrollTop }

  // Map viewport coordinates to a stable anchor inside a page.
  // This avoids drift on deep pages where inter-page margins do not scale.
  function getPageAnchor(viewportX, viewportY) {
    if (!viewerContainer) return null;
    try {
      const rect = viewerContainer.getBoundingClientRect();
      const clientX = rect.left + viewportX;
      const clientY = rect.top + viewportY;
      const el = document.elementFromPoint(clientX, clientY);
      if (!el || !el.closest) return null;

      const pageEl = el.closest('.page');
      if (!pageEl) return null;

      const nAttr = pageEl.getAttribute('data-page-number') || (pageEl.dataset ? pageEl.dataset.pageNumber : null);
      const pageNumber = Number(nAttr);
      if (!Number.isFinite(pageNumber) || pageNumber <= 0) return null;

      const pageRect = pageEl.getBoundingClientRect();
      return {
        pageNumber,
        withinX: clientX - pageRect.left,
        withinY: clientY - pageRect.top,
        viewportX,
        viewportY,
      };
    } catch {
      return null;
    }
  }

  function findPageEl(pageNumber) {
    try {
      return (
        document.querySelector(`.page[data-page-number="${pageNumber}"]`) ||
        document.getElementById(`pageContainer${pageNumber}`)
      );
    } catch {
      return null;
    }
  }

  function applyPageAnchor(anchor, ratio) {
    if (!viewerContainer || !anchor) return false;
    const pageEl = findPageEl(anchor.pageNumber);
    if (!pageEl) return false;

    const viewportX = anchor.viewportX;
    const viewportY = anchor.viewportY;

    // offsetTop/Left are in the scroll content coordinate space of viewerContainer.
    const nextLeft = Math.max(0, pageEl.offsetLeft + anchor.withinX * ratio - viewportX);
    const nextTop = Math.max(0, pageEl.offsetTop + anchor.withinY * ratio - viewportY);

    viewerContainer.scrollLeft = nextLeft;
    viewerContainer.scrollTop = nextTop;
    return true;
  }

  // Hide Chromium-style page indicator overlays if present
  const PAGE_INDICATOR_RE = /^\s*\d+\s*\/\s*\d+\s*$/;
  function hidePageIndicatorOverlays() {
    if (!viewerContainer) return;

    // If Chromium's <viewer-page-indicator> exists for any reason, remove it.
    const chromiumIndicator = document.querySelector('viewer-page-indicator, #page-indicator');
    if (chromiumIndicator) {
      try { chromiumIndicator.remove(); } catch {}
    }

    const candidates = viewerContainer.querySelectorAll('div, span');
    for (const el of candidates) {
      const text = (el.textContent || '').trim();
      if (!PAGE_INDICATOR_RE.test(text)) continue;
      // Never hide actual PDF text layers/annotations
      if (el.closest('.textLayer, .annotationLayer, .annotationEditorLayer')) continue;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // Heuristic: overlays are usually positioned and small
      if (!(cs.position === 'fixed' || cs.position === 'absolute')) continue;
      if (el.clientWidth > 140 || el.clientHeight > 60) continue;
      el.style.display = 'none';
    }
  }

  function updatePageGaps(scale) {
    try {
      const s = typeof scale === 'number' && isFinite(scale) ? scale : (pdfViewer?.currentScale || 1);
      // Keep visual page gaps roughly proportional to zoom.
      const top = Math.round(clamp(4, 10, 8 * s));
      const bottom = Math.round(clamp(8, 28, 24 * s));
      document.documentElement.style.setProperty('--page-gap-top', `${top}px`);
      document.documentElement.style.setProperty('--page-gap-bottom', `${bottom}px`);
    } catch {}
  }
  
  // Standard zoom values for zoom in/out
  const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
  const DEFAULT_SCALE = 'page-width';
  
  // DOM elements
  const viewerContainer = document.getElementById('viewerContainer');
  const viewer = document.getElementById('viewer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // Toolbar DOM
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

  let zoomMenuOpen = false;

  function getZoomDisplay(scale, scaleMode) {
    if (scaleMode === 'page-width') return 'Width';
    if (scaleMode === 'page-fit') return 'Fit';
    if (scaleMode === 'auto') return 'Auto';
    const s = typeof scale === 'number' && isFinite(scale) ? scale : (pdfViewer?.currentScale || 1);
    return `${Math.round(s * 100)}%`;
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
  }

  function toggleZoomMenu() {
    if (zoomMenuOpen) closeZoomMenu();
    else openZoomMenu();
  }

  function updateToolbar() {
    if (!wbToolbar) return;
    const st = getState();
    if (wbPageInput && document.activeElement !== wbPageInput) {
      wbPageInput.value = st.page ? String(st.page) : '';
    }
    if (wbPageTotal) {
      wbPageTotal.textContent = st.pageCount > 0 ? String(st.pageCount) : '–';
    }
    if (wbPrev) wbPrev.disabled = !(st.page > 1);
    if (wbNext) wbNext.disabled = !(st.pageCount > 0 && st.page < st.pageCount);
    if (wbZoomLabel) wbZoomLabel.textContent = getZoomDisplay(st.scale, st.scaleMode);
    if (wbHand) {
      const active = st.selectionMode === 'hand';
      wbHand.classList.toggle('wb-active', active);
    }
  }

  function installToolbar() {
    if (!wbToolbar) return;

    // Zoom menu items
    if (wbZoomMenu) {
      wbZoomMenu.innerHTML = '';
      for (const preset of ZOOM_PRESETS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wb-menu-item';
        btn.textContent = preset.label;
        btn.addEventListener('click', () => {
          closeZoomMenu();
          if (typeof preset.value === 'string') setScaleMode(preset.value);
          else setScale(preset.value);
        });
        wbZoomMenu.appendChild(btn);
      }
    }

    if (wbPrev) wbPrev.addEventListener('click', () => prevPage());
    if (wbNext) wbNext.addEventListener('click', () => nextPage());
    if (wbZoomOut) wbZoomOut.addEventListener('click', () => zoomOut());
    if (wbZoomIn) wbZoomIn.addEventListener('click', () => zoomIn());
    if (wbZoomLabel) wbZoomLabel.addEventListener('click', () => toggleZoomMenu());

    if (wbPageForm && wbPageInput) {
      const submit = () => {
        const st = getState();
        const n = parseInt(String(wbPageInput.value || '').trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= (st.pageCount || n)) {
          goToPage(n);
        } else {
          wbPageInput.value = st.page ? String(st.page) : '';
        }
      };
      wbPageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submit();
      });
      wbPageInput.addEventListener('blur', () => submit());
    }

    if (wbHand) {
      wbHand.addEventListener('click', () => {
        setSelectionMode(selectionMode === 'hand' ? 'text' : 'hand');
      });
    }

    if (wbDownload) {
      wbDownload.addEventListener('click', () => {
        sendToParent('DOWNLOAD_REQUESTED', {});
      });
    }

    // Dismiss zoom menu on outside click
    document.addEventListener('pointerdown', (e) => {
      if (!zoomMenuOpen) return;
      const t = e.target;
      if (!t) return;
      if (wbZoomMenu && (wbZoomMenu === t || wbZoomMenu.contains(t))) return;
      if (wbZoomLabel && (wbZoomLabel === t || wbZoomLabel.contains(t))) return;
      closeZoomMenu();
    }, { capture: true });

    updateToolbar();
  }
  
  /**
   * Send event to parent window via the preload bridge
   */
  function sendToParent(type, payload = {}) {
    if (window.pdfBridge && window.pdfBridge.sendToParent) {
      window.pdfBridge.sendToParent({ type, ...payload });
    } else {
      // Fallback for iframe + postMessage (and dev without preload)
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type, ...payload }, '*');
          return;
        }
      } catch {}

      console.log('[PDFBridge] Event:', type, payload);
    }
  }
  
  /**
   * Show loading indicator
   */
  function showLoading() {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
  }
  
  /**
   * Hide loading indicator
   */
  function hideLoading() {
    loadingIndicator.classList.add('hidden');
  }
  
  /**
   * Show error message
   */
  function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }
  
  /**
   * Initialize the PDF viewer
   */
  function initViewer() {
    if (!pdfjsLib || !pdfjsViewer) {
      const message = 'PDF.js viewer assets failed to load';
      showError(message);
      sendToParent('ERROR', { message });
      return;
    }

    try {
      // Create EventBus - the central event system for pdf.js
      eventBus = new pdfjsViewer.EventBus();
    
      // Create link service for internal links
      linkService = new pdfjsViewer.PDFLinkService({
        eventBus,
      });
    
      // Create the PDF viewer
      pdfViewer = new pdfjsViewer.PDFViewer({
        container: viewerContainer,
        viewer: viewer,
        eventBus,
        linkService,
        textLayerMode: 2, // Enable text layer for selection
        annotationMode: 2, // Enable annotations
        removePageBorders: false,
      });
    
      // Link the services
      linkService.setViewer(pdfViewer);
    
      // Subscribe to EventBus events
      eventBus.on('pagesinit', function() {
        // Set default scale after pages are initialized
        pdfViewer.currentScaleValue = DEFAULT_SCALE;
        updatePageGaps(pdfViewer.currentScale);
        updateToolbar();
        hideLoading();
        
        sendToParent('DOC_LOADED', {
          pageCount: pdfDocument.numPages,
          scale: pdfViewer.currentScale,
          scaleMode: pdfViewer.currentScaleValue
        });
      });
    
      eventBus.on('pagechanging', function(evt) {
        sendToParent('PAGE_CHANGED', {
          page: evt.pageNumber,
          previous: evt.previous
        });
        updateToolbar();
      });
    
      eventBus.on('scalechanging', function(evt) {
        sendToParent('SCALE_CHANGED', {
          scale: evt.scale,
          presetValue: evt.presetValue
        });
        updatePageGaps(evt.scale);
        // Some pdf.js builds show a small "page/total" overlay during zoom; hide it.
        hidePageIndicatorOverlays();
        updateToolbar();
      });

    
      // Handle window resize
      window.addEventListener('resize', function() {
        try {
          if (performance.now() < suspendFitOnResizeUntil) return;
        } catch {}
        // If in a "fit" mode, re-apply it on resize
        const currentValue = pdfViewer.currentScaleValue;
        if (currentValue === 'page-width' || currentValue === 'page-fit' || currentValue === 'auto') {
          pdfViewer.currentScaleValue = currentValue;
        }
      });
    
      // Notify parent that viewer is ready
      sendToParent('READY');

      // Enable gesture semantics inside the viewer surface:
      // - Trackpad pinch zoom (ctrl/meta wheel) with cursor anchoring
      // - Hand-tool drag panning (when selectionMode === 'hand')
      installInputHandlers();
      installToolbar();
      // Also keep page-indicator overlays hidden if they appear later.
      try {
        const mo = new MutationObserver(() => hidePageIndicatorOverlays());
        mo.observe(viewerContainer, { childList: true, subtree: true });
      } catch {}
    } catch (error) {
      const message = error?.message || 'Failed to initialize PDF viewer';
      showError(message);
      sendToParent('ERROR', { message });
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function installInputHandlers() {
    if (!viewerContainer) return;

    function isEditableTarget(t) {
      if (!t) return false;
      const tag = (t.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      try {
        if (t.isContentEditable) return true;
      } catch {}
      return false;
    }

    // Ensure webview gets focus on click so keyboard commands work
    viewerContainer.addEventListener('mousedown', () => {
      window.focus();
    });

    // Explicitly handle Copy command (Cmd+C / Ctrl+C)
    // This fixes issues where the Electron menu "Copy" doesn't reach the webview
    document.addEventListener('keydown', (event) => {
      // Cmd+K / Ctrl+K: open global search
      // Cmd+I / Ctrl+I: open AI panel
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        const key = String(event.key || '').toLowerCase();
        if ((key === 'k' || key === 'i') && !isEditableTarget(event.target)) {
          event.preventDefault();
          event.stopPropagation();
          sendToParent('SHORTCUT', { action: key === 'k' ? 'search' : 'ai' });
          return;
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
        // Only trigger if text is selected
        const selection = window.getSelection();
        const text = selection ? selection.toString() : '';
        
        if (text.length > 0) {
          // Send to parent to handle clipboard write
          sendToParent('COPY', { text });
          // Also try execCommand as fallback/standard behavior
          try {
            document.execCommand('copy');
          } catch (e) {
            // ignore
          }
        }
      }
    });

    // Trackpad pinch zoom: on macOS and many trackpads, pinch is delivered as ctrl/meta+wheel
    const onWheel = (event) => {
      if (!pdfViewer) return;
      if (!(event.ctrlKey || event.metaKey)) return;

      // Prevent browser (page) zoom and let pdf.js viewer zoom instead
      event.preventDefault();

      const rect = viewerContainer.getBoundingClientRect();
      const viewportX = event.clientX - rect.left;
      const viewportY = event.clientY - rect.top;

      // Calculate velocity for acceleration
      const now = performance.now();
      const dt = now - lastWheelTime;
      if (dt > 0 && dt < 200) {
        // Smooth velocity with exponential moving average
        const instantVelocity = Math.abs(event.deltaY) / dt * 16; // normalize to ~60fps
        velocity = velocity * 0.7 + instantVelocity * 0.3;
      } else {
        velocity = Math.abs(event.deltaY) * 0.1; // reset on long pause
      }
      lastWheelTime = now;
      lastWheelDelta = event.deltaY;

      if (!pinchActive) {
        pinchActive = true;
        pinchStartScale = pdfViewer.currentScale || 1;
        pinchAccumulatedDelta = 0;

        // Anchor inside the page under the cursor (stable across margins).
        pinchAnchor = getPageAnchor(viewportX, viewportY) || {
          contentX: viewerContainer.scrollLeft + viewportX,
          contentY: viewerContainer.scrollTop + viewportY,
          viewportX,
          viewportY,
        };
        // Hide text layer during zoom to prevent flashing
        viewer?.classList.add('zooming');
      } else if (pinchAnchor) {
        // Keep content anchor fixed, update viewport in case cursor moved
        pinchAnchor.viewportX = viewportX;
        pinchAnchor.viewportY = viewportY;
      }

      // Apply acceleration based on velocity
      const accelMultiplier = getAccelerationMultiplier(velocity);
      pinchAccumulatedDelta += event.deltaY * accelMultiplier;
      const desiredScale = clamp(
        pinchStartScale * Math.exp(-pinchAccumulatedDelta / PINCH_WHEEL_EXP_DIVISOR),
        MIN_SCALE,
        MAX_SCALE
      );

      // Throttle to animation frames
      if (pinchRafId !== null) {
        cancelAnimationFrame(pinchRafId);
      }
      pinchRafId = requestAnimationFrame(() => {
        pinchRafId = null;
        if (!pdfViewer || !pinchAnchor) return;

        pdfViewer.currentScale = desiredScale;

        const ratio = desiredScale / pinchStartScale;

        // Cursor-anchored zoom, stable across page margins.
        if (pinchAnchor.pageNumber) {
          applyPageAnchor(pinchAnchor, ratio);
        } else {
          viewerContainer.scrollLeft = Math.max(0, pinchAnchor.contentX * ratio - pinchAnchor.viewportX);
          viewerContainer.scrollTop = Math.max(0, pinchAnchor.contentY * ratio - pinchAnchor.viewportY);
        }
      });

      // Consider the pinch ended after a short pause in wheel events
      if (pinchEndTimer) clearTimeout(pinchEndTimer);
      pinchEndTimer = setTimeout(() => {
        pinchActive = false;
        pinchStartScale = pdfViewer?.currentScale || pinchStartScale;
        pinchAccumulatedDelta = 0;
        pinchAnchor = null;
        pinchEndTimer = null;
        velocity = 0;
        // Re-show text layer after zoom ends
        viewer?.classList.remove('zooming');
      }, 160);
    };

    viewerContainer.addEventListener('wheel', onWheel, { passive: false });

    // Hand-tool drag panning
    const onPointerDown = (event) => {
      if (selectionMode !== 'hand') return;
      if (!viewerContainer) return;
      // Only left mouse button for mouse pointers
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      handDragging = true;
      handStart = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: viewerContainer.scrollLeft,
        scrollTop: viewerContainer.scrollTop,
      };
      try { viewerContainer.setPointerCapture(event.pointerId); } catch {}
    };

    const onPointerMove = (event) => {
      if (!handDragging || !handStart || selectionMode !== 'hand') return;
      event.preventDefault();
      const dx = event.clientX - handStart.x;
      const dy = event.clientY - handStart.y;
      viewerContainer.scrollLeft = handStart.scrollLeft - dx;
      viewerContainer.scrollTop = handStart.scrollTop - dy;
    };

    const endHandDrag = (event) => {
      if (!handDragging) return;
      handDragging = false;
      handStart = null;
      try { viewerContainer.releasePointerCapture(event.pointerId); } catch {}
    };

    viewerContainer.addEventListener('pointerdown', onPointerDown, { passive: true });
    viewerContainer.addEventListener('pointermove', onPointerMove, { passive: false });
    viewerContainer.addEventListener('pointerup', endHandDrag, { passive: true });
    viewerContainer.addEventListener('pointercancel', endHandDrag, { passive: true });
  }
  
  /**
   * Load a PDF document
   */
  async function loadPdf(url) {
    if (!url) {
      showError('No PDF URL provided');
      sendToParent('ERROR', { message: 'No PDF URL provided' });
      return;
    }
    
    // Cancel any in-flight load
    if (loadingTask && typeof loadingTask.destroy === 'function') {
      try { await loadingTask.destroy(); } catch {}
      loadingTask = null;
    }

    // Cleanup previous document (safe)
    if (pdfDocument && typeof pdfDocument.destroy === 'function') {
      try { pdfDocument.destroy(); } catch {}
    }
    pdfDocument = null;
    
    currentUrl = url;
    showLoading();
    
    // Notify React that loading started (so it can show its own spinner)
    sendToParent('LOADING_STARTED', { url });
    
    try {
      // Load the PDF document
      loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: './cmaps/',
        cMapPacked: true,
        enableXfa: false,
      });
      
      const doc = await loadingTask.promise;
      // If another LOAD_PDF started while this one was loading, ignore this result
      if (loadingTask === null || currentUrl !== url) {
        try { doc.destroy(); } catch {}
        return;
      }

      pdfDocument = doc;
      
      // Set document in viewer and link service
      pdfViewer.setDocument(pdfDocument);
      linkService.setDocument(pdfDocument, null);
      loadingTask = null;
      
    } catch (error) {
      loadingTask = null;
      const message = error.message || 'Failed to load PDF';
      showError(message);
      sendToParent('ERROR', { message });
    }
  }
  
  /**
   * Navigate to a specific page
   */
  function goToPage(page) {
    if (!pdfViewer || !pdfDocument) return;
    
    const pageNum = Math.max(1, Math.min(page, pdfDocument.numPages));
    pdfViewer.currentPageNumber = pageNum;
  }
  
  /**
   * Go to next page
   */
  function nextPage() {
    if (!pdfViewer || !pdfDocument) return;
    
    if (pdfViewer.currentPageNumber < pdfDocument.numPages) {
      pdfViewer.currentPageNumber++;
    }
  }
  
  /**
   * Go to previous page
   */
  function prevPage() {
    if (!pdfViewer || !pdfDocument) return;
    
    if (pdfViewer.currentPageNumber > 1) {
      pdfViewer.currentPageNumber--;
    }
  }
  
  /**
   * Set scale to a specific value
   */
  function setScale(scale) {
    if (!pdfViewer) return;
    
    // Clamp scale to valid range
    const clampedScale = Math.max(0.1, Math.min(10, scale));
    // Use anchored zoom so the viewport doesn't jump.
    zoomToScale(clampedScale);
  }
  
  /**
   * Set scale mode (page-width, page-fit, auto)
   */
  function setScaleMode(mode) {
    if (!pdfViewer) return;
    
    // Valid modes: 'page-width', 'page-fit', 'auto', 'page-actual'
    const validModes = ['page-width', 'page-fit', 'auto', 'page-actual'];
    if (validModes.includes(mode)) {
      pdfViewer.currentScaleValue = mode;
    }
  }
  
  /**
   * Zoom with center anchoring (for button zoom)
   */
  function zoomToScale(newScale) {
    if (!pdfViewer || !viewerContainer) return;

    const oldScale = pdfViewer.currentScale;
    const ratio = newScale / oldScale;

    // Anchor on viewport center.
    const viewportCenterX = viewerContainer.clientWidth / 2;
    const viewportCenterY = viewerContainer.clientHeight / 2;
    const anchor = getPageAnchor(viewportCenterX, viewportCenterY);
    const contentX = viewerContainer.scrollLeft + viewportCenterX;
    const contentY = viewerContainer.scrollTop + viewportCenterY;
    
    // Apply scale first; pdf.js may adjust scroll during layout.
    pdfViewer.currentScale = newScale;

    // Adjust scroll on the next frame so it wins over pdf.js internal updates.
    requestAnimationFrame(() => {
      try {
        if (anchor && anchor.pageNumber) {
          applyPageAnchor(anchor, ratio);
        } else {
          viewerContainer.scrollLeft = Math.max(0, contentX * ratio - viewportCenterX);
          viewerContainer.scrollTop = Math.max(0, contentY * ratio - viewportCenterY);
        }
      } catch {}
      // One more time shortly after (pdf.js sometimes applies another clamp/layout pass).
      setTimeout(() => {
        try {
          if (anchor && anchor.pageNumber) {
            applyPageAnchor(anchor, ratio);
          } else {
            viewerContainer.scrollLeft = Math.max(0, contentX * ratio - viewportCenterX);
            viewerContainer.scrollTop = Math.max(0, contentY * ratio - viewportCenterY);
          }
        } catch {}
      }, 0);
    });
  }

  /**
   * Zoom in to next zoom level
   */
  function zoomIn() {
    if (!pdfViewer) return;
    
    const currentScale = pdfViewer.currentScale;
    
    // Find next zoom level
    for (const level of ZOOM_LEVELS) {
      if (level > currentScale + 0.01) {
        zoomToScale(level);
        return;
      }
    }
    
    // If at max, stay there
    zoomToScale(ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
  }
  
  /**
   * Zoom out to previous zoom level
   */
  function zoomOut() {
    if (!pdfViewer) return;
    
    const currentScale = pdfViewer.currentScale;
    
    // Find previous zoom level
    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      if (ZOOM_LEVELS[i] < currentScale - 0.01) {
        zoomToScale(ZOOM_LEVELS[i]);
        return;
      }
    }
    
    // If at min, stay there
    zoomToScale(ZOOM_LEVELS[0]);
  }
  
  /**
   * Set selection mode (text or hand)
   */
  function setSelectionMode(mode) {
    if (!viewer) return;
    
    selectionMode = mode;
    
    if (mode === 'hand') {
      viewer.classList.add('grabMode');
      viewer.classList.remove('textSelectionMode');
    } else {
      viewer.classList.remove('grabMode');
      viewer.classList.add('textSelectionMode');
    }
    
    sendToParent('SELECTION_MODE_CHANGED', { mode });
    updateToolbar();
  }
  
  /**
   * Get current viewer state
   */
  function getState() {
    if (!pdfViewer || !pdfDocument) {
      return {
        page: 0,
        pageCount: 0,
        scale: 1,
        scaleMode: null,
        selectionMode: selectionMode
      };
    }
    
    return {
      page: pdfViewer.currentPageNumber,
      pageCount: pdfDocument.numPages,
      scale: pdfViewer.currentScale,
      scaleMode: pdfViewer.currentScaleValue,
      selectionMode: selectionMode
    };
  }
  
  /**
   * Handle commands from parent
   */
  function handleCommand(command) {
    if (!command || !command.type) return;
    
    switch (command.type) {
      case 'LOAD_PDF':
        loadPdf(command.url);
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
        
      case 'SET_SCALE':
        setScale(command.scale);
        break;
        
      case 'SET_SCALE_MODE':
        setScaleMode(command.mode);
        break;

      case 'SUSPEND_FIT_ON_RESIZE':
        try {
          const ms = Number(command.ms);
          const dur = Number.isFinite(ms) ? Math.max(0, ms) : 400;
          suspendFitOnResizeUntil = Math.max(suspendFitOnResizeUntil, performance.now() + dur);
        } catch {}
        break;
        
      case 'ZOOM_IN':
        zoomIn();
        break;
        
      case 'ZOOM_OUT':
        zoomOut();
        break;
        
      case 'SET_SELECTION_MODE':
        setSelectionMode(command.mode);
        break;
        
      case 'GET_STATE':
        sendToParent('STATE', getState());
        break;
        
      case 'SET_THEME':
        setTheme(command.theme);
        break;

      case 'SET_APP_STYLE':
        try {
          if (command.fontFamily && typeof command.fontFamily === 'string') {
            document.documentElement.style.setProperty('--wb-font', command.fontFamily);
          }
        } catch {}
        break;

      case 'DOWNLOAD':
        // Trigger download by creating a temporary link
        const link = document.createElement('a');
        link.href = currentUrl;
        link.download = ''; // Let browser determine filename from URL
        link.target = '_blank'; // Fallback to open in new tab
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;

      default:
        console.warn('[PDFBridge] Unknown command:', command.type);
    }
  }
  
  /**
   * Set the theme (dark/light) for background color matching
   */
  function setTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.add('light');
    }
    // If no theme specified, will use system preference via CSS
  }
  
  // Set up command listener from preload bridge
  if (window.pdfBridge && window.pdfBridge.onCommand) {
    window.pdfBridge.onCommand(handleCommand);
  }
  
  // Also listen for postMessage (fallback/dev mode)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type) {
      handleCommand(event.data);
    }
  });
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewer);
  } else {
    initViewer();
  }
  
  // Expose for debugging
  window.pdfViewerBridge = {
    handleCommand,
    getState,
    loadPdf,
  };
})();
