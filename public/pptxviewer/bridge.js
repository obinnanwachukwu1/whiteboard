/**
 * PPTX Viewer Bridge Script
 * 
 * This script runs inside the PPTXjs viewer iframe and handles:
 * 1. Initializing PPTXjs with the provided URL
 * 2. Listening for commands from the parent (React)
 * 3. Sending events back to the parent
 * 4. Trackpad pinch zoom with cursor anchoring
 */

(function() {
  'use strict';

  // Viewer state
  let currentUrl = null;
  let totalSlides = 0;
  let currentSlide = 1;
  let currentScale = 1; // actual scale factor (1 = 100%)
  let scaleMode = 'fit-width'; // 'fit-width', 'fit-page', or null (custom)
  let selectionMode = 'text'; // 'text' or 'hand'
  let isLoading = false;

  // Trackpad pinch zoom state
  let pinchActive = false;
  let pinchStartScale = 1;
  let pinchAccumulatedDelta = 0;
  let pinchAnchor = null;
  let pinchRafId = null;
  let pinchEndTimer = null;
  let lastWheelTime = 0;
  let velocity = 0;

  // Hand-tool drag pan state
  let handDragging = false;
  let handStart = null; // { x, y, scrollLeft, scrollTop }

  // Zoom constants
  const PINCH_WHEEL_EXP_DIVISOR = 300;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;

  // DOM elements
  const viewerContainer = document.getElementById('viewerContainer');
  const pptxResult = document.getElementById('pptx-result');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // Toolbar DOM
  const wbToolbar = document.getElementById('wbToolbar');
  const wbPrev = document.getElementById('wbPrev');
  const wbNext = document.getElementById('wbNext');
  const wbSlideForm = document.getElementById('wbSlideForm');
  const wbSlideInput = document.getElementById('wbSlideInput');
  const wbSlideTotal = document.getElementById('wbSlideTotal');
  const wbZoomOut = document.getElementById('wbZoomOut');
  const wbZoomIn = document.getElementById('wbZoomIn');
  const wbZoomLabel = document.getElementById('wbZoomLabel');
  const wbZoomMenu = document.getElementById('wbZoomMenu');
  const wbHand = document.getElementById('wbHand');
  const wbDownload = document.getElementById('wbDownload');

  const ZOOM_PRESETS = [
    { label: 'Fit Width', value: 'fit-width' },
    { label: 'Fit Page', value: 'fit-page' },
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1.0 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2.0 },
  ];

  const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];

  let zoomMenuOpen = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Acceleration curve for pinch zoom
  function getAccelerationMultiplier(vel) {
    const absVel = Math.abs(vel);
    if (absVel < 0.5) return 1;
    const accel = 1 + 1.5 * (1 - Math.exp(-absVel / 3));
    return Math.min(accel, 2.5);
  }

  /**
   * Send event to parent window via postMessage
   */
  function sendToParent(type, payload = {}) {
    try {
      window.parent.postMessage({ type, ...payload }, '*');
    } catch (e) {
      console.log('[PPTXBridge] Event:', type, payload);
    }
  }

  /**
   * Show loading indicator
   */
  function showLoading() {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    isLoading = true;
  }

  /**
   * Hide loading indicator
   */
  function hideLoading() {
    loadingIndicator.classList.add('hidden');
    isLoading = false;
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
   * Hide error message
   */
  function hideError() {
    errorMessage.classList.add('hidden');
  }

  /**
   * Get zoom display text
   */
  function getZoomDisplay() {
    if (scaleMode === 'fit-width') return 'Width';
    if (scaleMode === 'fit-page') return 'Fit';
    return `${Math.round(currentScale * 100)}%`;
  }

  /**
   * Update toolbar state
   */
  function updateToolbar() {
    if (!wbToolbar) return;

    if (wbSlideInput && document.activeElement !== wbSlideInput) {
      wbSlideInput.value = currentSlide > 0 ? String(currentSlide) : '';
    }
    if (wbSlideTotal) {
      wbSlideTotal.textContent = totalSlides > 0 ? String(totalSlides) : '–';
    }
    if (wbPrev) wbPrev.disabled = !(currentSlide > 1);
    if (wbNext) wbNext.disabled = !(totalSlides > 0 && currentSlide < totalSlides);
    if (wbZoomLabel) wbZoomLabel.textContent = getZoomDisplay();
    if (wbHand) {
      wbHand.classList.toggle('wb-active', selectionMode === 'hand');
    }
  }

  /**
   * Get all slide elements
   */
  function getSlides() {
    return Array.from(pptxResult.querySelectorAll('.slide'));
  }

  /**
   * Get the natural dimensions of slides
   */
  function getSlideNaturalSize() {
    const slides = getSlides();
    if (!slides.length) return { width: 960, height: 540 }; // Default 16:9
    const firstSlide = slides[0];
    // PPTXjs sets width/height on slides
    const width = parseInt(firstSlide.style.width) || firstSlide.offsetWidth || 960;
    const height = parseInt(firstSlide.style.height) || firstSlide.offsetHeight || 540;
    return { width, height };
  }

  /**
   * Calculate scale to fit width
   */
  function calculateFitWidthScale() {
    const containerWidth = viewerContainer.clientWidth - 48; // padding
    const { width } = getSlideNaturalSize();
    return Math.min(1.5, containerWidth / width);
  }

  /**
   * Calculate scale to fit page (both width and height)
   */
  function calculateFitPageScale() {
    const containerWidth = viewerContainer.clientWidth - 48;
    const containerHeight = viewerContainer.clientHeight - 120; // account for toolbar
    const { width, height } = getSlideNaturalSize();
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    return Math.min(scaleX, scaleY, 1.5);
  }

  /**
   * Apply current scale to slides
   * 
   * We use CSS zoom (not transform) because zoom affects layout sizing.
   * This ensures gaps scale proportionally and no extra space appears.
   * CSS zoom is non-standard but works perfectly in Chromium/Electron.
   */
  function applyScale() {
    const slides = getSlides();
    if (!slides.length) return;

    let effectiveScale = currentScale;

    if (scaleMode === 'fit-width') {
      effectiveScale = calculateFitWidthScale();
      currentScale = effectiveScale;
    } else if (scaleMode === 'fit-page') {
      effectiveScale = calculateFitPageScale();
      currentScale = effectiveScale;
    }

    // Use CSS zoom - it affects layout unlike transform
    pptxResult.style.zoom = effectiveScale;
    // Clear any transform that might have been set
    pptxResult.style.transform = '';

    updateToolbar();
    sendToParent('SCALE_CHANGED', { scale: currentScale, scaleMode });
  }

  /**
   * Set scale to a specific value
   */
  function setScale(scale) {
    scaleMode = null;
    currentScale = clamp(scale, MIN_SCALE, MAX_SCALE);
    applyScale();
  }

  /**
   * Set scale mode (fit-width, fit-page)
   */
  function setScaleMode(mode) {
    if (mode === 'fit-width' || mode === 'fit-page') {
      scaleMode = mode;
      applyScale();
    }
  }

  /**
   * Zoom in to next level
   */
  function zoomIn() {
    scaleMode = null;
    for (const level of ZOOM_LEVELS) {
      if (level > currentScale + 0.01) {
        currentScale = level;
        applyScale();
        return;
      }
    }
    currentScale = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    applyScale();
  }

  /**
   * Zoom out to previous level
   */
  function zoomOut() {
    scaleMode = null;
    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      if (ZOOM_LEVELS[i] < currentScale - 0.01) {
        currentScale = ZOOM_LEVELS[i];
        applyScale();
        return;
      }
    }
    currentScale = ZOOM_LEVELS[0];
    applyScale();
  }

  /**
   * Get anchor for cursor-centered zoom.
   * Records the unzoomed content position under the cursor.
   */
  function getZoomAnchor(viewportX, viewportY, scale) {
    // With CSS zoom, scroll values are in zoomed space
    // Convert to unzoomed content coordinates
    const contentX = (viewerContainer.scrollLeft + viewportX) / scale;
    const contentY = (viewerContainer.scrollTop + viewportY) / scale;
    
    return { contentX, contentY, viewportX, viewportY };
  }

  /**
   * Apply anchor after zoom to keep cursor position stable
   */
  function applyZoomAnchor(anchor, newScale) {
    if (!viewerContainer || !anchor) return false;

    // Calculate new scroll to keep the same content point under cursor
    const newScrollLeft = anchor.contentX * newScale - anchor.viewportX;
    const newScrollTop = anchor.contentY * newScale - anchor.viewportY;

    viewerContainer.scrollLeft = Math.max(0, newScrollLeft);
    viewerContainer.scrollTop = Math.max(0, newScrollTop);
    return true;
  }

  /**
   * Navigate to a specific slide
   */
  function goToSlide(slideNum) {
    const slides = getSlides();
    if (slideNum < 1 || slideNum > slides.length) return;

    currentSlide = slideNum;
    const targetSlide = slides[slideNum - 1];
    if (targetSlide) {
      targetSlide.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateToolbar();
    sendToParent('SLIDE_CHANGED', { slide: currentSlide, total: totalSlides });
  }

  /**
   * Go to next slide
   */
  function nextSlide() {
    if (currentSlide < totalSlides) {
      goToSlide(currentSlide + 1);
    }
  }

  /**
   * Go to previous slide
   */
  function prevSlide() {
    if (currentSlide > 1) {
      goToSlide(currentSlide - 1);
    }
  }

  /**
   * Toggle zoom menu
   */
  function toggleZoomMenu() {
    zoomMenuOpen = !zoomMenuOpen;
    if (wbZoomMenu) {
      wbZoomMenu.classList.toggle('hidden', !zoomMenuOpen);
      if (wbZoomLabel) wbZoomLabel.setAttribute('aria-expanded', String(zoomMenuOpen));
    }
  }

  /**
   * Close zoom menu
   */
  function closeZoomMenu() {
    zoomMenuOpen = false;
    if (wbZoomMenu) {
      wbZoomMenu.classList.add('hidden');
      if (wbZoomLabel) wbZoomLabel.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Set selection mode (text or hand)
   */
  function setSelectionMode(mode) {
    selectionMode = mode;
    
    if (mode === 'hand') {
      viewerContainer.classList.add('grabMode');
    } else {
      viewerContainer.classList.remove('grabMode');
    }
    
    updateToolbar();
    sendToParent('SELECTION_MODE_CHANGED', { mode });
  }

  /**
   * Track current slide based on scroll position
   */
  function trackCurrentSlide() {
    const slides = getSlides();
    if (!slides.length) return;

    const containerRect = viewerContainer.getBoundingClientRect();
    const containerTop = containerRect.top + 50; // Account for some offset
    
    let bestSlide = 1;
    let bestDistance = Infinity;

    slides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const distance = Math.abs(slideRect.top - containerTop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlide = index + 1;
      }
    });

    if (bestSlide !== currentSlide) {
      currentSlide = bestSlide;
      updateToolbar();
      sendToParent('SLIDE_CHANGED', { slide: currentSlide, total: totalSlides });
    }
  }

  /**
   * Load a PPTX file
   */
  function loadPptx(url) {
    if (!url) {
      showError('No PPTX URL provided');
      sendToParent('ERROR', { message: 'No PPTX URL provided' });
      return;
    }

    currentUrl = url;
    showLoading();
    hideError();
    sendToParent('LOADING_STARTED', { url });

    // Clear previous content
    pptxResult.innerHTML = '';
    currentScale = 1;
    scaleMode = 'fit-width';
    currentSlide = 1;
    totalSlides = 0;

    // Use PPTXjs to render the presentation
    try {
      $(pptxResult).pptxToHtml({
        pptxFileUrl: url,
        slidesScale: '', // We handle scaling ourselves
        slideMode: false,
        keyBoardShortCut: false,
        mediaProcess: true,
        processRecordedTimming: false
      });

      // PPTXjs doesn't have a proper callback, so we poll for completion
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      const checkInterval = setInterval(() => {
        attempts++;
        const slides = getSlides();
        
        if (slides.length > 0) {
          clearInterval(checkInterval);
          totalSlides = slides.length;
          currentSlide = 1;
          hideLoading();
          
          // Apply initial scale (fit to width)
          scaleMode = 'fit-width';
          applyScale();
          
          updateToolbar();
          
          sendToParent('DOC_LOADED', {
            slideCount: totalSlides,
            scale: currentScale,
            scaleMode: scaleMode
          });
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          hideLoading();
          
          // Check if there's an error
          const errorDiv = pptxResult.querySelector('.error');
          if (errorDiv) {
            showError(errorDiv.textContent || 'Failed to load presentation');
            sendToParent('ERROR', { message: 'Failed to load presentation' });
          } else if (pptxResult.children.length === 0) {
            showError('Failed to parse presentation');
            sendToParent('ERROR', { message: 'Failed to parse presentation' });
          }
        }
      }, 100);

    } catch (error) {
      hideLoading();
      const message = error.message || 'Failed to load presentation';
      showError(message);
      sendToParent('ERROR', { message });
    }
  }

  /**
   * Set the theme (dark/light)
   */
  function setTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.add('light');
    }
  }

  /**
   * Get current viewer state
   */
  function getState() {
    return {
      slide: currentSlide,
      slideCount: totalSlides,
      scale: currentScale,
      scaleMode: scaleMode,
      selectionMode: selectionMode,
      isLoading: isLoading
    };
  }

  /**
   * Handle commands from parent
   */
  function handleCommand(command) {
    if (!command || !command.type) return;

    switch (command.type) {
      case 'LOAD_PPTX':
        loadPptx(command.url);
        break;

      case 'GO_TO_SLIDE':
        goToSlide(command.slide);
        break;

      case 'NEXT_SLIDE':
        nextSlide();
        break;

      case 'PREV_SLIDE':
        prevSlide();
        break;

      case 'SET_SCALE':
        setScale(command.scale);
        break;

      case 'SET_SCALE_MODE':
        setScaleMode(command.mode);
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

      default:
        console.warn('[PPTXBridge] Unknown command:', command.type);
    }
  }

  /**
   * Install input handlers for gestures
   */
  function installInputHandlers() {
    if (!viewerContainer) return;

    // Ensure focus on click
    viewerContainer.addEventListener('mousedown', () => {
      window.focus();
    });

    // Trackpad pinch zoom (ctrl/meta + wheel)
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      event.preventDefault();

      const rect = viewerContainer.getBoundingClientRect();
      const viewportX = event.clientX - rect.left;
      const viewportY = event.clientY - rect.top;

      // Calculate velocity for acceleration
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
        pinchStartScale = currentScale;
        pinchAccumulatedDelta = 0;
        scaleMode = null; // Exit fit modes on manual zoom

        // Get anchor using current scale to calculate content position
        pinchAnchor = getZoomAnchor(viewportX, viewportY, currentScale);
      }
      // Don't update anchor during pinch - keep it stable

      const accelMultiplier = getAccelerationMultiplier(velocity);
      pinchAccumulatedDelta += event.deltaY * accelMultiplier;
      const desiredScale = clamp(
        pinchStartScale * Math.exp(-pinchAccumulatedDelta / PINCH_WHEEL_EXP_DIVISOR),
        MIN_SCALE,
        MAX_SCALE
      );

      if (pinchRafId !== null) {
        cancelAnimationFrame(pinchRafId);
      }
      pinchRafId = requestAnimationFrame(() => {
        pinchRafId = null;
        if (!pinchAnchor) return;

        currentScale = desiredScale;
        applyScale();
        applyZoomAnchor(pinchAnchor, desiredScale);
      });

      if (pinchEndTimer) clearTimeout(pinchEndTimer);
      pinchEndTimer = setTimeout(() => {
        pinchActive = false;
        pinchStartScale = currentScale;
        pinchAccumulatedDelta = 0;
        pinchAnchor = null;
        pinchEndTimer = null;
        velocity = 0;
      }, 160);
    };

    viewerContainer.addEventListener('wheel', onWheel, { passive: false });

    // Hand-tool drag panning
    const onPointerDown = (event) => {
      if (selectionMode !== 'hand') return;
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

    // Handle resize to reapply fit modes
    window.addEventListener('resize', () => {
      if (scaleMode === 'fit-width' || scaleMode === 'fit-page') {
        applyScale();
      }
    });
  }

  /**
   * Install toolbar event listeners
   */
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
          if (typeof preset.value === 'string') {
            setScaleMode(preset.value);
          } else {
            setScale(preset.value);
          }
        });
        wbZoomMenu.appendChild(btn);
      }
    }

    if (wbPrev) wbPrev.addEventListener('click', prevSlide);
    if (wbNext) wbNext.addEventListener('click', nextSlide);
    if (wbZoomOut) wbZoomOut.addEventListener('click', zoomOut);
    if (wbZoomIn) wbZoomIn.addEventListener('click', zoomIn);
    if (wbZoomLabel) wbZoomLabel.addEventListener('click', toggleZoomMenu);

    if (wbSlideForm && wbSlideInput) {
      const submitSlide = () => {
        const n = parseInt(String(wbSlideInput.value || '').trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= totalSlides) {
          goToSlide(n);
        } else {
          wbSlideInput.value = currentSlide > 0 ? String(currentSlide) : '';
        }
      };
      wbSlideForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitSlide();
      });
      wbSlideInput.addEventListener('blur', submitSlide);
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
   * Initialize the viewer
   */
  function initViewer() {
    // Check if jQuery and PPTXjs are loaded
    if (typeof $ === 'undefined' || typeof $.fn.pptxToHtml === 'undefined') {
      showError('PPTXjs library failed to load');
      sendToParent('ERROR', { message: 'PPTXjs library failed to load' });
      return;
    }

    // Install handlers
    installToolbar();
    installInputHandlers();

    // Track scroll for current slide detection
    viewerContainer.addEventListener('scroll', () => {
      trackCurrentSlide();
    }, { passive: true });

    function isEditableTarget(t) {
      if (!t) return false;
      const tag = String(t.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      try {
        if (t.isContentEditable) return true;
      } catch {}
      return false;
    }

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Cmd+K / Ctrl+K: open global search
      // Cmd+I / Ctrl+I: open AI panel
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = String(e.key || '').toLowerCase();
        if ((key === 'k' || key === 'i') && !isEditableTarget(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          sendToParent('SHORTCUT', { action: key === 'k' ? 'search' : 'ai' });
          return;
        }
      }

      if (isEditableTarget(e.target)) return; // Don't interfere with inputs

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          prevSlide();
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          nextSlide();
          e.preventDefault();
          break;
        case 'Home':
          goToSlide(1);
          e.preventDefault();
          break;
        case 'End':
          goToSlide(totalSlides);
          e.preventDefault();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            zoomIn();
            e.preventDefault();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            zoomOut();
            e.preventDefault();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            setScaleMode('fit-width');
            e.preventDefault();
          }
          break;
      }
    });

    // Notify parent that viewer is ready
    sendToParent('READY');
  }

  // Listen for postMessage from parent
  window.addEventListener('message', (event) => {
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
  window.pptxViewerBridge = {
    handleCommand,
    getState,
    loadPptx
  };
})();
