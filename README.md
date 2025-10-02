<div align="center">

# 🔍 LinkLens

**Preview any link instantly with Ctrl+Click or Long-Press**

*Formerly known as Glimpse*

[![Version](https://img.shields.io/badge/version-1.3.3-blue.svg)](https://github.com/fyzanshaik/linklens-extension/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)](https://chrome.google.com/webstore)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Settings](#%EF%B8%8F-settings) • [Privacy](#-privacy)

</div>

---

## 📥 Installation

### 🌐 Chrome Web Store (Recommended)

> 🔄 **Status**: Under review - Coming soon!
>
> The extension is currently being reviewed by the Chrome Web Store team. Check back soon for the official download link.

### 🛠️ Manual Installation (Developer Mode)

Perfect for trying out the latest features before they hit the store!

1. **Download the Extension**
   ```bash
   git clone https://github.com/fyzanshaik/linklens-extension.git
   ```
   Or download the [ZIP file](https://github.com/fyzanshaik/linklens-extension/archive/refs/heads/main.zip) and extract it

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click Menu (⋮) → **More Tools** → **Extensions**

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the Extension**
   - Click **Load unpacked**
   - Select the `linklens-extension` folder you just downloaded
   - Done! ✅ The extension icon should appear in your toolbar

5. **Start Using**
   - `Ctrl` + click any link, or just long-press it!

---

## ✨ Features

### 🖱️ **Dual Trigger Methods**
Choose your preferred way to preview:
- **Quick Preview**: `Ctrl` + click (or `Cmd` + click on Mac)
- **Long Press**: Hold mouse button for 500ms (customizable 300-1500ms)
- **Both Work Together**: Use whichever feels natural!

### 🎯 **Universal Compatibility**
- ✅ Works on **X-Frame-Options** protected sites (pkg.go.dev, docs.python.org, etc.)
- ✅ Smart **Cloudflare** detection - works on protected sites
- ✅ Automatic fallback for incompatible pages
- ✅ Respects security headers during verification flows

### 🎨 **Highly Customizable**
- 🎨 **6 Theme Colors** - Match your style
- 📐 **Adjustable Window Size** - 60% to 95% viewport
- 🌓 **Dark Mode** - Easy on the eyes
- 💨 **Backdrop Blur** - Optional background blur effect
- ⚡ **Animation Control** - Smooth or instant (your choice)

### ⚡ **Blazing Fast Performance**
- 🚀 Zero-jitter instant previews
- 🎯 GPU-accelerated animations (when enabled)
- 🧠 Smart memory management
- 📊 60fps smooth scrolling

### 🔐 **Privacy First**
- 🚫 **Zero data collection** - Nothing leaves your device
- 🔒 **Local processing only** - All operations happen on your machine
- 👁️ **No tracking** - No analytics, no telemetry
- 🛡️ **Minimal permissions** - Only what's absolutely necessary

---

## 🚀 Usage

### Quick Start

1. **Browse any website** as normal
2. **Hover over a link** you want to preview
3. **Choose your method**:
   - **Fast**: Hold `Ctrl` (or `Cmd` on Mac) and click
   - **Easy**: Long-press the link (hold for 0.5 seconds)
4. **Preview appears** in a beautiful floating window
5. **Close** by clicking outside, pressing `Esc`, or clicking the × button

### Visual Feedback

- 🔵 **Long-press active**: Link highlights with subtle blue outline
- ⏱️ **Timer running**: Hold steady for 500ms (customizable)
- ❌ **Cancelled**: Move mouse >10px or release early
- ✅ **Preview opens**: Full-screen overlay with your content

---

## ⚙️ Settings

Click the **LinkLens icon** in your toolbar to customize everything:

### 🎯 Trigger Settings
| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Modifier Key** | Ctrl / Alt / Shift | Ctrl | Quick preview key |
| **Mac Support** | ON / OFF | ON | Use Cmd instead of Ctrl |
| **Long Click** | ON / OFF | ON | Enable long-press trigger |
| **Long Click Duration** | 300ms - 1500ms | 500ms | Hold time for long-press |

### 🎨 Appearance
| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Theme Color** | 6 presets | Purple | Accent color |
| **Apply to Header** | ON / OFF | OFF | Themed window header |
| **Dark Mode** | ON / OFF | OFF | Dark theme |
| **Window Size** | 60% - 95% | 80% | Preview size |
| **Background Opacity** | 20% - 90% | 60% | Overlay darkness |
| **Backdrop Blur** | ON / OFF | OFF | Background blur |

### ⚙️ Behavior
| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Auto-close Timer** | 0s - 30s | Off | Close after inactivity |
| **Animations** | ON / OFF | OFF | Smooth transitions |
| **Sound Effects** | ON / OFF | OFF | Audio feedback |

---

## 🔒 Privacy

LinkLens is built with privacy as a core principle:

### What We DON'T Do
- ❌ **No data collection** - We don't store or transmit any information
- ❌ **No browsing history** - We never track what sites you visit
- ❌ **No analytics** - Zero telemetry or usage statistics
- ❌ **No external servers** - Everything happens locally on your device
- ❌ **No third-party code** - No external dependencies or scripts

### What We DO
- ✅ **Local storage only** - Settings saved on your device via Chrome's sync
- ✅ **Minimal permissions** - Only what's needed for core functionality
- ✅ **Open source** - Code is public and auditable
- ✅ **Transparent** - All operations documented

### Permissions Explained

**`declarativeNetRequest`**: Required to remove X-Frame-Options headers so websites can load in preview iframes. Only affects preview frames, never your main browsing.

**`storage`**: Saves your preferences (theme, window size, etc.) and syncs across devices where you're signed into Chrome.

**`<all_urls>`**: Allows the extension to detect Ctrl+clicks and long-presses on any page, and enables previews for any website you visit.

---

## 📋 Changelog

<details>
<summary><strong>v1.3.3 (Latest)</strong> - Long Click Support 🖱️</summary>

#### ✨ New Feature - Issue #3
- **Added**: Long-press/long-click trigger to open previews without modifier keys
- **Added**: Customizable long-click duration (300ms - 1500ms, default 500ms)
- **Added**: Visual feedback during long-press (subtle blue highlight)
- **Added**: Smart cancellation if mouse moves >10px or releases early
- **Enhanced**: Both trigger methods work independently (Ctrl+click OR long-press)
- **Improved**: More accessible for touchpad users and those who prefer not using modifier keys

</details>

<details>
<summary><strong>v1.3.2</strong> - Performance & Compatibility Overhaul</summary>

#### 🔧 Critical Fixes
- Re-enabled declarativeNetRequest to strip X-Frame-Options headers
- Sites like pkg.go.dev, docs.python.org now work in iframe previews
- Fixed backdrop blur showing when disabled in settings
- Fixed button size inconsistency
- Fixed animation jitter on complex pages

#### ⚡ Performance Improvements
- Separated blur animation for 60fps performance
- Added GPU acceleration with will-change hints
- Hardware-accelerated transforms
- Memory management improvements
- Animations OFF by default

#### 🎨 UI Enhancements
- Enhanced backdrop blur with smoother animation
- New backdrop blur toggle in settings
- Button visual consistency across all screen sizes
- Better shadows and rounded corners
- Improved responsive sizing

#### 🛡️ Security & Compatibility
- Comprehensive Cloudflare domain exclusions
- Defense-in-depth with domain + path exclusions
- Smart Cloudflare detection maintained
- Safe header handling for verification

</details>

<details>
<summary><strong>Earlier Versions</strong></summary>

### v1.3.1 - Enhanced UI & Theme Control
- Fixed theme color application to preview header
- Fixed animation toggle functionality
- Added background opacity control
- Improved popup design

### v1.3.0 - Comprehensive Settings Panel
- Complete settings interface
- Configurable modifier keys, themes, window sizes
- Auto-close timers, sound effects, dark mode
- User-friendly popup with save/reset

### v1.2.0 - LinkLens Rebrand
- Complete rebrand from Glimpse to LinkLens
- New professional icon
- Updated UI and documentation

### v1.1.2 - Smart Cloudflare Detection
- Works on Cloudflare-protected sites
- Disables only during active verification
- Precision challenge detection

### v1.0.0 - Initial Release
- Basic link preview functionality
- Ctrl+click trigger
- Minimal design

</details>

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 **Report bugs** - [Open an issue](https://github.com/fyzanshaik/linklens-extension/issues)
- 💡 **Suggest features** - [Start a discussion](https://github.com/fyzanshaik/linklens-extension/discussions)
- 🔧 **Submit PRs** - Fork, code, and submit!
- 📖 **Improve docs** - Help make this README even better
- ⭐ **Star the repo** - Show your support!

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- 🌐 **Website**: [Chrome Web Store](#) *(coming soon)*
- 💻 **GitHub**: [fyzanshaik/linklens-extension](https://github.com/fyzanshaik/linklens-extension)
- 🐛 **Issues**: [Report a bug](https://github.com/fyzanshaik/linklens-extension/issues)
- ☕ **Support**: [Buy me a coffee](https://coff.ee/fyzanshaik)

---

<div align="center">

**Made with ❤️ by [fyzanshaik](https://github.com/fyzanshaik)**

If LinkLens helps you browse better, consider [buying me a coffee](https://coff.ee/fyzanshaik)! ☕

</div>
