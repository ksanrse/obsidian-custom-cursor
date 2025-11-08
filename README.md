# Custom Cursor for Obsidian

A fully customizable text cursor plugin for Obsidian that lets you personalize your writing experience with custom cursor styles, colors, and animations.

## Features

### 🎨 **Visual Customization**
- **Three cursor styles**: Line (vertical bar), Block (filled rectangle), Underline (horizontal bar)
- **Color presets**: Choose from theme's accent color, text color, or custom color
- **Adjustable dimensions**: Control cursor width and height with precision sliders
- **Live preview**: See your changes in real-time before applying them

### ⚡ **Smart Behavior**
- **Idle-only blinking**: Cursor stops blinking while you type for better focus
- **Configurable blink speed**: Adjust animation speed to your preference (200-2000ms)
- **Customizable idle delay**: Set how long to wait before cursor starts blinking after you stop typing
- **Accessibility support**: Respects `prefers-reduced-motion` system setting

### 🔧 **Settings**

All settings are accessible through **Settings → Custom Cursor Settings**:

#### Appearance
- **Style**: Choose between line, block, or underline cursor shapes
- **Color preset**:
  - Accent color (uses your theme's accent color - purple by default)
  - Text color (matches your theme's text color)
  - Custom color (pick any color you like)
- **Width**: Adjust thickness in pixels (1-10px)
- **Height**: Multiplier relative to line height (0.5-2.0x)

#### Behavior
- **Blink only when idle**: Toggle to stop cursor blinking while typing
- **Idle delay**: Time in milliseconds before cursor starts blinking after you stop typing (100-2000ms)
- **Blink speed**: Duration of one complete blink cycle in milliseconds (200-2000ms)

## Installation

### From Obsidian Community Plugins
1. Open **Settings → Community plugins**
2. Disable **Restricted mode**
3. Click **Browse** and search for "Custom Cursor"
4. Click **Install**, then **Enable**

### Manual Installation
1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/ksanrse/obsidian-custom-cursor/releases)
2. Create folder `VaultFolder/.obsidian/plugins/custom-cursor/`
3. Copy the downloaded files into this folder
4. Reload Obsidian
5. Enable the plugin in **Settings → Community plugins**

## Development

### Prerequisites
- Node.js v16 or higher
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/ksanrse/obsidian-custom-cursor.git

# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build
```

### Project Structure
```
obsidian-custom-cursor/
├── main.ts                 # Plugin entry point and lifecycle
├── src/
│   ├── caret-extension.ts  # CodeMirror 6 custom cursor implementation
│   ├── settings.ts         # Settings interface and defaults
│   └── settings-tab.ts     # Settings UI with live preview
├── styles.css              # Plugin styles (cursor and UI)
└── manifest.json           # Plugin metadata
```

### Testing
For local development:
1. Build the plugin with `npm run dev`
2. Copy `main.js`, `styles.css`, and `manifest.json` to your test vault:
   ```
   <TestVault>/.obsidian/plugins/custom-cursor/
   ```
3. Reload Obsidian and enable the plugin

## Technical Details

### Architecture
- **CodeMirror 6 Integration**: Uses ViewPlugin for rendering custom cursor widgets at caret positions
- **CSS Variables**: Dynamic styling through CSS custom properties for instant updates
- **Settings Persistence**: Uses Obsidian's native `loadData()`/`saveData()` API
- **Performance Optimized**:
  - Viewport-based rendering (only renders visible cursors)
  - Cached cursor positions to minimize rebuilds
  - Reusable widget instances for memory efficiency

### Browser Compatibility
- Fully compatible with Obsidian desktop (Windows, macOS, Linux)
- Mobile support (iOS, Android)
- No external dependencies

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**ksanrse**
- GitHub: [@ksanrse](https://github.com/ksanrse)

## Acknowledgments

- Built with [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Powered by [CodeMirror 6](https://codemirror.net/6/)

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/ksanrse/obsidian-custom-cursor/issues)
- 💡 Suggesting new features

---

Made with ❤️ for the Obsidian community
