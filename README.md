# 🔍 LinkLens

**Version 1.3.2** - Instant link previews without leaving your page.

*Previously known as Glimpse*

Hold `Ctrl` + click any link to preview it in a floating window. No more tab switching.

---

## ✨ Features

- **🖱️ Instant Previews**: `Ctrl` + click any link for zero-jitter instant previews
- **🎨 Highly Customizable**: Theme colors, window size, backdrop blur, animations, and more
- **⚡ Blazing Fast**: Animations OFF by default for instant, smooth previews
- **🛡️ Smart Cloudflare**: Works on protected sites, disables only during challenges
- **🌐 Universal Compatibility**: Works on sites with X-Frame-Options (pkg.go.dev, docs sites, etc.)
- **🔐 Privacy First**: No data collection, local processing only
- **📱 Fully Responsive**: Adaptive UI across all screen sizes
- **🎯 Reliable**: Enterprise-grade error handling & fallback mechanisms

---

## 🚀 Installation

### Chrome Web Store (Coming Soon)
Extension is under review for publication.

### Developer Install
1. Clone: `git clone https://github.com/fyzanshaik/linklens-extension.git`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select folder
5. Ready to use!

---

## ⚙️ Customization

Access settings by clicking the LinkLens icon in your browser toolbar. Available options:

### 🔧 Trigger Settings
- **Modifier Key**: Choose between Ctrl, Alt, or Shift
- **Mac Support**: Auto-use Cmd key instead of Ctrl on macOS

### 🎨 Appearance
- **Theme Color**: 6 beautiful preset colors
- **Apply Theme to Header**: Optional themed preview window header
- **Dark Mode**: Enable dark theme for preview windows
- **Window Size**: Adjust default preview size (60-95%)
- **Background Opacity**: Control overlay darkness (20-90%)
- **Backdrop Blur**: Toggle background blur effect (OFF by default)

### ⚙️ Behavior
- **Auto-close Timer**: Automatically close previews after inactivity (0-30s)
- **Show Animations**: Toggle smooth transitions (OFF by default for best performance)
- **Sound Effects**: Optional subtle interaction sounds

---

## 📋 Changelog

### v1.3.2 (Latest) - Performance & Compatibility Overhaul
#### 🔧 Critical Fixes
- **Fixed**: Re-enabled declarativeNetRequest to strip X-Frame-Options headers
- **Fixed**: Sites like `pkg.go.dev`, `docs.python.org`, and others now work in iframe previews
- **Fixed**: Backdrop blur showing when disabled in settings
- **Fixed**: Button size inconsistency - close (X) and open (⧉) buttons now identical size
- **Fixed**: Animation jitter and sluggishness on complex pages

#### ⚡ Performance Improvements
- **Optimized**: Separated blur animation from opacity for 60fps performance
- **Added**: GPU acceleration with `will-change` hints and `translateZ(0)`
- **Improved**: Hardware-accelerated transforms for smooth animations
- **Enhanced**: Memory management - auto-cleanup of `will-change` after animations
- **Default**: Animations OFF for instant, zero-jitter previews

#### 🎨 UI Enhancements
- **Improved**: Enhanced backdrop blur with smoother animation (8px blur)
- **Added**: Backdrop Blur toggle in settings (OFF by default)
- **Fixed**: Button visual consistency across all screen sizes
- **Enhanced**: Better shadows, rounded corners (16px), and modern polish
- **Improved**: Responsive button sizing with proper min-width/min-height

#### 🛡️ Security & Compatibility
- **Enhanced**: Comprehensive Cloudflare domain exclusions (cloudflare.com, challenges.cloudflare.com, etc.)
- **Added**: Defense-in-depth with both domain AND path-based exclusions
- **Maintained**: Smart Cloudflare detection still works for active challenge pages
- **Safe**: Never strips headers from Cloudflare verification resources

### v1.3.1 - Enhanced UI & Theme Control
- **Fixed**: Theme color changes now properly apply to preview window header
- **Fixed**: Animation toggle now works correctly
- **Added**: Background opacity control for overlay darkness adjustment
- **Improved**: Cleaner, more compact popup design without gradient header
- **Enhanced**: Reduced spacing and streamlined layout for better UX

### v1.3.0 - Comprehensive Settings Panel
- **New**: Complete settings interface with extensive customization options
- **Added**: Configurable modifier keys (Ctrl/Alt/Shift), theme colors, window sizes
- **Enhanced**: Auto-close timers, sound effects, dark mode, animation controls
- **Improved**: User-friendly popup with save/reset functionality

### v1.2.1 - Improved Icon Design
- **Enhanced**: Much better, more professional icon design
- **Refined**: Cleaner lens and link concept with better gradients
- **Polished**: Modern design with subtle depth and highlights

### v1.2.0 - LinkLens Rebrand
- **Rebranded**: Complete rebrand from Glimpse to LinkLens
- **New Icon**: Clean, professional icon with link + lens concept
- **Updated**: All UI elements, documentation, and branding

### v1.1.2 - Smart Cloudflare Detection
- **Fixed**: Works on Cloudflare-protected sites normally
- **Enhanced**: Only disables during active human verification
- **Improved**: Precision detection of challenge pages
- **Added**: Detailed challenge detection logging

### v1.1.1 - Button Consistency
- **Fixed**: Button size inconsistency
- **Improved**: Better Unicode symbols
- **Enhanced**: Responsive button sizing

### v1.1.0 - Major Redesign
- **New**: Ultra-sleek minimal interface
- **Added**: Enterprise-grade error handling
- **Enhanced**: Memory management & performance
- **Improved**: Comprehensive input validation

### v1.0.1 - Cloudflare Compatibility
- **Fixed**: Infinite verification loops
- **Added**: Cloudflare challenge detection
- **Enhanced**: Network request exclusions

### v1.0.0 - Initial Release
- **Core**: Basic link preview functionality

---

## 🔒 Privacy

- **Zero Data Collection**: Nothing stored or transmitted
- **Local Processing**: Everything happens on your device
- **Minimal Permissions**: Only what's needed for functionality
- **No Tracking**: No analytics, no remote code

---

## 🤝 Contributing

Issues and PRs welcome! 

## 📄 License

MIT License - see `LICENSE` file.

---

**Links**: [GitHub](https://github.com/fyzanshaik/linklens-extension) • [Issues](https://github.com/fyzanshaik/linklens-extension/issues) • [Support](https://coff.ee/fyzanshaik)