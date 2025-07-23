class Glimpse {
  constructor() {
    this.overlay = null;
    this.currentTabId = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandle = null;

    this.init();
  }

  init() {
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.getCurrentTabId();
  }

  async getCurrentTabId() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentTabId' });
      this.currentTabId = response?.tabId;
    } catch (error) {
      this.currentTabId = Date.now();
    }
  }

  handleMouseDown(event) {
    if (event.target.closest('.glimpse-overlay')) {
      return;
    }

    const isModifierPressed = event.ctrlKey || event.metaKey;
    if (!isModifierPressed || event.button !== 0) {
      return;
    }

    const link = event.target.closest('a');
    if (!link || !link.href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!link.href.startsWith('http://') && !link.href.startsWith('https://')) {
      return;
    }

    this.createGlimpse(link.href);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.overlay) {
      this.closeGlimpse();
    }
  }

  async createGlimpse(url) {
    if (this.overlay) {
      this.closeGlimpse();
    }
    this.createOverlayElements(url);
  }

  createOverlayElements(url) {
    const backdrop = document.createElement('div');
    backdrop.className = 'glimpse-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeGlimpse();
      }
    });

    const overlay = document.createElement('div');
    overlay.className = 'glimpse-overlay';

    const header = document.createElement('div');
    header.className = 'glimpse-header';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'glimpse-title';

    const favicon = document.createElement('img');
    favicon.className = 'glimpse-favicon';
    favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
    favicon.onerror = () => {
      favicon.style.display = 'none';
    };

    const title = document.createElement('span');
    title.className = 'glimpse-title-text';
    title.textContent = 'Loading...';

    titleContainer.appendChild(favicon);
    titleContainer.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'glimpse-controls';

    const expandBtn = document.createElement('button');
    expandBtn.className = 'glimpse-btn glimpse-reopen';
    expandBtn.innerHTML = '↗';
    expandBtn.title = 'Open in new tab';
    expandBtn.onclick = () => this.expandToNewTab(url);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'glimpse-btn glimpse-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.closeGlimpse();

    controls.appendChild(expandBtn);
    controls.appendChild(closeBtn);

    header.appendChild(titleContainer);
    header.appendChild(controls);

    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'glimpse-content';

    const iframe = document.createElement('iframe');
    iframe.className = 'glimpse-iframe';
    iframe.src = url;
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation';
    iframe.referrerPolicy = 'no-referrer';

    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const pageTitle = iframeDoc.title;
        if (pageTitle) {
          title.textContent = pageTitle;
        }
      } catch (error) {
        title.textContent = new URL(url).hostname;
      }
    };

    iframe.onerror = () => {
      this.showError(iframeContainer, url);
    };

    iframeContainer.appendChild(iframe);

    overlay.appendChild(header);
    overlay.appendChild(iframeContainer);

    backdrop.appendChild(overlay);

    document.body.appendChild(backdrop);
    document.body.classList.add('glimpse-active');

    this.overlay = backdrop;
  }

  showError(container, url) {
    container.innerHTML = `
      <div class="glimpse-error">
        <h3>Preview not available</h3>
        <p>This site may have security policies that prevent it from being previewed.</p>
        <button class="glimpse-open-direct" data-url="${url}">
          Open in New Tab
        </button>
      </div>
    `;
    container.querySelector('.glimpse-open-direct').onclick = (e) => {
      this.expandToNewTab(e.target.dataset.url);
      this.closeGlimpse();
    };
  }

  async expandToNewTab(url) {
    try {
      await chrome.runtime.sendMessage({
        action: 'createTab',
        url: url,
      });
      this.closeGlimpse();
    } catch (error) {
      console.error('Failed to create tab:', error);
    }
  }

  async closeGlimpse() {
    if (!this.overlay) return;

    this.overlay.remove();
    this.overlay = null;
    document.body.classList.remove('glimpse-active');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Glimpse();
  });
} else {
  new Glimpse();
} 