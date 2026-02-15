# Custom Cursor for Obsidian

Custom Cursor is an Obsidian plugin that replaces the default caret with a configurable CodeMirror-based cursor.

## Key Features

- Cursor styles: `line`, `block`, `underline`
- Color modes: theme accent, theme text color, custom color
- Adjustable width, height, and blink speed
- Optional "blink only when idle" behavior with configurable idle delay
- Live preview in plugin settings

## Power Consumption Notice

This plugin renders a custom blinking cursor in the editor. Compared to a native caret, this can increase CPU/GPU usage and battery drain, especially on laptops and mobile devices. Use conservative blink settings if power efficiency is important.

## Installation

### Community Plugins

1. Open `Settings -> Community plugins`.
2. Disable `Restricted mode`.
3. Select `Browse`, find `Custom Cursor`, then install and enable it.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create `<Vault>/.obsidian/plugins/custom-cursor/`.
3. Place the files into that folder.
4. Reload Obsidian and enable the plugin in `Settings -> Community plugins`.

## Settings

Open `Settings -> Custom Cursor Settings`.

- `Style`: line, block, underline
- `Color preset`: accent, text, custom
- `Width`: `1-10px`
- `Height`: `0.5-2.0` line-height multiplier
- `Blink only when idle`: on/off
- `Idle delay`: `100-2000ms`
- `Blink speed`: `200-2000ms`

## CSS Variables

You can style the cursor from a theme or CSS snippet.

Plugin-managed variables (written by plugin settings):

- `--custom-cursor-color`
- `--custom-cursor-width`
- `--custom-cursor-height`
- `--custom-cursor-blink-speed`

Override variables (not written by the plugin, intended for theme/snippet control):

- `--custom-cursor-color-override`
- `--custom-cursor-width-override`
- `--custom-cursor-height-override`
- `--custom-cursor-blink-speed-override`

Example:

```css
:root {
	--custom-cursor-color-override: #ff4d4f;
	--custom-cursor-width-override: 3px;
	--custom-cursor-height-override: 1.15em;
	--custom-cursor-blink-speed-override: 700ms;
}
```

## Development

Prerequisites:

- Node.js 18+
- npm

Commands:

```bash
npm install
npm run dev
npm run build
```

## Compatibility

- Obsidian desktop: supported
- Obsidian mobile: supported
- External services: none

## License

MIT. See `LICENSE`.
