class LinkPreloadCache {
  constructor(maxSize = 50 * 1024 * 1024, ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.currentSize = 0;
    this.cleanupTimer = null;
    this.startCleanupTimer();
  }

  set(url, content, size) {
    try {
      // Remove existing entry if it exists
      if (this.cache.has(url)) {
        this.currentSize -= this.cache.get(url).size;
      }

      // Check if we need to make space
      while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
        this.evictLRU();
      }

      // Don't cache if single item is too large
      if (size > this.maxSize * 0.5) {
        console.warn('[LinkLens Cache] Item too large to cache:', url, size);
        return false;
      }

      const entry = {
        content,
        size,
        timestamp: Date.now(),
        lastAccessed: Date.now()
      };

      this.cache.set(url, entry);
      this.currentSize += size;
      
      console.log(`[LinkLens Cache] Cached ${url} (${Math.round(size/1024)}KB). Total: ${Math.round(this.currentSize/1024)}KB`);
      return true;
    } catch (error) {
      console.error('[LinkLens Cache] Error caching item:', error);
      return false;
    }
  }

  get(url) {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(url);
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    return entry.content;
  }

  delete(url) {
    const entry = this.cache.get(url);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(url);
      console.log(`[LinkLens Cache] Removed ${url}. Total: ${Math.round(this.currentSize/1024)}KB`);
    }
  }

  evictLRU() {
    let oldestUrl = null;
    let oldestTime = Infinity;

    for (const [url, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.delete(oldestUrl);
    }
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
    console.log('[LinkLens Cache] Cache cleared');
  }

  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  cleanup() {
    const now = Date.now();
    const expiredUrls = [];

    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredUrls.push(url);
      }
    }

    expiredUrls.forEach(url => this.delete(url));
    
    if (expiredUrls.length > 0) {
      console.log(`[LinkLens Cache] Cleaned up ${expiredUrls.length} expired items`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      totalSize: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.currentSize / this.maxSize) * 100)
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

class LinkPreloader {
  constructor(linkLens) {
    this.linkLens = linkLens;
    this.cache = null;
    this.discoveredLinks = [];
    this.preloadQueue = [];
    this.activePreloads = new Set();
    this.maxConcurrentPreloads = 2;
    this.isPreloading = false;
    this.preloadTimer = null;
  }

  initialize(settings) {
    if (!settings.enablePreloading) {
      this.destroy();
      return;
    }

    // Initialize cache with user settings
    const maxSize = settings.cacheSizeLimit * 1024 * 1024; // Convert MB to bytes
    this.cache = new LinkPreloadCache(maxSize);

    // Start link discovery and preloading
    this.discoverLinks(settings);
    this.startPreloading(settings);
  }

  discoverLinks(settings) {
    try {
      const links = document.querySelectorAll('a[href]');
      const validLinks = [];

      for (const link of links) {
        if (!this.linkLens.isValidLink(link)) continue;
        if (link.href === window.location.href) continue;

        const rect = link.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

        // Calculate priority score
        let priority = 0;
        if (isVisible) priority += 10;
        if (isInViewport) priority += 5;
        if (link.href.startsWith(window.location.origin)) priority += 3;
        if (rect.top < window.innerHeight * 0.5) priority += 2; // Above fold

        validLinks.push({
          url: link.href,
          element: link,
          priority,
          isVisible,
          isInViewport
        });
      }

      // Sort by priority and limit to max links
      this.discoveredLinks = validLinks
        .sort((a, b) => b.priority - a.priority)
        .slice(0, settings.maxLinksToPreload);

      console.log(`[LinkLens Preloader] Discovered ${this.discoveredLinks.length} links for preloading`);
      
      // Add cache indicators if enabled
      if (settings.showCacheIndicators) {
        this.addCacheIndicators();
      }

    } catch (error) {
      console.error('[LinkLens Preloader] Error discovering links:', error);
    }
  }

  startPreloading(settings) {
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
    }

    // Start preloading after delay
    this.preloadTimer = setTimeout(() => {
      this.processPreloadQueue(settings);
    }, settings.preloadDelay * 1000);
  }

  async processPreloadQueue(settings) {
    if (this.isPreloading || !this.cache) return;

    this.isPreloading = true;
    this.preloadQueue = [...this.discoveredLinks];

    console.log(`[LinkLens Preloader] Starting preload of ${this.preloadQueue.length} links`);

    while (this.preloadQueue.length > 0 && this.activePreloads.size < this.maxConcurrentPreloads) {
      const linkInfo = this.preloadQueue.shift();
      if (!linkInfo) continue;

      // Skip if already cached
      if (this.cache.get(linkInfo.url)) {
        continue;
      }

      this.preloadLink(linkInfo);
    }
  }

  async preloadLink(linkInfo) {
    if (this.activePreloads.has(linkInfo.url)) return;
    
    this.activePreloads.add(linkInfo.url);

    try {
      console.log(`[LinkLens Preloader] Preloading ${linkInfo.url}`);

      const response = await fetch(linkInfo.url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'force-cache',
        credentials: 'omit'
      });

      // For no-cors requests, we can't access the content directly
      // So we'll cache a placeholder that indicates it's been preloaded
      const placeholder = {
        url: linkInfo.url,
        preloaded: true,
        timestamp: Date.now()
      };

      const size = 1024; // Placeholder size
      this.cache.set(linkInfo.url, placeholder, size);

      // Update cache indicator
      if (this.linkLens.settings.showCacheIndicators) {
        this.updateCacheIndicator(linkInfo.element, true);
      }

    } catch (error) {
      console.warn(`[LinkLens Preloader] Failed to preload ${linkInfo.url}:`, error);
    } finally {
      this.activePreloads.delete(linkInfo.url);
      
      // Continue processing queue
      if (this.preloadQueue.length > 0 && this.cache) {
        setTimeout(() => {
          this.processPreloadQueue(this.linkLens.settings);
        }, 100);
      }
    }
  }

  addCacheIndicators() {
    this.discoveredLinks.forEach(linkInfo => {
      this.updateCacheIndicator(linkInfo.element, false);
    });
  }

  updateCacheIndicator(element, isCached) {
    try {
      const indicator = element.querySelector('.linklens-cache-indicator');
      
      if (isCached) {
        if (!indicator) {
          const dot = document.createElement('span');
          dot.className = 'linklens-cache-indicator';
          dot.style.cssText = `
            display: inline-block;
            width: 6px;
            height: 6px;
            background: #4ade80;
            border-radius: 50%;
            margin-left: 4px;
            opacity: 0.7;
            vertical-align: middle;
          `;
          element.appendChild(dot);
        }
      } else if (indicator) {
        indicator.remove();
      }
    } catch (error) {
      // Silently fail if we can't add indicators
    }
  }

  getCachedContent(url) {
    return this.cache ? this.cache.get(url) : null;
  }

  destroy() {
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
    }
    
    if (this.cache) {
      this.cache.destroy();
      this.cache = null;
    }

    // Remove cache indicators
    document.querySelectorAll('.linklens-cache-indicator').forEach(indicator => {
      indicator.remove();
    });

    this.discoveredLinks = [];
    this.preloadQueue = [];
    this.activePreloads.clear();
    this.isPreloading = false;
  }
}

class LinkLens {
  constructor() {
    this.overlay = null;
    this.currentTabId = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.isCloudflareChallenge = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.debounceTimer = null;
    this.isDestroyed = false;
    this.autoCloseTimer = null;

    this.settings = {
      modifierKey: 'ctrl',
      macSupport: true,
      themeColor: '#667eea',
      applyThemeToHeader: false,
      darkMode: false,
      windowSize: 80,
      autoCloseTimer: 0,
      animations: true,
      soundEffects: false,
      backgroundOpacity: 60,
      enablePreloading: false,
      maxLinksToPreload: 15,
      cacheSizeLimit: 50,
      preloadDelay: 3,
      showCacheIndicators: false
    };

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.detectCloudflareChallenge = this.detectCloudflareChallenge.bind(this);
    this.handleSettingsUpdate = this.handleSettingsUpdate.bind(this);

    // Initialize preloader
    this.preloader = new LinkPreloader(this);

    this.init();
  }

  init() {
    try {
      if (this.isDestroyed) {
        console.warn('[LinkLens] Cannot initialize destroyed instance');
        return;
      }

      this.loadSettings();
      this.addEventListeners();
      this.getCurrentTabId();
      this.detectCloudflareChallenge();

      console.log('[LinkLens] Extension initialized successfully');
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('linklensSettings');
      if (result.linklensSettings) {
        this.settings = { ...this.settings, ...result.linklensSettings };
      }
    } catch (error) {
      console.warn('[LinkLens] Failed to load settings from sync, trying local:', error);
      try {
        const localResult = await chrome.storage.local.get('linklensSettings');
        if (localResult.linklensSettings) {
          this.settings = { ...this.settings, ...localResult.linklensSettings };
        }
      } catch (localError) {
        console.warn('[LinkLens] Failed to load settings from local storage:', localError);
      }
    }

    // Initialize preloader with current settings
    this.preloader.initialize(this.settings);
  }

  addEventListeners() {
    try {
      this.removeEventListeners();

      document.addEventListener('mousedown', this.handleMouseDown, { 
        capture: true, 
        passive: false 
      });
      document.addEventListener('keydown', this.handleKeyDown, { 
        passive: false 
      });

      window.addEventListener('beforeunload', () => {
        // Clean up cache before page unload
        if (this.preloader) {
          this.preloader.destroy();
        }
        this.destroy();
      });

      chrome.runtime.onMessage.addListener(this.handleSettingsUpdate);
    } catch (error) {
      this.handleError('Failed to add event listeners', error);
    }
  }

  handleSettingsUpdate(message, sender, sendResponse) {
    if (message.action === 'settingsUpdated') {
      this.settings = { ...this.settings, ...message.settings };
      console.log('[LinkLens] Settings updated:', this.settings);
      
      // Update theme immediately if there's an active overlay
      if (this.overlay) {
        const backdrop = this.overlay.parentElement;
        this.applyThemeSettings(this.overlay, backdrop);
      }

      // Reinitialize preloader with new settings
      this.preloader.initialize(this.settings);
      
      sendResponse({ success: true });
    }
  }

  checkModifierKey(event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    switch (this.settings.modifierKey) {
      case 'ctrl':
        return isMac && this.settings.macSupport ? event.metaKey : event.ctrlKey;
      case 'alt':
        return event.altKey;
      case 'shift':
        return event.shiftKey;
      default:
        return event.ctrlKey || (isMac && event.metaKey);
    }
  }

  removeEventListeners() {
    try {
      document.removeEventListener('mousedown', this.handleMouseDown, true);
      document.removeEventListener('keydown', this.handleKeyDown);
    } catch (error) {
      console.warn('[LinkLens] Error removing event listeners:', error);
    }
  }

  async getCurrentTabId() {
    try {
      const response = await this.sendMessageWithTimeout({ 
        action: 'getCurrentTabId' 
      }, 2000);
      
      this.currentTabId = response?.tabId || Date.now();
    } catch (error) {
      this.currentTabId = Date.now();
      console.warn('[LinkLens] Failed to get tab ID, using fallback:', error.message);
    }
  }

  async sendMessageWithTimeout(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  detectCloudflareChallenge() {
    try {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.performCloudflareDetection();
      }, 100);
    } catch (error) {
      this.handleError('Cloudflare detection failed', error);
    }
  }

  performCloudflareDetection() {
    try {
      const activeChallengeSelectors = [
        '.cf-challenge-container',
        '.cf-im-under-attack',
        '#cf-challenge-stage',
        '.cf-browser-verification',
        '.cf-checking-browser',
        '#challenge-stage',
        '#challenge-form',
        '.cf-challenge-running',
        '.cf-challenge-form',
        '.cf-turnstile',
        '.cf-challenge-body'
      ];

      const hasActiveChallengeElements = activeChallengeSelectors.some(selector => {
        try {
          const element = document.querySelector(selector);
          return element && element.offsetParent !== null;
        } catch (e) {
          return false;
        }
      });

      const bodyText = document.body?.textContent?.toLowerCase() || '';
      const activeChallengeTextIndicators = [
        'checking your browser before accessing',
        'please wait while we check your browser',
        'verify you are human',
        'browser verification in progress',
        'completing the challenge below',
        'please stand by, while we are checking your browser',
        'this process is automatic',
        'you will be redirected once the validation is complete'
      ];

      const hasActiveChallengeText = activeChallengeTextIndicators.some(text => 
        bodyText.includes(text)
      );

      const isChallengeUrl = window.location.pathname.includes('cdn-cgi/challenge-platform') ||
                            window.location.search.includes('__cf_chl_') ||
                            window.location.search.includes('cf_challenge') ||
                            window.location.pathname.includes('__cf_challenge__');

      const pageTitle = document.title?.toLowerCase() || '';
      const challengeTitleIndicators = [
        'just a moment',
        'checking your browser',
        'please wait',
        'security check'
      ];

      const hasChallengeTitle = challengeTitleIndicators.some(title => 
        pageTitle.includes(title) && pageTitle.length < 100 // Avoid false positives on long titles
      );

      const hasChallengeMetaTags = this.safeQuerySelector('meta[name="cf-2fa-verify"]') ||
                                   this.safeQuerySelector('meta[http-equiv="refresh"][content*="url=/cdn-cgi/"]') ||
                                   this.safeQuerySelector('meta[name="robots"][content="noindex, nofollow"]') && hasChallengeTitle;

      const wasCloudflareChallenge = this.isCloudflareChallenge;
      this.isCloudflareChallenge = hasActiveChallengeElements || 
                                  hasActiveChallengeText || 
                                  isChallengeUrl || 
                                  (hasChallengeTitle && (hasActiveChallengeElements || hasChallengeMetaTags));

      if (this.isCloudflareChallenge && !wasCloudflareChallenge) {
        console.log('[LinkLens] Active Cloudflare challenge detected - extension disabled for this page');
        console.log('[LinkLens] Challenge indicators:', {
          elements: hasActiveChallengeElements,
          text: hasActiveChallengeText,
          url: isChallengeUrl,
          title: hasChallengeTitle
        });
        this.closeLinkLens(); // Close any existing glimpse
      } else if (!this.isCloudflareChallenge && wasCloudflareChallenge) {
        console.log('[LinkLens] Cloudflare challenge resolved - extension re-enabled');
      }

      if (!this.isDestroyed) {
        setTimeout(() => this.detectCloudflareChallenge(), 5000);
      }
    } catch (error) {
      this.handleError('Cloudflare detection check failed', error);
    }
  }

  safeQuerySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  handleMouseDown(event) {
    try {
      if (this.isDestroyed || this.isCloudflareChallenge) {
        return;
      }

      if (event.target?.closest?.('.linklens-overlay')) {
        return;
      }

      const isModifierPressed = this.checkModifierKey(event);
      if (!isModifierPressed || event.button !== 0) {
        return;
      }

      const link = event.target?.closest?.('a');
      if (!this.isValidLink(link)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      this.createLinkLens(link.href);
    } catch (error) {
      this.handleError('Mouse down handler failed', error);
    }
  }

  isValidLink(link) {
    try {
      if (!link || !link.href) {
        return false;
      }

      if (!link.href.startsWith('http://') && !link.href.startsWith('https://')) {
        return false;
      }

      if (link.href === window.location.href) {
        return false;
      }

      try {
        new URL(link.href);
        return true;
      } catch (e) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  handleKeyDown(event) {
    try {
      if (event.key === 'Escape' && this.overlay) {
        event.preventDefault();
        this.closeLinkLens();
      }
    } catch (error) {
      this.handleError('Key down handler failed', error);
    }
  }

  async createLinkLens(url) {
    try {
      if (this.overlay) {
        this.closeLinkLens();
      }

      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Check if URL is cached for faster loading
      const cachedContent = this.preloader.getCachedContent(url);
      if (cachedContent) {
        console.log('[LinkLens] Using cached content for:', url);
      }

      await this.createOverlayElements(url);
      
      console.log('[LinkLens] Created glimpse for:', url);
    } catch (error) {
      this.handleError('Failed to create glimpse', error, url);
    }
  }

  createOverlayElements(url) {
    return new Promise((resolve, reject) => {
      try {
        const backdrop = this.createElement('div', {
          className: 'linklens-backdrop',
          onclick: (e) => {
            if (e.target === backdrop) {
              this.closeLinkLens();
            }
          }
        });

    const overlay = this.createElement('div', {
      className: 'linklens-overlay'
    });

    overlay.style.width = `${this.settings.windowSize}vw`;
    overlay.style.height = `${Math.min(this.settings.windowSize + 15, 95)}vh`;
    overlay.style.maxWidth = '1200px';

    if (this.settings.darkMode) {
      overlay.classList.add('dark-mode');
    }

    this.applyThemeSettings(overlay, backdrop);

    if (!this.settings.animations) {
      backdrop.classList.add('no-animations');
    }

        const header = this.createHeader(url);
        
        const iframeContainer = this.createElement('div', {
          className: 'linklens-content'
        });

        const iframe = this.createIframe(url, iframeContainer);
        iframeContainer.appendChild(iframe);

        overlay.appendChild(header);
        overlay.appendChild(iframeContainer);
        backdrop.appendChild(overlay);

    this.addToDOM(backdrop);
    
    this.overlay = backdrop;

    if (this.settings.soundEffects) {
      this.playSound('open');
    }

    if (this.settings.autoCloseTimer > 0) {
      this.startAutoCloseTimer();
    }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  createElement(tag, properties = {}) {
    try {
      const element = document.createElement(tag);
      
      Object.entries(properties).forEach(([key, value]) => {
        try {
          if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.slice(2), value);
          } else {
            element[key] = value;
          }
        } catch (e) {
          console.warn(`[LinkLens] Failed to set property ${key}:`, e);
        }
      });

      return element;
    } catch (error) {
      throw new Error(`Failed to create element ${tag}: ${error.message}`);
    }
  }

  createHeader(url) {
    try {
      const header = this.createElement('div', {
        className: 'linklens-header'
      });

      const titleContainer = this.createElement('div', {
        className: 'linklens-title'
      });

      const favicon = this.createFavicon(url);
      
      const title = this.createElement('span', {
        className: 'linklens-title-text',
        textContent: 'Loading...'
      });

      titleContainer.appendChild(favicon);
      titleContainer.appendChild(title);

      const controls = this.createControls(url);

      header.appendChild(titleContainer);
      header.appendChild(controls);

      return header;
    } catch (error) {
      throw new Error(`Failed to create header: ${error.message}`);
    }
  }

  createFavicon(url) {
    try {
      const favicon = this.createElement('img', {
        className: 'linklens-favicon',
        src: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`
      });

      favicon.onerror = () => {
        try {
          favicon.style.display = 'none';
        } catch (e) {
        }
      };

      return favicon;
    } catch (error) {
      return this.createElement('div', {
        className: 'linklens-favicon',
        style: 'display: none;'
      });
    }
  }

  createControls(url) {
    try {
      const controls = this.createElement('div', {
        className: 'linklens-controls'
      });

      const expandBtn = this.createElement('button', {
        className: 'linklens-btn linklens-reopen',
        innerHTML: '⧉',
        title: 'Open in new tab',
        onclick: () => this.expandToNewTab(url)
      });

      const closeBtn = this.createElement('button', {
        className: 'linklens-btn linklens-close',
        innerHTML: '⨯',
        title: 'Close',
        onclick: () => this.closeLinkLens()
      });

      controls.appendChild(expandBtn);
      controls.appendChild(closeBtn);

      return controls;
    } catch (error) {
      throw new Error(`Failed to create controls: ${error.message}`);
    }
  }

  createIframe(url, container) {
    try {
      const iframe = this.createElement('iframe', {
        className: 'linklens-iframe',
        src: url,
        sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation',
        referrerPolicy: 'no-referrer'
      });

      iframe.onload = () => {
        try {
          this.handleIframeLoad(iframe);
        } catch (error) {
          console.warn('[LinkLens] Error handling iframe load:', error);
        }
      };

      iframe.onerror = () => {
        try {
          this.showError(container, url, 'Failed to load page');
        } catch (error) {
          console.error('[LinkLens] Error showing iframe error:', error);
        }
      };

      setTimeout(() => {
        try {
          if (!iframe.contentDocument && !iframe.contentWindow) {
            this.showError(container, url, 'Page load timeout');
          }
        } catch (error) {
        }
      }, 10000);

      return iframe;
    } catch (error) {
      throw new Error(`Failed to create iframe: ${error.message}`);
    }
  }

  handleIframeLoad(iframe) {
    try {
      const titleElement = this.overlay?.querySelector?.('.linklens-title-text');
      if (!titleElement) return;

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const pageTitle = iframeDoc?.title;
        
        if (pageTitle && pageTitle.trim()) {
          titleElement.textContent = pageTitle.trim();
        } else {
          titleElement.textContent = new URL(iframe.src).hostname;
        }
      } catch (crossOriginError) {
        titleElement.textContent = new URL(iframe.src).hostname;
      }
    } catch (error) {
      console.warn('[LinkLens] Error updating title:', error);
    }
  }

  showError(container, url, message = 'Preview not available') {
    try {
      container.innerHTML = `
        <div class="linklens-error">
          <h3>${message}</h3>
          <p>This site may have security policies that prevent it from being previewed.</p>
          <button class="linklens-btn linklens-open-direct" data-url="${encodeURIComponent(url)}">
            Open in New Tab
          </button>
        </div>
      `;

      const openButton = container.querySelector('.linklens-open-direct');
      if (openButton) {
        openButton.onclick = (e) => {
          try {
            const targetUrl = decodeURIComponent(e.target.dataset.url);
            this.expandToNewTab(targetUrl);
            this.closeLinkLens();
          } catch (error) {
            this.handleError('Failed to open direct link', error);
          }
        };
      }
    } catch (error) {
      this.handleError('Failed to show error message', error);
    }
  }

  addToDOM(element) {
    try {
      if (!document.body) {
        throw new Error('Document body not available');
      }

      document.body.appendChild(element);
      document.body.classList.add('linklens-active');
    } catch (error) {
      throw new Error(`Failed to add to DOM: ${error.message}`);
    }
  }

  async expandToNewTab(url) {
    try {
      await this.sendMessageWithTimeout({
        action: 'createTab',
        url: url,
      }, 3000);
      
      this.closeLinkLens();
    } catch (error) {
      this.handleError('Failed to create tab', error);
      
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        this.closeLinkLens();
      } catch (fallbackError) {
        this.handleError('Fallback tab creation also failed', fallbackError);
      }
    }
  }

  startAutoCloseTimer() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }

    this.autoCloseTimer = setTimeout(() => {
      this.closeLinkLens();
    }, this.settings.autoCloseTimer * 1000);

    if (this.overlay) {
      this.overlay.addEventListener('mouseenter', () => {
        if (this.autoCloseTimer) {
          clearTimeout(this.autoCloseTimer);
        }
      });

      this.overlay.addEventListener('mouseleave', () => {
        this.startAutoCloseTimer();
      });
    }
  }

  applyThemeSettings(overlay, backdrop) {
    try {
      if (backdrop && backdrop.classList.contains('linklens-backdrop')) {
        const opacity = this.settings.backgroundOpacity / 100;
        backdrop.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
      }

      const themeStyleId = 'linklens-theme-style';
      let existingStyle = document.getElementById(themeStyleId);
      
      if (existingStyle) {
        existingStyle.remove();
      }

      let themeStyles = `
        .linklens-overlay {
          --theme-color: ${this.settings.themeColor};
        }
        .linklens-btn:hover {
          border-color: ${this.settings.themeColor} !important;
        }
        .linklens-reopen:hover {
          background: ${this.settings.themeColor} !important;
          color: white !important;
        }
        .linklens-close:hover {
          background: ${this.settings.themeColor} !important;
          color: white !important;
        }
      `;

      if (this.settings.applyThemeToHeader) {
        themeStyles += `
        .linklens-header {
          background: linear-gradient(135deg, ${this.settings.themeColor} 0%, ${this.settings.themeColor}cc 100%) !important;
          border-bottom-color: ${this.settings.themeColor}44 !important;
        }
        .linklens-title-text {
          color: white !important;
        }
        .linklens-favicon {
          filter: brightness(0) invert(1) !important;
        }
        `;
      }

      const style = document.createElement('style');
      style.id = themeStyleId;
      style.textContent = themeStyles;
      
      document.head.appendChild(style);
      
    } catch (error) {
      console.warn('[LinkLens] Failed to apply theme settings:', error);
    }
  }

  playSound(type) {
    if (!this.settings.soundEffects) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'open') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
      } else if (type === 'close') {
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('[LinkLens] Failed to play sound:', error);
    }
  }

  closeLinkLens() {
    try {
      if (!this.overlay) return;

      if (this.autoCloseTimer) {
        clearTimeout(this.autoCloseTimer);
        this.autoCloseTimer = null;
      }

      if (this.settings.soundEffects) {
        this.playSound('close');
      }

      const themeStyle = document.getElementById('linklens-theme-style');
      if (themeStyle) {
        themeStyle.remove();
      }

      this.overlay.remove();
      this.overlay = null;
      
      if (document.body) {
        document.body.classList.remove('linklens-active');
      }

      console.log('[LinkLens] Closed glimpse overlay');
    } catch (error) {
      this.handleError('Failed to close glimpse', error);
      
      this.overlay = null;
      try {
        document.body?.classList?.remove('linklens-active');
      } catch (e) {
      }
    }
  }

  handleError(message, error, context = null) {
    const errorInfo = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    console.error('[LinkLens Error]', errorInfo);

    if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[LinkLens] Retrying operation (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        if (context && typeof context === 'string') {
          this.createLinkLens(context);
        }
      }, 1000 * this.retryCount);
    }
  }

  shouldRetry(error) {
    const retryableErrors = [
      'network error',
      'timeout',
      'failed to fetch',
      'connection refused'
    ];

    const errorMessage = (error?.message || error || '').toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  destroy() {
    try {
      this.isDestroyed = true;
      
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.removeEventListeners();
      
      this.closeLinkLens();

      // Destroy preloader and clear cache
      if (this.preloader) {
        this.preloader.destroy();
      }
      
      console.log('[LinkLens] Extension destroyed');
    } catch (error) {
      console.error('[LinkLens] Error during destruction:', error);
    }
  }
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        new LinkLens();
      } catch (error) {
        console.error('[LinkLens] Failed to initialize on DOMContentLoaded:', error);
      }
    });
  } else {
    new LinkLens();
  }
} catch (error) {
  console.error('[LinkLens] Critical initialization error:', error);
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage?.addListener?.((message, sender, sendResponse) => {
    try {
      if (message.action === 'ping') {
        sendResponse({ status: 'alive' });
      }
    } catch (error) {
      console.error('[LinkLens] Message handler error:', error);
    }
  });
}