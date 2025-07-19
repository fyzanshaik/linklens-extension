# 👁 Glimpse - Chrome Extension

**Glimpse** is a lightweight Chrome extension that allows you to preview links in a floating overlay window without leaving your current page. Perfect for research, productivity, and seamless browsing.

## ✨ Features

- **🔍 Instant Link Previews**: Hold `Ctrl` (or `⌘ Cmd` on Mac) and click any link to preview it
- **📱 Draggable & Resizable**: Move and resize the preview window to your liking
- **⚡ Seamless Expansion**: Expand preview to a new tab without reloading
- **⌨️ Keyboard Shortcuts**: Press `Escape` to close the preview
- **🛡️ Smart Error Handling**: Graceful fallback for sites that block embedding
- **🌙 Dark Mode Support**: Automatically adapts to your system theme

## 🚀 Installation

### From Source (Developer Mode)

1. **Download or Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Requirements

- Chrome 88+ (Manifest V3 support)
- No additional permissions beyond what's listed in the manifest

## 📖 How to Use

### Basic Usage

1. **Hold `Ctrl`** (or `⌘ Cmd` on Mac)
2. **Click any link** on any webpage
3. **View the preview** in the floating overlay
4. **Close** with `Escape` key or the X button

### Advanced Features

- **📏 Resize**: Drag the corners or edges to resize the preview window
- **🚚 Move**: Drag the header bar to reposition the window
- **🆕 Expand**: Click the expand button (↗) to open in a new tab seamlessly
- **❌ Close**: Click the X button or press `Escape` to close

### Supported Links

- ✅ `http://` and `https://` URLs
- ❌ `mailto:`, `tel:`, `ftp:` and other protocols are ignored

## 🔧 Technical Details

### Architecture

- **Manifest V3** - Latest Chrome extension standard
- **Content Script** - Handles click events and overlay creation
- **Background Service Worker** - Manages hidden tabs for seamless expansion
- **Modern CSS** - Clean, responsive design with animations

### Privacy & Security

- **No Data Collection** - All processing happens locally
- **Minimal Permissions** - Only requests necessary permissions
- **Sandboxed iframes** - Secure content loading
- **No External Services** - Works completely offline

## 🛠️ Development

### File Structure

```
glimpse-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for tab management
├── content.js            # Main functionality and UI
├── style.css             # Overlay styling
├── popup.html            # Extension popup
├── icons/                # Extension icons
└── README.md             # This file
```

### Key Components

- **Glimpse Class** (`content.js`) - Main functionality
- **Tab Management** (`background.js`) - Hidden tab creation/management
- **Responsive Design** (`style.css`) - Modern UI with dark mode

### Future Enhancements

- ⚙️ Settings page with customization options
- 📝 Context menu integration
- 📚 Glimpse history
- 🔧 Multi-window support

## ❓ Troubleshooting

### Common Issues

**Preview shows "Preview not available"**
- Some sites block embedding with X-Frame-Options
- Click "Open in New Tab" to view the content directly

**Extension not working**
- Ensure you're using `Ctrl+Click` (or `⌘+Click` on Mac)
- Check that the link is `http://` or `https://`
- Try refreshing the page

**Performance issues**
- Only one preview window is active at a time by design
- Close unused previews to free up resources

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ for efficient browsing** 