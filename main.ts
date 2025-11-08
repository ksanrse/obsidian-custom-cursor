import { Plugin } from "obsidian";
import { createCaretExtension } from "./src/caret-extension";
import { CustomCursorSettingTab } from "./src/settings-tab";
import { DEFAULT_SETTINGS, type CustomCursorSettings } from "./src/settings";

export default class CustomCursorPlugin extends Plugin {
	settings: CustomCursorSettings;
	private editorExtension: any;

	async onload() {
		await this.loadSettings();

		// Create and register editor extension with settings getter
		this.editorExtension = createCaretExtension(() => this.settings);
		this.registerEditorExtension(this.editorExtension);

		// Add settings tab
		this.addSettingTab(new CustomCursorSettingTab(this.app, this));

		// Apply cursor styles
		this.updateCursorStyles();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateCursorStyles();
	}

	updateCursorStyles() {
		const { colorPreset, cursorColor, cursorWidth, cursorHeight, cursorStyle, blinkSpeed } = this.settings;

		// Update CSS variables for cursor styling
		const root = document.documentElement;

		// Determine color based on preset
		let finalColor: string;
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

		root.style.setProperty("--custom-cursor-color", finalColor);
		root.style.setProperty("--custom-cursor-blink-speed", `${blinkSpeed}ms`);

		// Calculate dimensions based on cursor style
		let width: string;
		let height: string;

		switch (cursorStyle) {
			case "line":
				width = `${cursorWidth}px`;
				height = `calc(1em * ${cursorHeight})`;
				break;
			case "block":
				width = "0.6em";
				height = `calc(1em * ${cursorHeight})`;
				break;
			case "underline":
				width = "0.6em";
				height = `${cursorWidth}px`;
				break;
			default:
				width = `${cursorWidth}px`;
				height = `calc(1em * ${cursorHeight})`;
		}

		root.style.setProperty("--custom-cursor-width", width);
		root.style.setProperty("--custom-cursor-height", height);
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
