// Content script for handling Glimpse functionality
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
    // Listen for mousedown, as it fires before click and gives us a better
    // chance to prevent the browser's default navigation.
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
    
    // Add keyboard event listener for Escape key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Get current tab ID - use a simple approach since we're in a content script
    this.getCurrentTabId();
  }
  
  async getCurrentTabId() {
    try {
      // In content script, we can get tab ID by sending a message to background
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentTabId' });
      this.currentTabId = response?.tabId;
    } catch (error) {
      console.warn('Could not get current tab ID:', error);
      // Fallback: use a timestamp-based ID for uniqueness
      this.currentTabId = Date.now();
    }
  }
  
  handleMouseDown(event) {
    // Prevent Glimpse-in-Glimpse
    if (event.target.closest('.glimpse-overlay')) {
      return;
    }
    
    // Check if Ctrl (or Cmd on Mac) is pressed and it's a left click
    const isModifierPressed = event.ctrlKey || event.metaKey;
    
    if (!isModifierPressed || event.button !== 0) {
      return;
    }
    
    // Find the closest anchor tag
    const link = event.target.closest('a');
    
    if (!link || !link.href) {
      return;
    }
    
    // Prevent default link behavior immediately
    event.preventDefault();
    event.stopPropagation();
    
    // Only handle http/https links
    if (!link.href.startsWith('http://') && !link.href.startsWith('https://')) {
      return;
    }
    
    // Create or update the glimpse overlay
    this.createGlimpse(link.href);
  }
  
  handleKeyDown(event) {
    if (event.key === 'Escape' && this.overlay) {
      this.closeGlimpse();
    }
  }
  
  async createGlimpse(url) {
    console.log(`[Glimpse] Triggered for URL: ${url}`);
    // Close existing glimpse if any
    if (this.overlay) {
      this.closeGlimpse();
    }
    
    // Create overlay elements
    this.createOverlayElements(url);
  }
  
  createOverlayElements(url) {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'glimpse-backdrop';
    
    // Create main overlay container
    const overlay = document.createElement('div');
    overlay.className = 'glimpse-overlay';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'glimpse-header';
    
    // Create title container
    const titleContainer = document.createElement('div');
    titleContainer.className = 'glimpse-title';
    
    // Create favicon
    const favicon = document.createElement('img');
    favicon.className = 'glimpse-favicon';
    favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
    favicon.onerror = () => {
      favicon.style.display = 'none';
    };
    
    // Create title text
    const title = document.createElement('span');
    title.className = 'glimpse-title-text';
    title.textContent = 'Loading...';
    
    titleContainer.appendChild(favicon);
    titleContainer.appendChild(title);
    
    // Create controls
    const controls = document.createElement('div');
    controls.className = 'glimpse-controls';
    
    // Expand button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'glimpse-btn glimpse-expand';
    expandBtn.innerHTML = '↗';
    expandBtn.title = 'Open in new tab';
    expandBtn.onclick = () => this.expandToNewTab(url);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'glimpse-btn glimpse-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.closeGlimpse();
    
    controls.appendChild(expandBtn);
    controls.appendChild(closeBtn);
    
    header.appendChild(titleContainer);
    header.appendChild(controls);
    
    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'glimpse-content';
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'glimpse-iframe';
    const proxyUrl = chrome.runtime.getURL('proxy.html') + `?url=${encodeURIComponent(url)}`;
    iframe.src = proxyUrl;
    console.log(`[Glimpse] Using proxy URL: ${proxyUrl}`);

    // Handle iframe load events (simplified for proxy)
    iframe.onload = () => {
      console.log('[Glimpse] Proxy iframe loaded.');
      // The proxy page will handle its own title, so we don't need to do anything here.
    };

    iframe.onerror = (error) => {
      console.error('[Glimpse] Proxy iframe onerror event fired:', error);
      this.showError(iframeContainer, url, 'The proxy page itself failed to load.');
    };

    iframeContainer.appendChild(iframe);
    
    // Assemble overlay
    overlay.appendChild(header);
    overlay.appendChild(iframeContainer);
    
    backdrop.appendChild(overlay);
    
    // Add to page
    document.body.appendChild(backdrop);
    
    // Store reference
    this.overlay = backdrop;
  }
  
  showError(container, url, reason = 'Unknown') {
    console.error(`[Glimpse] showError called. Reason: ${reason}`);
    container.innerHTML = `
      <div class="glimpse-error">
        <h3>Preview not available</h3>
        <p>This site may have security policies that prevent it from being previewed.</p>
        <p style="font-size: 10px; color: #999; margin-top: 10px; font-family: monospace;">Debug Info: ${reason}</p>
        <button class="glimpse-btn glimpse-open-direct" data-url="${url}">
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
    console.log(`[Glimpse] Expanding to new tab: ${url}`);
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

    console.log('[Glimpse] Closing Glimpse overlay.');
    // Remove overlay from DOM
    this.overlay.remove();
    this.overlay = null;
  }
}

// Initialize Glimpse when content script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Glimpse();
  });
} else {
  new Glimpse();
} 