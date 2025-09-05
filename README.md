# 👁️ Glimpse: Instant Link Previews

**Version 1.1.1** - Production-ready Chrome extension with enterprise-grade reliability and sleek design.

Glimpse is a powerful, lightweight Chrome extension that fundamentally improves your browsing efficiency. It allows you to preview any link in a clean, modal overlay without ever leaving your current page. Say goodbye to endless context switching and tab management.

[![Glimpse Preview](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pnanY1aDRienlsOXMxb3RmMHRhdnk3c3FzYmlvZmJ5YWdxOTRzaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CVaJcEMA3mFZ5eMWxF/giphy.gif)](https://github.com/fyzanshaik/glimpse-extension)

---

## ✨ Core Features

*   **🖱️ Instant Previews:** Hold `Ctrl` (or `Cmd` on Mac) and click any link to instantly open it in a Glimpse window.
*   **🎨 Ultra-Sleek Design:** Minimal, modern interface with a compact 40px header and 24px buttons.
*   **🛡️ Cloudflare Compatible:** Automatically detects and disables on Cloudflare challenge pages to prevent verification loops.
*   **🚀 Works Everywhere:** Designed to work on everything from simple blogs to complex, JavaScript-heavy web apps.
*   **🔐 Secure & Private:** Built with a "privacy-first" philosophy. Minimal permissions, local processing, no data collection.
*   **⚡ Enterprise-Grade Reliability:** Comprehensive error handling, retry logic, and fallback mechanisms.
*   **📱 Fully Responsive:** Adaptive button sizing across all screen sizes and zoom levels.
*   **UX-Focused:**
    *   Click anywhere outside the preview or press `Escape` to close it.
    *   The background page is locked from scrolling while a preview is active.
    *   Seamlessly open the original link in a new tab with the "Open" button.

---

## 🆕 What's New in v1.1.1

### 🎨 **Design Improvements**
- **Ultra-Sleek Interface**: Redesigned with minimal, modern aesthetics
- **Compact Header**: Reduced from chunky to sleek 40px height
- **Micro Buttons**: Perfectly sized 24px × 24px buttons with consistent visual appearance
- **Glass Morphism**: Clean transparent backgrounds with backdrop blur effects
- **Responsive Design**: Buttons scale appropriately across all screen sizes (20px-28px)

### 🛡️ **Reliability & Bug Fixes**
- **Cloudflare Compatibility**: Fixed infinite verification loops on Cloudflare-protected sites
- **Enterprise Error Handling**: Comprehensive try-catch blocks with retry logic
- **Memory Management**: Proper cleanup and leak prevention
- **Timeout Protection**: All async operations have timeout safeguards
- **Cross-Origin Safety**: Robust handling of iframe restrictions and CORS errors
- **Network Resilience**: Automatic retries for failed requests with exponential backoff

### 🔧 **Technical Enhancements**
- **Debounced Events**: Prevents excessive event firing and performance issues
- **Input Validation**: Comprehensive URL and link validation
- **Graceful Degradation**: Multiple fallback strategies for every operation
- **State Management**: Proper instance lifecycle and destruction handling
- **Performance Optimized**: Reduced DOM manipulation overhead

### 🐛 **Bug Fixes**
- Fixed button size inconsistency between close and open buttons
- Resolved Cloudflare human verification infinite loops
- Fixed memory leaks from event listeners
- Corrected cross-origin iframe error handling
- Improved favicon loading with proper fallbacks

---

## 🚀 Installation

### Official Version (Coming Soon)

> **Status:** Glimpse v1.1.1 is currently under review for publication on the Chrome Web Store.

### From Source (For Developers)

1.  **Download or Clone:** Get the code from this repository: `git clone https://github.com/fyzanshaik/glimpse-extension.git`
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode:** Turn on the "Developer mode" toggle in the top-right corner.
4.  **Load the Extension:** Click "Load unpacked" and select the cloned repository folder.
5.  **Ready to Go!** Glimpse is now active and ready to use.

---

## 🔧 How It Works: A Technical Deep Dive

Glimpse uses a sophisticated, multi-layered approach to provide a seamless and secure preview experience.

### 1. Smart Event Handling

Instead of listening for a `click` event, Glimpse listens for `mousedown` with comprehensive error handling. This event fires earlier, allowing the extension to reliably intercept link activation before a website's scripts can interfere. Essential for compatibility with complex, single-page applications.

### 2. Secure Sandboxed Previews

Previews are loaded into sandboxed `<iframe>` elements with strict security policies (`allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation`). This isolates previewed content from the main page and prevents malicious actions.

### 3. Intelligent Network Layer

Uses `declarativeNetRequest` API to selectively modify security headers like `X-Frame-Options` and `Content-Security-Policy`, but only for `sub_frame` requests. Includes smart exclusions for Cloudflare domains and challenge pages.

### 4. Cloudflare Detection System

Advanced detection system that identifies Cloudflare challenge pages using multiple indicators:
- DOM elements (`.cf-challenge-container`, `#cf-challenge-stage`, etc.)
- Text content analysis ("checking your browser", "security check", etc.)  
- Script and meta tag detection
- URL pattern matching (`cdn-cgi`, `__cf_chl_`, etc.)

When detected, the extension automatically disables itself to prevent interference with human verification.

### 5. Enterprise-Grade Error Handling

- **Timeout Protection**: All operations have configurable timeouts
- **Retry Logic**: Automatic retries for network failures (3 attempts with exponential backoff)
- **Graceful Degradation**: Multiple fallback strategies for every critical operation
- **Memory Management**: Proper cleanup and garbage collection
- **Input Validation**: Comprehensive URL and DOM element validation

---

## 🛡️ Privacy & Security

### Permissions & Justification

| Permission                  | Justification                                                                                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`     | Essential for core preview functionality. Used in a narrowly scoped way to allow websites to be embedded in preview frames. Includes smart exclusions for Cloudflare and security-sensitive domains.                                                                                                                                        |
| `host_permissions: <all_urls>` | Required to: **1)** Inject content script for `Ctrl+Click` detection on any page. **2)** Enable `declarativeNetRequest` for any potential link destination. Without this, preview functionality would be limited to a predefined set of websites. |

### Data Handling Commitment

*   **Zero Data Collection:** Glimpse does not collect, store, or transmit any personal data or browsing history.
*   **Local Processing:** All logic and data handling happens locally on your machine.
*   **No Remote Code:** Extension does not fetch or execute remote code, ensuring behavior is fixed and verifiable.
*   **Transparent Operations:** All network modifications are logged and can be monitored in developer console.

### Security Features

- **Sandboxed Execution**: All previewed content runs in isolated iframes
- **Header Modification Logging**: All network modifications are logged for transparency
- **Input Sanitization**: All URLs and user inputs are validated and sanitized
- **Memory Protection**: Proper cleanup prevents memory leaks and data persistence
- **Cross-Origin Safety**: Robust handling of cross-origin restrictions

---

## 📊 Version History

### v1.1.1 (Latest)
- **Fixed**: Button size inconsistency between close and open buttons
- **Improved**: Better Unicode symbols for visual consistency
- **Enhanced**: Responsive button sizing across all screen sizes

### v1.1.0
- **Major**: Complete UI redesign with sleek, minimal interface
- **Added**: Enterprise-grade error handling and retry logic
- **Enhanced**: Comprehensive input validation and safety checks
- **Improved**: Memory management and performance optimization

### v1.0.3
- **Enhanced**: Modern glass morphism design with improved buttons
- **Added**: Responsive button sizing system
- **Improved**: Dark mode compatibility

### v1.0.2
- **Fixed**: Button sizing inconsistencies
- **Added**: Responsive design for different screen sizes

### v1.0.1
- **Critical Fix**: Cloudflare compatibility - prevents infinite verification loops
- **Added**: Smart Cloudflare challenge detection system
- **Enhanced**: Network request exclusions for security domains

### v1.0.0
- **Initial Release**: Core functionality with basic preview system

---

## 🤝 Contributing

This project is open-source and contributions are welcome. Areas where we'd love help:

- **Testing**: Try the extension on various websites and report issues
- **UI/UX**: Suggestions for design improvements
- **Performance**: Optimization ideas and implementations  
- **Compatibility**: Testing on different browsers and systems
- **Documentation**: Improvements to guides and explanations

Feel free to open an issue or submit a pull request!

## 📄 License

Glimpse is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 🔗 Links

- **Repository**: [github.com/fyzanshaik/glimpse-extension](https://github.com/fyzanshaik/glimpse-extension)
- **Issues**: [Report bugs or request features](https://github.com/fyzanshaik/glimpse-extension/issues)
- **Support**: [Buy me a coffee](https://coff.ee/fyzanshaik) ☕
- **Developer**: [Faizan Shaik](https://github.com/fyzanshaik)