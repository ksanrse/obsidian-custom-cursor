import { Plugin } from "obsidian";
import type { Extension } from "@codemirror/state";
import { createCaretExtension } from "./src/caret-extension";
import { InlineTitleCaretManager } from "./src/title-caret";
import { CustomCursorSettingTab } from "./src/settings-tab";
import { DEFAULT_SETTINGS, type CustomCursorSettings } from "./src/settings";

/**
 * Custom Cursor Plugin for Obsidian
 * Allows users to customize the appearance and behavior of the text cursor
 */
export default class CustomCursorPlugin extends Plugin {
	settings: CustomCursorSettings;
	private editorExtension: Extension[];
	private inlineTitleCaretManager: InlineTitleCaretManager | null = null;

	async onload() {
		await this.loadSettings();

		// Register CodeMirror extension with dynamic settings access
		this.editorExtension = createCaretExtension(() => this.settings);
		this.registerEditorExtension(this.editorExtension);

		// Register settings tab
		this.addSettingTab(new CustomCursorSettingTab(this.app, this));

		// Apply initial cursor styles
		this.updateCursorStyles();

		// Apply custom cursor behavior to editable note title (inline-title)
		this.inlineTitleCaretManager = new InlineTitleCaretManager(() => this.settings);
		this.register(() => {
			this.inlineTitleCaretManager?.destroy();
			this.inlineTitleCaretManager = null;
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateCursorStyles();
		this.inlineTitleCaretManager?.refresh();
	}

	/**
	 * Updates CSS variables that control cursor appearance
	 * Called on settings change and plugin load
	 * Public method to ensure it can be called from settings tab
	 */
	public updateCursorStyles() {
		const root = document.documentElement;

		// Apply color (from preset or custom)
		const finalColor = this.getResolvedColor();
		root.style.setProperty("--custom-cursor-color", finalColor);

		// Apply blink speed
		root.style.setProperty("--custom-cursor-blink-speed", `${this.settings.blinkSpeed}ms`);

		// Apply dimensions based on cursor style
		const { width, height } = this.getCursorDimensions();
		root.style.setProperty("--custom-cursor-width", width);
		root.style.setProperty("--custom-cursor-height", height);
	}

	/**
	 * Resolves the final cursor color based on the selected preset
	 * @returns CSS color value
	 */
	private getResolvedColor(): string {
		const { colorPreset, cursorColor } = this.settings;

		switch (colorPreset) {
			case "accent": {
				// Check body element for CSS variables (where Obsidian defines them)
				const body = document.body;
				const accentColor = getComputedStyle(body).getPropertyValue("--interactive-accent").trim();
				return accentColor || cursorColor;
			}
			case "text": {
				// Use --text-normal
				const body = document.body;
				const textColor = getComputedStyle(body).getPropertyValue("--text-normal").trim();
				return textColor || cursorColor;
			}
			case "custom":
			default:
				return cursorColor;
		}
	}

	/**
	 * Calculates cursor dimensions based on style and settings
	 * @returns Object with width and height CSS values
	 */
	private getCursorDimensions(): { width: string; height: string } {
		const { cursorStyle, cursorWidth, cursorHeight } = this.settings;

		switch (cursorStyle) {
			case "line":
				return {
					width: `${cursorWidth}px`,
					height: `calc(1em * ${cursorHeight})`,
				};
			case "block":
				return {
					width: "0.6em",
					height: `calc(1em * ${cursorHeight})`,
				};
			case "underline":
				return {
					width: "0.6em",
					height: `${cursorWidth}px`,
				};
			default:
				return {
					width: `${cursorWidth}px`,
					height: `calc(1em * ${cursorHeight})`,
				};
		}
	}

	onunload() {
		// Clean up CSS variables
		const root = document.documentElement;
		root.style.removeProperty("--custom-cursor-color");
		root.style.removeProperty("--custom-cursor-width");
		root.style.removeProperty("--custom-cursor-height");
		root.style.removeProperty("--custom-cursor-blink-speed");
	}
}
