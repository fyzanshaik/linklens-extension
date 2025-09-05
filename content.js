class Glimpse {
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

    // Bind methods to preserve context
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.detectCloudflareChallenge = this.detectCloudflareChallenge.bind(this);

    this.init();
  }

  init() {
    try {
      // Check if already initialized
      if (this.isDestroyed) {
        console.warn('[Glimpse] Cannot initialize destroyed instance');
        return;
      }

      // Add event listeners with error handling
      this.addEventListeners();
      this.getCurrentTabId();
      this.detectCloudflareChallenge();

      console.log('[Glimpse] Extension initialized successfully');
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  addEventListeners() {
    try {
      // Remove existing listeners to prevent duplicates
      this.removeEventListeners();

      document.addEventListener('mousedown', this.handleMouseDown, { 
        capture: true, 
        passive: false 
      });
      document.addEventListener('keydown', this.handleKeyDown, { 
        passive: false 
      });

      // Handle page unload
      window.addEventListener('beforeunload', () => this.destroy());
    } catch (error) {
      this.handleError('Failed to add event listeners', error);
    }
  }

  removeEventListeners() {
    try {
      document.removeEventListener('mousedown', this.handleMouseDown, true);
      document.removeEventListener('keydown', this.handleKeyDown);
    } catch (error) {
      console.warn('[Glimpse] Error removing event listeners:', error);
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
      console.warn('[Glimpse] Failed to get tab ID, using fallback:', error.message);
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
      // Debounce detection to avoid excessive checks
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
      const cloudflareSelectors = [
        '.cf-challenge-container',
        '.cf-wrapper',
        '.cf-im-under-attack',
        '#cf-challenge-stage',
        '[data-ray]',
        '.cf-browser-verification',
        '.cf-checking-browser',
        '#challenge-stage',
        '#challenge-form',
        '.cf-challenge-running'
      ];

      // Check for Cloudflare-specific elements
      const hasCloudflareElements = cloudflareSelectors.some(selector => {
        try {
          return document.querySelector(selector);
        } catch (e) {
          return false;
        }
      });

      // Check for Cloudflare-specific text content
      const bodyText = document.body?.textContent?.toLowerCase() || '';
      const cloudflareTextIndicators = [
        'checking your browser',
        'cloudflare',
        'ddos protection',
        'security check',
        'browser verification',
        'ray id',
        'please wait while we check your browser',
        'verify you are human'
      ];

      const hasCloudflareText = cloudflareTextIndicators.some(text => 
        bodyText.includes(text)
      );

      // Check for Cloudflare-specific meta tags or scripts
      const hasCloudflareScripts = this.safeQuerySelector('script[src*="cloudflare"]') ||
                                   this.safeQuerySelector('meta[name="cf-2fa-verify"]') ||
                                   this.safeQuerySelector('meta[content*="cloudflare"]') ||
                                   this.safeQuerySelector('script[src*="cf-assets"]');

      // Check URL patterns
      const isCloudflareUrl = window.location.hostname.includes('cloudflare') ||
                             window.location.pathname.includes('cdn-cgi') ||
                             window.location.search.includes('__cf_chl_');

      const wasCloudflareChallenge = this.isCloudflareChallenge;
      this.isCloudflareChallenge = hasCloudflareElements || hasCloudflareText || 
                                  hasCloudflareScripts || isCloudflareUrl;

      if (this.isCloudflareChallenge && !wasCloudflareChallenge) {
        console.log('[Glimpse] Cloudflare challenge detected - extension disabled for this page');
        this.closeGlimpse(); // Close any existing glimpse
      } else if (!this.isCloudflareChallenge && wasCloudflareChallenge) {
        console.log('[Glimpse] Cloudflare challenge resolved - extension re-enabled');
      }

      // Re-check periodically for dynamic challenges
      if (!this.isDestroyed) {
        setTimeout(() => this.detectCloudflareChallenge(), 3000);
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
      // Skip if destroyed or Cloudflare challenge detected
      if (this.isDestroyed || this.isCloudflareChallenge) {
        return;
      }

      // Skip if clicking on our overlay
      if (event.target?.closest?.('.glimpse-overlay')) {
        return;
      }

      // Check for modifier key
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed || event.button !== 0) {
        return;
      }

      // Find the closest link
      const link = event.target?.closest?.('a');
      if (!this.isValidLink(link)) {
        return;
      }

      // Prevent default behavior
      event.preventDefault();
      event.stopPropagation();

      // Create glimpse with error handling
      this.createGlimpse(link.href);
    } catch (error) {
      this.handleError('Mouse down handler failed', error);
    }
  }

  isValidLink(link) {
    try {
      if (!link || !link.href) {
        return false;
      }

      // Check for valid HTTP/HTTPS URLs
      if (!link.href.startsWith('http://') && !link.href.startsWith('https://')) {
        return false;
      }

      // Avoid self-references
      if (link.href === window.location.href) {
        return false;
      }

      // Check for valid URL format
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
        this.closeGlimpse();
      }
    } catch (error) {
      this.handleError('Key down handler failed', error);
    }
  }

  async createGlimpse(url) {
    try {
      // Close existing glimpse
      if (this.overlay) {
        this.closeGlimpse();
      }

      // Validate URL again
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }

      // Create overlay elements with error handling
      await this.createOverlayElements(url);
      
      console.log('[Glimpse] Created glimpse for:', url);
    } catch (error) {
      this.handleError('Failed to create glimpse', error, url);
    }
  }

  createOverlayElements(url) {
    return new Promise((resolve, reject) => {
      try {
        // Create backdrop
        const backdrop = this.createElement('div', {
          className: 'glimpse-backdrop',
          onclick: (e) => {
            if (e.target === backdrop) {
              this.closeGlimpse();
            }
          }
        });

        // Create overlay container
        const overlay = this.createElement('div', {
          className: 'glimpse-overlay'
        });

        // Create header
        const header = this.createHeader(url);
        
        // Create content container
        const iframeContainer = this.createElement('div', {
          className: 'glimpse-content'
        });

        // Create iframe with comprehensive error handling
        const iframe = this.createIframe(url, iframeContainer);
        iframeContainer.appendChild(iframe);

        // Assemble the overlay
        overlay.appendChild(header);
        overlay.appendChild(iframeContainer);
        backdrop.appendChild(overlay);

        // Add to DOM with error handling
        this.addToDOM(backdrop);
        
        this.overlay = backdrop;
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
          console.warn(`[Glimpse] Failed to set property ${key}:`, e);
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
        className: 'glimpse-header'
      });

      // Title container
      const titleContainer = this.createElement('div', {
        className: 'glimpse-title'
      });

      // Favicon with error handling
      const favicon = this.createFavicon(url);
      
      // Title text
      const title = this.createElement('span', {
        className: 'glimpse-title-text',
        textContent: 'Loading...'
      });

      titleContainer.appendChild(favicon);
      titleContainer.appendChild(title);

      // Controls
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
        className: 'glimpse-favicon',
        src: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`
      });

      favicon.onerror = () => {
        try {
          favicon.style.display = 'none';
        } catch (e) {
          // Ignore
        }
      };

      return favicon;
    } catch (error) {
      // Return a placeholder div if favicon creation fails
      return this.createElement('div', {
        className: 'glimpse-favicon',
        style: 'display: none;'
      });
    }
  }

  createControls(url) {
    try {
      const controls = this.createElement('div', {
        className: 'glimpse-controls'
      });

      // Expand button
      const expandBtn = this.createElement('button', {
        className: 'glimpse-btn glimpse-reopen',
        innerHTML: '⧉',
        title: 'Open in new tab',
        onclick: () => this.expandToNewTab(url)
      });

      // Close button
      const closeBtn = this.createElement('button', {
        className: 'glimpse-btn glimpse-close',
        innerHTML: '⨯',
        title: 'Close',
        onclick: () => this.closeGlimpse()
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
        className: 'glimpse-iframe',
        src: url,
        sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation',
        referrerPolicy: 'no-referrer'
      });

      // Handle successful load
      iframe.onload = () => {
        try {
          this.handleIframeLoad(iframe);
        } catch (error) {
          console.warn('[Glimpse] Error handling iframe load:', error);
        }
      };

      // Handle errors
      iframe.onerror = () => {
        try {
          this.showError(container, url, 'Failed to load page');
        } catch (error) {
          console.error('[Glimpse] Error showing iframe error:', error);
        }
      };

      // Timeout fallback
      setTimeout(() => {
        try {
          if (!iframe.contentDocument && !iframe.contentWindow) {
            this.showError(container, url, 'Page load timeout');
          }
        } catch (error) {
          // Ignore - likely a cross-origin error which is expected
        }
      }, 10000);

      return iframe;
    } catch (error) {
      throw new Error(`Failed to create iframe: ${error.message}`);
    }
  }

  handleIframeLoad(iframe) {
    try {
      const titleElement = this.overlay?.querySelector?.('.glimpse-title-text');
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
        // Expected for cross-origin iframes
        titleElement.textContent = new URL(iframe.src).hostname;
      }
    } catch (error) {
      console.warn('[Glimpse] Error updating title:', error);
    }
  }

  showError(container, url, message = 'Preview not available') {
    try {
      container.innerHTML = `
        <div class="glimpse-error">
          <h3>${message}</h3>
          <p>This site may have security policies that prevent it from being previewed.</p>
          <button class="glimpse-btn glimpse-open-direct" data-url="${encodeURIComponent(url)}">
            Open in New Tab
          </button>
        </div>
      `;

      const openButton = container.querySelector('.glimpse-open-direct');
      if (openButton) {
        openButton.onclick = (e) => {
          try {
            const targetUrl = decodeURIComponent(e.target.dataset.url);
            this.expandToNewTab(targetUrl);
            this.closeGlimpse();
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
      document.body.classList.add('glimpse-active');
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
      
      this.closeGlimpse();
    } catch (error) {
      this.handleError('Failed to create tab', error);
      
      // Fallback: use window.open
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        this.closeGlimpse();
      } catch (fallbackError) {
        this.handleError('Fallback tab creation also failed', fallbackError);
      }
    }
  }

  closeGlimpse() {
    try {
      if (!this.overlay) return;

      // Remove from DOM
      this.overlay.remove();
      this.overlay = null;
      
      // Remove body class
      if (document.body) {
        document.body.classList.remove('glimpse-active');
      }

      console.log('[Glimpse] Closed glimpse overlay');
    } catch (error) {
      this.handleError('Failed to close glimpse', error);
      
      // Force cleanup
      this.overlay = null;
      try {
        document.body?.classList?.remove('glimpse-active');
      } catch (e) {
        // Ignore
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

    console.error('[Glimpse Error]', errorInfo);

    // Retry logic for certain errors
    if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[Glimpse] Retrying operation (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        if (context && typeof context === 'string') {
          this.createGlimpse(context);
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
      
      // Clear timers
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Remove event listeners
      this.removeEventListeners();
      
      // Close any open glimpse
      this.closeGlimpse();
      
      console.log('[Glimpse] Extension destroyed');
    } catch (error) {
      console.error('[Glimpse] Error during destruction:', error);
    }
  }
}

// Initialize with comprehensive error handling
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        new Glimpse();
      } catch (error) {
        console.error('[Glimpse] Failed to initialize on DOMContentLoaded:', error);
      }
    });
  } else {
    new Glimpse();
  }
} catch (error) {
  console.error('[Glimpse] Critical initialization error:', error);
}

// Handle extension updates/reloads
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage?.addListener?.((message, sender, sendResponse) => {
    try {
      if (message.action === 'ping') {
        sendResponse({ status: 'alive' });
      }
    } catch (error) {
      console.error('[Glimpse] Message handler error:', error);
    }
  });
}