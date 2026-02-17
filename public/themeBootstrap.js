// Immediate theme bootstrap to prevent white flash.
// Runs synchronously before the React app renders.
(function () {
  try {
    // New: versioned cache written by applyThemeTokens().
    var cacheRaw = localStorage.getItem('wb-theme-cache-v1');
    if (cacheRaw) {
      var cache = JSON.parse(cacheRaw);
      if (cache && cache.v === 1 && (cache.theme === 'light' || cache.theme === 'dark')) {
        var root = document.documentElement;
        if (cache.theme === 'dark') {
          root.classList.add('dark');
          root.style.backgroundColor = '#000000';
          root.style.colorScheme = 'dark';
        } else {
          root.style.backgroundColor = '#ffffff';
          root.style.colorScheme = 'light';
        }

        var tokens = cache.tokens || {};
        for (var k in tokens) {
          if (
            Object.prototype.hasOwnProperty.call(tokens, k) &&
            typeof k === 'string' &&
            k.indexOf('--') === 0
          ) {
            root.style.setProperty(k, String(tokens[k]));
          }
        }

        var ds = cache.dataset || null;
        if (ds) {
          if (ds.backgroundMode) root.dataset.backgroundMode = ds.backgroundMode;
          if (ds.backgroundType) root.dataset.backgroundType = ds.backgroundType;
          if (ds.patternId) root.dataset.patternId = ds.patternId;
        }
        return;
      }
    }

    // Fallback: just dark/light (legacy app-theme or system).
    var stored = localStorage.getItem('app-theme');
    var sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (!stored && sysDark);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#000000';
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.backgroundColor = '#ffffff';
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
