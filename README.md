# 👁️ Glimpse: Instant Link Previews

Glimpse is a powerful, lightweight Chrome extension that fundamentally improves your browsing efficiency. It allows you to preview any link in a clean, modal overlay without ever leaving your current page. Say goodbye to endless context switching and tab management.

[![Glimpse Preview](https://jmp.sh/s/EQjgLVpaj6ef0Ze9WL3N)](https://github.com/fyzanshaik/glimpse)

*A brief animation showing Glimpse in action.*

---

## ✨ Core Features

*   **🖱️ Instant Previews:** Simply hold `Ctrl` (or `Cmd` on Mac) and click any link to instantly open it in a Glimpse window.
*   **🖼️ Modern Modal UI:** Previews appear in a large, centered overlay with a blurred background, focusing your attention.
*   **🚀 Works Everywhere:** Glimpse's robust architecture works on everything from simple blogs to complex, JavaScript-heavy web apps.
*   **🔐 Secure & Private:** Glimpse is built with modern security policies and requests minimal permissions. It processes everything locally and collects no data.
*   **UX-Focused:**
    *   Click anywhere outside the preview to close it.
    *   Press the `Escape` key to close.
    *   The background page is locked from scrolling while a preview is active.
    *   Seamlessly open the original link in a new tab with the "Expand" button.

---

## 🚀 Installation

### Official (Coming Soon)

Glimpse will be available on the Chrome Web Store soon.

### From Source (Developer Mode)

1.  **Download or Clone:** Get the latest version of the code from this repository: `https://github.com/fyzanshaik/glimpse`
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode:** Find the "Developer mode" toggle in the top-right corner and turn it on.
4.  **Load the Extension:** Click the "Load unpacked" button and select the folder containing the Glimpse source code.
5.  **Ready to Go!** Glimpse is now active. You can pin it to your toolbar for easy access.

---

## 🔧 How It Works: The Technical Details

Glimpse uses a sophisticated, multi-layered approach to provide a seamless and secure preview experience.

### 1. The Trigger: `mousedown` Event Listener

Glimpse listens for the `mousedown` event, which fires earlier than a standard `click`. This allows it to reliably intercept a link activation before a website's own scripts can interfere, ensuring Glimpse works on complex web apps.

### 2. The Sandbox: `iframe` with `allow-top-navigation-by-user-activation`

Previews are loaded into a sandboxed `<iframe>`. The key to our solution is the `allow-top-navigation-by-user-activation` sandbox setting. This is a modern browser security feature that prevents the loaded page from using JavaScript to "bust" out of the frame and redirect the main page, while still allowing the user to click links inside the preview that open new tabs.

### 3. The Network Layer: `declarativeNetRequest`

To bypass the final layer of embedding protection, Glimpse uses the `declarativeNetRequest` API to modify network headers. It removes several security headers (`X-Frame-Options`, `Content-Security-Policy`, etc.) from the server's response *before* they reach the browser. This is what allows Glimpse to preview sites with even the strictest security policies. The `declarativeNetRequestFeedback` permission is crucial for this step to work.

### File Structure

```
.
├── manifest.json
├── background.js
├── content.js
├── style.css
├── popup.html
├── rules.json
├── LICENSE
├── README.md
├── .gitignore
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🤝 Contributing

This project is open-source and contributions are welcome. Feel free to open an issue or submit a pull request.

## 📄 License

Glimpse is licensed under the **MIT License**. See the `LICENSE` file for details. 