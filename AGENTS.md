# Obsidian community plugin

## Project overview

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- **Actual file structure for this plugin**:
  ```
  obsidian-custom-cursor/
  ├── main.ts                 # Plugin entry point and lifecycle
  ├── src/
  │   ├── caret-extension.ts  # CodeMirror 6 custom cursor implementation
  │   ├── settings.ts         # Settings interface and defaults
  │   └── settings-tab.ts     # Settings UI with live preview
  ├── styles.css              # Plugin styles (cursor and UI)
  ├── manifest.json           # Plugin metadata
  └── esbuild.config.mjs      # Build configuration
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## CodeMirror 6 integration

This plugin uses CodeMirror 6 to render custom cursors. Key patterns:

- **ViewPlugin**: Use for rendering decorations at caret positions
- **WidgetType**: Create reusable widget instances for performance
- **Dynamic settings**: Pass settings getter (`() => settings`) instead of static value for real-time updates
- **Viewport optimization**: Only render decorations within visible viewport
- **CSS variables**: Use for dynamic styling that updates without plugin reload

**Pattern for settings-aware CodeMirror extension**:
```ts
// Pass settings getter, not the settings object itself
this.registerEditorExtension(
  createCaretExtension(() => this.settings)
);
```

This allows the extension to access latest settings without recreating the extension.

## Common tasks

### Organize code with CodeMirror integration

**main.ts** (actual implementation):
```ts
import { Plugin } from "obsidian";
import { CustomCursorSettings, DEFAULT_SETTINGS } from "./src/settings";
import { CustomCursorSettingTab } from "./src/settings-tab";
import { createCaretExtension } from "./src/caret-extension";

export default class CustomCursorPlugin extends Plugin {
  settings: CustomCursorSettings;

  async onload() {
    await this.loadSettings();

    // Register CodeMirror extension with settings getter
    this.registerEditorExtension(
      createCaretExtension(() => this.settings)
    );

    // Add settings tab
    this.addSettingTab(new CustomCursorSettingTab(this.app, this));

    // Apply initial styles
    this.updateCursorStyles();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateCursorStyles();
  }

  private updateCursorStyles() {
    const root = document.documentElement;
    root.style.setProperty("--custom-cursor-color", this.getResolvedColor());
    root.style.setProperty("--custom-cursor-width", this.getCursorDimensions().width);
    root.style.setProperty("--custom-cursor-height", this.getCursorDimensions().height);
    root.style.setProperty("--custom-cursor-blink-speed", `${this.settings.blinkSpeed}ms`);
  }
}
```

**settings.ts** (actual implementation):
```ts
export interface CustomCursorSettings {
  colorPreset: "accent" | "text" | "custom";
  cursorColor: string;
  cursorWidth: number;
  cursorHeight: number;
  cursorStyle: "block" | "line" | "underline";
  blinkSpeed: number;
  blinkOnlyWhenIdle: boolean;
  idleDelay: number;
}

export const DEFAULT_SETTINGS: CustomCursorSettings = {
  colorPreset: "accent",
  cursorColor: "#528BFF",
  cursorWidth: 2,
  cursorHeight: 1.2,
  cursorStyle: "line",
  blinkSpeed: 1000,
  blinkOnlyWhenIdle: true,
  idleDelay: 500,
};
```

### Use CSS variables for dynamic styling

Apply settings changes instantly without recreating CodeMirror extensions:

```ts
// In main.ts
private updateCursorStyles() {
  const root = document.documentElement;
  root.style.setProperty("--custom-cursor-color", this.getResolvedColor());
  root.style.setProperty("--custom-cursor-width", `${this.settings.cursorWidth}px`);
  root.style.setProperty("--custom-cursor-height", `${this.settings.cursorHeight}em`);
  root.style.setProperty("--custom-cursor-blink-speed", `${this.settings.blinkSpeed}ms`);
}
```

```css
/* In styles.css */
:root {
  --custom-cursor-color: #528BFF;
  --custom-cursor-width: 2px;
  --custom-cursor-height: 1.2em;
  --custom-cursor-blink-speed: 1000ms;
}

.custom-caret-anchor::after {
  background-color: var(--custom-cursor-color);
  width: var(--custom-cursor-width);
  height: var(--custom-cursor-height);
  animation: custom-cursor-blink var(--custom-cursor-blink-speed) infinite;
}
```

### Implement idle detection for smart behavior

Track user activity to change behavior when idle:

```ts
// In ViewPlugin class
private isIdle: boolean = false;
private lastActivityTime: number = Date.now();

private startIdleTracking() {
  const IDLE_CHECK_INTERVAL = 100; // ms

  const checkIdle = () => {
    const settings = getSettings();
    if (!settings.blinkOnlyWhenIdle) return;

    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;
    const wasIdle = this.isIdle;
    this.isIdle = timeSinceActivity >= settings.idleDelay;

    // If idle state changed, rebuild decorations
    if (wasIdle !== this.isIdle) {
      this.deco = this.build();
      this.view.update([]);
    }
  };

  this.idleTimeout = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL);
}

update(update: ViewUpdate) {
  // Track typing activity
  if (update.docChanged && settings.blinkOnlyWhenIdle) {
    this.lastActivityTime = Date.now();
    if (this.isIdle) {
      this.isIdle = false;
      this.deco = this.build();
    }
  }
}
```

### Optimize with viewport-based rendering

Only render decorations within visible viewport:

```ts
build(): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const viewport = this.view.viewport;

  for (const range of this.view.state.selection.ranges) {
    if (!range.empty) continue; // Skip selections

    const head = range.head;

    // Skip if outside viewport (with small buffer)
    if (head < viewport.from - 1 || head > viewport.to + 1) {
      continue;
    }

    builder.add(head, head, Decoration.widget({ widget, side: 1 }));
  }

  return builder.finish();
}
```

### Create settings tab with live preview

```ts
// In settings-tab.ts
private updatePreview(): void {
  const { colorPreset, cursorColor, cursorWidth, cursorHeight, cursorStyle, blinkSpeed } =
    this.plugin.settings;

  // Determine color based on preset
  let finalColor: string;
  const root = document.documentElement;
  switch (colorPreset) {
    case "accent":
      finalColor = getComputedStyle(root).getPropertyValue("--interactive-accent").trim();
      break;
    case "text":
      finalColor = getComputedStyle(root).getPropertyValue("--text-normal").trim();
      break;
    case "custom":
    default:
      finalColor = cursorColor;
      break;
  }

  // Apply styles to preview cursor
  cursor.setAttribute("style", `
    background-color: ${finalColor};
    animation: custom-cursor-blink ${blinkSpeed}ms infinite;
    width: ${cursorStyle === "line" ? cursorWidth : "0.6em"}px;
    height: ${cursorStyle === "underline" ? cursorWidth : `calc(1em * ${cursorHeight})`}px;
  `);
}
```

### Persist settings

```ts
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
  this.updateCursorStyles(); // Apply changes immediately
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
