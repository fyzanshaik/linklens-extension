# Glimpse: Product Requirement Document (PRD)

**Version:** 1.0  
**Date:** July 19, 2025  
**Status:** Scoping

---

## 1. Vision & Mission

**Vision:**  
To fundamentally improve browsing efficiency by seamlessly integrating link previews into the user's current workflow, eliminating the friction of constant context switching between tabs.

**Mission:**  
To create a lightweight, intuitive, and powerful Chrome extension that allows users to "glimpse" the content of a link in a floating overlay, without ever leaving their current page.

---

## 2. The Problem

In a typical browsing session, users frequently encounter links they need to reference or quickly check. The current process is disruptive:

- **Opening a new tab:** Switches the user's context entirely, forcing them to manage another tab and navigate back to their original task.
- **Right-click and open:** Cumbersome and still results in a new tab that needs to be managed.

This constant back-and-forth is inefficient, especially for tasks involving research, cross-referencing information, or quickly verifying a source. Users need a way to preview content without committing to a full tab switch.

---

## 3. Target Audience

- **Researchers & Students:** Constantly cross-referencing sources, citations, and data points.
- **Power Users & Productivity Enthusiasts:** Want to optimize their browsing workflow and minimize wasted clicks and time.
- **Social Media & News Consumers:** Want to quickly preview articles or profiles linked in feeds without losing their place.
- **Developers:** Need to check documentation or forum posts while keeping their primary work environment visible.

---

## 4. Core Features & Functionality (V1.0)

### 4.1. Activation: The Glimpse Trigger

- **Action:** User holds down the `Ctrl` key (or `Cmd` on macOS) and left-clicks any hyperlink (`<a>` tag).
- **System Response:**
  - The extension intercepts this event.
  - Prevents the browser's default action (opening the link in a new tab).
  - Creates and displays the Glimpse overlay on the current page.

---

### 4.2. The Glimpse Overlay Window

- **Content:** Contains a sandboxed `<iframe>` that loads the URL of the clicked link.
- **Appearance:**
  - **Floating & Centered:** Appears centered on the screen, above all other content. A subtle backdrop overlay dims the background.
  - **Modern Styling:** Clean, minimal design with rounded corners and box-shadow for depth.
  - **Default Size:** 55% of viewport width, 75% of viewport height (compact yet readable).
- **Behavior:**
  - **Draggable:** User can drag the window's header bar to reposition.
  - **Resizable:** User can resize by dragging corners or edges.
  - **Single Instance:** Only one Glimpse window open at a time. Triggering another link replaces the content.

---

### 4.3. Window Controls & Actions

| Control      | Icon         | Action                                                                                   |
|--------------|--------------|-----------------------------------------------------------------------------------------|
| Page Title   | Favicon + Title | Displays favicon and `<title>` of the loaded page for context.                        |
| Expand       | "Open in new" | Seamlessly transitions content to a new tab (no reload), closes overlay, focuses tab.   |
| Close        | 'X'           | Closes the Glimpse overlay and its background tab, returns user to original page.       |
| Keyboard Esc | N/A           | Pressing `Escape` closes the Glimpse overlay (same as clicking "Close").               |

---

### 4.4. The "No-Reload" Expand Feature

- **On Ctrl+Click:**
  - Creates the Glimpse `<iframe>` overlay for the user.
  - Simultaneously creates a new, inactive background tab loading the same URL.
- **On "Expand" Click:**
  - Finds the background tab, makes it active, and closes the Glimpse overlay.
- **On "Close" Click:**
  - Closes both the Glimpse overlay and the hidden background tab.

---

## 5. Technical Architecture (Manifest V3)

### 5.1. `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Glimpse",
  "version": "1.0",
  "description": "Hold Ctrl and click any link to preview it in a floating window.",
  "permissions": [
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["style.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

### 5.2. Background Service Worker (`background.js`)

- **Responsibilities:**
  - Manages the lifecycle of the hidden, pre-loaded tab (stores `tabId`).
  - Listens for messages from the content script (e.g., `"expandTab"`, `"closeGlimpse"`).
  - Uses `chrome.tabs.update()` to activate the hidden tab when "Expand" is clicked.
  - Uses `chrome.tabs.remove()` to close the hidden tab when "Close" is clicked.

---

### 5.3. Content Script (`content.js`)

- **Responsibilities:**
  - Attaches a global click event listener to the document.
  - Checks for the `ctrlKey` or `metaKey` property on the event object.
  - If the trigger condition is met on a link, calls `event.preventDefault()`.
  - Dynamically creates the HTML elements for the Glimpse overlay (wrapper, header, iframe, buttons) and injects them into the page's `<body>`.
  - Handles logic for dragging and resizing the overlay.
  - Sends messages to the background service worker to perform actions it cannot (like managing tabs).

---

## 6. Edge Case Handling

- **Content Blocking (X-Frame-Options):**
  - **Detection:** Listen for the load event on the `<iframe>`. If it fails or errors, assume it's blocked.
  - **Fallback UI:** Display a clean error message:  
    > "This site doesn't allow being previewed."  
    with a prominent "Open in New Tab" button (directly opens the link in a new tab).
- **File Download Links:**  
  If the clicked link points to a downloadable file (e.g., `.pdf`, `.zip`), the `<iframe>` will trigger a download. This is acceptable default behavior for V1.
- **mailto: and Other Protocols:**  
  The extension only triggers on `http://` and `https://` links. Ignores others like `mailto:`, `ftp:`, etc.

---

## 7. Future Enhancements (Roadmap)

- **V1.1 – Settings & Customization:**
  - Options page to change the modifier key (Ctrl, Alt, Shift).
  - Blacklist/whitelist feature to disable Glimpse on specific domains.
  - Adjustable default window size and position.

- **V1.2 – Context Menu Integration:**
  - Add "Open in Glimpse" to the right-click context menu.

- **V2.0 – Advanced Features:**
  - **Glimpse History:** Pop-up menu from the extension icon showing recently Glimpsed pages.
  - **Multi-Glimpse Mode:** Optional setting to allow multiple Glimpse windows simultaneously.

