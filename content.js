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
      longClickEnabled: true,
      longClickDuration: 500,
      themeColor: '#667eea',
      applyThemeToHeader: false,
      darkMode: false,
      windowSize: 80,
      autoCloseTimer: 0,
      animations: false,
      soundEffects: false,
      backgroundOpacity: 60,
      backdropBlur: false
    };

    // Long click tracking
    this.longClickTimer = null;
    this.longClickTarget = null;
    this.longClickStartPos = { x: 0, y: 0 };
    this.longClickCompleted = false;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.detectCloudflareChallenge = this.detectCloudflareChallenge.bind(this);
    this.handleSettingsUpdate = this.handleSettingsUpdate.bind(this);

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

      // console.log('[LinkLens] Extension initialized successfully');
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
  }

  addEventListeners() {
    try {
      this.removeEventListeners();

      document.addEventListener('mousedown', this.handleMouseDown, {
        capture: true,
        passive: false
      });
      document.addEventListener('mouseup', this.handleMouseUp, {
        capture: true,
        passive: false
      });
      document.addEventListener('mousemove', this.handleMouseMove, {
        passive: true
      });
      document.addEventListener('keydown', this.handleKeyDown, {
        passive: false
      });

      window.addEventListener('beforeunload', () => this.destroy());

      chrome.runtime.onMessage.addListener(this.handleSettingsUpdate);
    } catch (error) {
      this.handleError('Failed to add event listeners', error);
    }
  }

  handleSettingsUpdate(message, sender, sendResponse) {
    if (message.action === 'settingsUpdated') {
      this.settings = { ...this.settings, ...message.settings };
      // console.log('[LinkLens] Settings updated:', this.settings);

      // Update theme immediately if there's an active overlay
      if (this.overlay) {
        const backdrop = this.overlay;
        const overlayElement = backdrop.querySelector('.linklens-overlay');

        // Update dark mode classes
        if (this.settings.darkMode) {
          overlayElement?.classList.add('dark-mode');
        } else {
          overlayElement?.classList.remove('dark-mode');
        }

        this.applyThemeSettings(overlayElement, backdrop);
      }

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
      document.removeEventListener('mouseup', this.handleMouseUp, true);
      document.removeEventListener('mousemove', this.handleMouseMove);
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
        // console.log('[LinkLens] Active Cloudflare challenge detected - extension disabled for this page');
        // console.log('[LinkLens] Challenge indicators:', {
          // elements: hasActiveChallengeElements,
          // text: hasActiveChallengeText,
          // url: isChallengeUrl,
          // title: hasChallengeTitle
        // });
        this.closeLinkLens(); // Close any existing glimpse
      } else if (!this.isCloudflareChallenge && wasCloudflareChallenge) {
        // console.log('[LinkLens] Cloudflare challenge resolved - extension re-enabled');
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

      if (event.button !== 0) {
        return;
      }

      const link = event.target?.closest?.('a');
      if (!this.isValidLink(link)) {
        return;
      }

      const isModifierPressed = this.checkModifierKey(event);

      // Modifier key + click: immediate preview (existing behavior)
      if (isModifierPressed) {
        event.preventDefault();
        event.stopPropagation();
        this.cancelLongClick();
        this.createLinkLens(link.href);
        return;
      }

      // Long click: start timer if enabled
      if (this.settings.longClickEnabled) {
        this.startLongClick(event, link);
      }
    } catch (error) {
      this.handleError('Mouse down handler failed', error);
    }
  }

  startLongClick(event, link) {
    try {
      this.cancelLongClick();

      this.longClickTarget = link;
      this.longClickStartPos = { x: event.clientX, y: event.clientY };
      this.longClickCompleted = false;

      this.longClickTimer = setTimeout(() => {
        if (this.longClickTarget === link) {
          this.longClickCompleted = true;
          this.createLinkLens(link.href);
          this.cancelLongClick();
        }
      }, this.settings.longClickDuration);
    } catch (error) {
      this.handleError('Long click start failed', error);
    }
  }

  handleMouseUp(event) {
    try {
      // If long click completed, prevent the click event
      if (this.longClickCompleted) {
        const link = this.longClickTarget;
        const preventClick = (e) => {
          const clickedLink = e.target?.closest?.('a');
          if (clickedLink === link) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }
        };
        document.addEventListener('click', preventClick, { capture: true, once: true });
        this.longClickCompleted = false;
      }

      // Cancel long click if mouse is released before duration completes
      this.cancelLongClick();
    } catch (error) {
      this.handleError('Mouse up handler failed', error);
    }
  }

  handleMouseMove(event) {
    try {
      if (!this.longClickTimer || !this.longClickTarget) {
        return;
      }

      // Cancel if mouse moves more than 10 pixels away
      const dx = event.clientX - this.longClickStartPos.x;
      const dy = event.clientY - this.longClickStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        this.cancelLongClick();
      }
    } catch (error) {
      this.handleError('Mouse move handler failed', error);
    }
  }

  cancelLongClick() {
    try {
      if (this.longClickTimer) {
        clearTimeout(this.longClickTimer);
        this.longClickTimer = null;
      }

      this.longClickTarget = null;
    } catch (error) {
      console.warn('[LinkLens] Failed to cancel long click:', error);
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
      
      // console.log('[LinkLens] Created glimpse for:', url);
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
      backdrop.classList.add('dark-mode-backdrop');
    }

    this.applyThemeSettings(overlay, backdrop);

    if (!this.settings.animations) {
      backdrop.classList.add('no-animations');
    }

    if (this.settings.backdropBlur) {
      backdrop.classList.add('backdrop-blur-enabled');
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

    // Remove will-change after animation completes for better performance
    overlay.addEventListener('animationend', () => {
      backdrop.classList.add('animation-complete');
    }, { once: true });

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
        allow: 'autoplay; fullscreen',
        sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation allow-modals',
        referrerPolicy: 'origin-when-cross-origin'
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
        // Apply dark mode backdrop
        if (this.settings.darkMode) {
          backdrop.classList.add('dark-mode-backdrop');
          backdrop.style.backgroundColor = 'rgba(0, 0, 0, 1)';
        } else {
          backdrop.classList.remove('dark-mode-backdrop');
          const opacity = this.settings.backgroundOpacity / 100;
          backdrop.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;

          // Apply or remove backdrop blur class (only when not in dark mode)
          if (this.settings.backdropBlur) {
            backdrop.classList.add('backdrop-blur-enabled');
          } else {
            backdrop.classList.remove('backdrop-blur-enabled');
          }
        }
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

      // console.log('[LinkLens] Closed glimpse overlay');
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
      // console.log(`[LinkLens] Retrying operation (${this.retryCount}/${this.maxRetries})`);
      
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
      
      // console.log('[LinkLens] Extension destroyed');
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