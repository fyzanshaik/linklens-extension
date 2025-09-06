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

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.detectCloudflareChallenge = this.detectCloudflareChallenge.bind(this);

    this.init();
  }

  init() {
    try {
      if (this.isDestroyed) {
        console.warn('[LinkLens] Cannot initialize destroyed instance');
        return;
      }

      this.addEventListeners();
      this.getCurrentTabId();
      this.detectCloudflareChallenge();

      console.log('[LinkLens] Extension initialized successfully');
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
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

      const isModifierPressed = event.ctrlKey || event.metaKey;
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

  closeLinkLens() {
    try {
      if (!this.overlay) return;

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