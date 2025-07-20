# 👁️ Glimpse: Instant Link Previews

Glimpse is a powerful, lightweight Chrome extension that fundamentally improves your browsing efficiency. It allows you to preview any link in a clean, modal overlay without ever leaving your current page. Say goodbye to endless context switching and tab management.

[![Glimpse Preview](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pnanY1aDRienlsOXMxb3RmMHRhdnk3c3FzYmlvZmJ5YWdxOTRzaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CVaJcEMA3mFZ5eMWxF/giphy.gif)](https://github.com/fyzanshaik/glimpse)

---

## ✨ Core Features

*   **🖱️ Instant Previews:** Hold `Ctrl` (or `Cmd` on Mac) and click any link to instantly open it in a Glimpse window.
*   **🖼️ Modern Modal UI:** Previews appear in a large, centered overlay with a blurred background, focusing your attention.
*   **🚀 Works Everywhere:** Glimpse is designed to work on everything from simple blogs to complex, JavaScript-heavy web apps.
*   **🔐 Secure & Private:** Glimpse is built with a "privacy-first" philosophy. It requests minimal permissions, processes everything locally, and collects no user data.
*   **UX-Focused:**
    *   Click anywhere outside the preview or press `Escape` to close it.
    *   The background page is locked from scrolling while a preview is active.
    *   Seamlessly open the original link in a new tab with the "Expand" button.

---

## 🚀 Installation

### Official Version (Coming Soon)

> **Status:** Glimpse is currently under review for publication on the Chrome Web Store.

### From Source (For Developers)

1.  **Download or Clone:** Get the code from this repository: `git clone https://github.com/fyzanshaik/glimpse.git`
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode:** Turn on the "Developer mode" toggle in the top-right corner.
4.  **Load the Extension:** Click "Load unpacked" and select the cloned repository folder.
5.  **Ready to Go!** Glimpse is now active and ready to use.

---

## 🔧 How It Works: A Technical Deep Dive

Glimpse uses a sophisticated, multi-layered approach to provide a seamless and secure preview experience.

### 1. The Trigger: `mousedown` Event Listener

Instead of listening for a `click` event, Glimpse listens for `mousedown`. This event fires earlier, allowing the extension to reliably intercept a link activation before a website's own scripts can interfere. This is crucial for compatibility with complex, single-page applications.

### 2. The Sandbox: A Secure `<iframe>`

Previews are loaded into a sandboxed `<iframe>`. This is a critical security measure that isolates the previewed content from the main page and the extension itself. We use a strict sandbox policy (`allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation`) that prevents the loaded page from executing malicious actions, such as trying to redirect the top-level page.

### 3. The Network Layer: `declarativeNetRequest`

Many websites use security headers like `X-Frame-Options` and `Content-Security-Policy` to prevent themselves from being embedded in other sites. To enable previews for these sites, Glimpse uses the `declarativeNetRequest` API to modify these headers.

This is a powerful permission, and we use it in a highly restricted manner:
*   The header modification rule applies **only** to requests with a `resourceType` of `"sub_frame"`.
*   This means Glimpse does not and cannot interfere with network requests for your normal, top-level browsing. Its modifications are precisely targeted only at content being loaded into the Glimpse preview frame.

---

## 🛡️ Our Commitment to Privacy & Security

Transparency is a core value of this project. Here is a detailed explanation of the permissions Glimpse requires and why they are absolutely necessary for the extension to function.

| Permission                  | Justification                                                                                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                      | Allows the "Expand" button in the preview window to use `chrome.tabs.create()` to open the link in a new, full tab.                                                                                                                                                                                    |
| `declarativeNetRequest`     | Essential for the core preview functionality. It is used in a narrowly scoped way (see "How It Works" above) to allow websites to be embedded in the preview frame.                                                                                                                                        |
| `host_permissions: <all_urls>` | This is required for two reasons: **1)** To inject a script into every page to listen for the `Ctrl+Click` action. **2)** To allow `declarativeNetRequest` to function for any potential link destination. Without this, the preview feature would be limited to a small, predefined set of websites. |

### Why Not Use `activeTab`?

The `activeTab` permission is a more secure alternative to `<all_urls>`, but it only grants access to a page after a user clicks the extension's toolbar icon. Glimpse's functionality is triggered by an on-page action (`Ctrl+Click`), which requires a content script to be present and listening *before* the user acts. For this reason, `activeTab` is not a viable alternative for Glimpse's specific interaction model.

### Data Handling

*   **No Data Collection:** Glimpse does not collect, store, or transmit any personal data or browsing history.
*   **Local Processing:** All logic and data handling (like accessing a clicked URL) happens locally on your machine.
*   **No Remote Code:** The extension does not fetch or execute any remote code, ensuring its behavior is fixed and verifiable from the source code in this repository.

---

## 🤝 Contributing

This project is open-source and contributions are welcome. Feel free to open an issue or submit a pull request.

## 📄 License

Glimpse is licensed under the **MIT License**. See the `LICENSE` file for details. 