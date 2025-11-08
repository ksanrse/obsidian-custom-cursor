import { Plugin } from "obsidian";
import { createCaretExtension } from "./src/caret-extension";
import { CustomCursorSettingTab } from "./src/settings-tab";
import { DEFAULT_SETTINGS, type CustomCursorSettings } from "./src/settings";

export default class CustomCursorPlugin extends Plugin {
	settings: CustomCursorSettings;
	private editorExtension: any;

	async onload() {
		await this.loadSettings();

		// Create and register editor extension with settings
		this.editorExtension = createCaretExtension(this.settings);
		this.registerEditorExtension(this.editorExtension);

		// Add settings tab
		this.addSettingTab(new CustomCursorSettingTab(this.app, this));

		// Add CSS for cursor
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
		const { cursorColor, cursorWidth, cursorHeight, cursorStyle, blinkSpeed } = this.settings;

		// Remove old style element if it exists
		const oldStyle = document.getElementById("custom-cursor-styles");
		if (oldStyle) {
			oldStyle.remove();
		}

		// Create new style element
		const styleEl = document.createElement("style");
		styleEl.id = "custom-cursor-styles";

		let cursorCss = "";
		switch (cursorStyle) {
			case "line":
				cursorCss = `
					width: ${cursorWidth}px;
					height: calc(1em * ${cursorHeight});
				`;
				break;
			case "block":
				cursorCss = `
					width: 0.6em;
					height: calc(1em * ${cursorHeight});
				`;
				break;
			case "underline":
				cursorCss = `
					width: 0.6em;
					height: ${cursorWidth}px;
					bottom: 0;
				`;
				break;
		}

		styleEl.textContent = `
			.custom-caret-anchor::after {
				content: '';
				position: absolute;
				left: 0;
				top: 0;
				background-color: ${cursorColor};
				${cursorCss}
				pointer-events: none;
				z-index: 1000;
			}

			.custom-caret-anchor.blink::after {
				animation: custom-cursor-blink ${blinkSpeed}ms infinite;
			}

			@keyframes custom-cursor-blink {
				0%, 49% { opacity: 1; }
				50%, 100% { opacity: 0; }
			}

			/* Preview styles */
			.custom-cursor-preview-wrapper {
				margin-top: 10px;
				padding: 20px;
				background: var(--background-secondary);
				border-radius: 5px;
			}

			.custom-cursor-preview {
				position: relative;
				padding: 20px;
				font-size: 16px;
				line-height: 1.5;
			}

			.custom-cursor-preview-text {
				display: inline-block;
			}

			.custom-cursor-preview-cursor {
				position: absolute;
				display: inline-block;
				margin-left: 2px;
				top: 20px;
			}

			.custom-cursor-preview-note {
				margin-top: 15px;
				font-size: 12px;
				color: var(--text-muted);
				font-style: italic;
			}

			@keyframes cursor-blink {
				0%, 49% { opacity: 1; }
				50%, 100% { opacity: 0; }
			}
		`;

		document.head.appendChild(styleEl);
	}

	onunload() {
		const styleEl = document.getElementById("custom-cursor-styles");
		if (styleEl) {
			styleEl.remove();
		}
	}
}
