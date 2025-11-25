# Smart TOC

A browser extension that automatically generates a table of contents (TOC) for any website, making it easier to read and navigate long articles, documentation, and online books.

## Features

- 🚀 **Auto-generate TOC**: Automatically extracts headings from web pages and creates a navigable table of contents
- 🎯 **Smart Detection**: Intelligently identifies the main content area and relevant headings
- ⌨️ **Keyboard Shortcut**: Toggle TOC visibility with `Alt+Shift+T`
- 🎨 **Customizable**: Configure maximum heading level and auto-detection settings
- 📱 **Universal**: Works on any website with heading structure
- 💾 **Persistent Settings**: Your preferences are saved across sessions

## Installation

### From Source

1. Clone this repository or download the source code:
   ```bash
   git clone <repository-url>
   cd smart_TOC
   ```

2. Load the extension in your browser:

   **For Chrome/Edge:**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `smart_TOC` directory

   **For Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the `smart_TOC` directory

## Usage

### Basic Usage

1. **Open the TOC**: Click the Smart TOC icon in your browser toolbar or press `Alt+Shift+T`
2. **Navigate**: Click on any heading in the TOC to jump to that section
3. **Close**: Click the close button or press the keyboard shortcut again

### Configuration

Click the extension icon and select "Options" (or right-click the icon → Options) to customize:

- **Maximum Heading Level**: Choose which heading levels to include (H1-H6)
- **Auto-detect Main Content**: Enable/disable intelligent content area detection

## Project Structure

```
smart_TOC/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for TOC generation
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── options.html          # Options page UI
├── options.js            # Options page logic
├── assets/               # Icons and images
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── generate_icons.html
├── styles/               # CSS stylesheets
│   ├── panel.css        # TOC panel styles
│   ├── popup.css        # Popup styles
│   └── options.css      # Options page styles
└── utils/               # Utility modules
    ├── storage.js       # Storage management
    └── tocGenerator.js  # TOC generation algorithm
```

## Technical Details

### Architecture

- **Manifest V3**: Built with the latest Chrome extension manifest version
- **Content Script**: Runs on all web pages to extract headings and display TOC
- **Service Worker**: Manages extension state and permissions
- **Storage API**: Persists user preferences

### Key Components

- **TocGenerator**: Smart algorithm that identifies main content and extracts headings
- **Storage Manager**: Handles saving and retrieving user settings
- **Panel UI**: Responsive, draggable TOC panel overlay

## Permissions

- `activeTab`: Access the current tab to extract headings
- `storage`: Save user preferences
- `host_permissions`: Access all URLs to generate TOC on any website

## Development

### Prerequisites

- A Chromium-based browser (Chrome, Edge, etc.) or Firefox
- Basic knowledge of HTML, CSS, and JavaScript

### Making Changes

1. Edit the relevant files
2. Reload the extension in your browser:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the Smart TOC card
3. Test your changes on various websites

### Icon Generation

Use `assets/generate_icons.html` to create custom icons for the extension.

## Browser Compatibility

- ✅ Chrome (version 88+)
- ✅ Edge (version 88+)
- ✅ Opera (version 74+)
- ⚠️ Firefox (requires minor manifest adjustments for full compatibility)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license here]

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/yourusername/smart_TOC/issues).

## Changelog

### Version 1.0.0
- Initial release
- Auto-generate TOC from web page headings
- Configurable heading levels
- Keyboard shortcut support
- Persistent settings

---

Made with ❤️ for better web reading experience
