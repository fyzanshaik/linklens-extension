class LinkLensSettings {
  constructor() {
    this.defaultSettings = {
      modifierKey: 'ctrl',
      macSupport: true,
      themeColor: '#667eea',
      darkMode: false,
      windowSize: 80,
      autoCloseTimer: 0,
      animations: true,
      soundEffects: false,
      backgroundOpacity: 60
    };

    this.currentSettings = { ...this.defaultSettings };
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      console.error('[LinkLens Settings] Initialization failed:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('linklensSettings');
      if (result.linklensSettings) {
        this.currentSettings = { ...this.defaultSettings, ...result.linklensSettings };
      }
    } catch (error) {
      console.error('[LinkLens Settings] Failed to load settings:', error);
      // Fallback to local storage
      try {
        const localResult = await chrome.storage.local.get('linklensSettings');
        if (localResult.linklensSettings) {
          this.currentSettings = { ...this.defaultSettings, ...localResult.linklensSettings };
        }
      } catch (localError) {
        console.error('[LinkLens Settings] Local storage fallback failed:', localError);
      }
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ linklensSettings: this.currentSettings });
      
      // Also save to local storage as backup
      await chrome.storage.local.set({ linklensSettings: this.currentSettings });
      
      // Notify content script of settings change
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: this.currentSettings
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script
        });
      });

      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('[LinkLens Settings] Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  setupEventListeners() {
    // Modifier key selection
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        this.currentSettings.modifierKey = key;
        this.updateKeySelection();
      });
    });

    // Toggle switches
    const toggles = ['macSupport', 'applyThemeToHeader', 'darkMode', 'animations', 'soundEffects'];
    toggles.forEach(toggleId => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        toggle.addEventListener('click', () => {
          this.currentSettings[toggleId] = !this.currentSettings[toggleId];
          this.updateToggle(toggleId);
        });
      }
    });

    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.currentSettings.themeColor = color;
        this.updateColorSelection();
        this.updateThemeColor(color);
      });
    });

    // Sliders
    const windowSizeSlider = document.getElementById('windowSize');
    if (windowSizeSlider) {
      windowSizeSlider.addEventListener('input', (e) => {
        this.currentSettings.windowSize = parseInt(e.target.value);
        this.updateSliderValue('windowSize', e.target.value + '%');
      });
    }

    const autoCloseSlider = document.getElementById('autoCloseTimer');
    if (autoCloseSlider) {
      autoCloseSlider.addEventListener('input', (e) => {
        this.currentSettings.autoCloseTimer = parseInt(e.target.value);
        const value = e.target.value == 0 ? 'Off' : e.target.value + 's';
        this.updateSliderValue('autoCloseTimer', value);
      });
    }

    const backgroundOpacitySlider = document.getElementById('backgroundOpacity');
    if (backgroundOpacitySlider) {
      backgroundOpacitySlider.addEventListener('input', (e) => {
        this.currentSettings.backgroundOpacity = parseInt(e.target.value);
        this.updateSliderValue('backgroundOpacity', e.target.value + '%');
      });
    }

    // Action buttons
    document.getElementById('saveBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetBtn')?.addEventListener('click', () => {
      this.resetToDefaults();
    });
  }

  updateUI() {
    this.updateKeySelection();
    this.updateToggles();
    this.updateColorSelection();
    this.updateSliders();
    this.updateThemeColor(this.currentSettings.themeColor);
  }

  updateKeySelection() {
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.key === this.currentSettings.modifierKey) {
        btn.classList.add('active');
      }
    });
  }

  updateToggles() {
    const toggles = ['macSupport', 'applyThemeToHeader', 'darkMode', 'animations', 'soundEffects'];
    toggles.forEach(toggleId => {
      this.updateToggle(toggleId);
    });
  }

  updateToggle(toggleId) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      if (this.currentSettings[toggleId]) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    }
  }

  updateColorSelection() {
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.color === this.currentSettings.themeColor) {
        option.classList.add('active');
      }
    });
  }

  updateSliders() {
    const windowSizeSlider = document.getElementById('windowSize');
    if (windowSizeSlider) {
      windowSizeSlider.value = this.currentSettings.windowSize;
      this.updateSliderValue('windowSize', this.currentSettings.windowSize + '%');
    }

    const autoCloseSlider = document.getElementById('autoCloseTimer');
    if (autoCloseSlider) {
      autoCloseSlider.value = this.currentSettings.autoCloseTimer;
      const value = this.currentSettings.autoCloseTimer == 0 ? 'Off' : this.currentSettings.autoCloseTimer + 's';
      this.updateSliderValue('autoCloseTimer', value);
    }

    const backgroundOpacitySlider = document.getElementById('backgroundOpacity');
    if (backgroundOpacitySlider) {
      backgroundOpacitySlider.value = this.currentSettings.backgroundOpacity;
      this.updateSliderValue('backgroundOpacity', this.currentSettings.backgroundOpacity + '%');
    }
  }

  updateSliderValue(sliderId, value) {
    const valueElement = document.getElementById(sliderId + 'Value') || 
                        document.getElementById(sliderId.replace('Timer', 'Value'));
    if (valueElement) {
      valueElement.textContent = value;
    }
  }

  updateThemeColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Calculate darker shade for hover states
    const rgb = this.hexToRgb(color);
    if (rgb) {
      const darkerColor = `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`;
      document.documentElement.style.setProperty('--primary-dark', darkerColor);
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  async resetToDefaults() {
    try {
      this.currentSettings = { ...this.defaultSettings };
      await this.saveSettings();
      this.updateUI();
      this.showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('[LinkLens Settings] Failed to reset settings:', error);
      this.showStatus('Failed to reset settings', 'error');
    }
  }

  showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status show ${type}`;
      
      setTimeout(() => {
        statusElement.classList.remove('show');
      }, 3000);
    }
  }
}

// Initialize settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new LinkLensSettings();
});

// Handle keyboard shortcuts in popup
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.close();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('saveBtn')?.click();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    document.getElementById('resetBtn')?.click();
  }
});
