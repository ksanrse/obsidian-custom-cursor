import { App, PluginSettingTab, Setting } from "obsidian";
import type CustomCursorPlugin from "../main";
import type { CustomCursorSettings } from "./settings";

export class CustomCursorSettingTab extends PluginSettingTab {
	plugin: CustomCursorPlugin;
	private previewContainer: HTMLElement;

	constructor(app: App, plugin: CustomCursorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Custom Cursor Settings" });

		// Preview Section
		this.createPreviewSection(containerEl);

		// Cursor Style
		new Setting(containerEl)
			.setName("Cursor style")
			.setDesc("Choose the cursor shape")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("line", "Line")
					.addOption("block", "Block")
					.addOption("underline", "Underline")
					.setValue(this.plugin.settings.cursorStyle)
					.onChange(async (value) => {
						this.plugin.settings.cursorStyle = value as CustomCursorSettings["cursorStyle"];
						await this.plugin.saveSettings();
						this.updatePreview();
					})
			);

		// Cursor Color
		new Setting(containerEl)
			.setName("Cursor color")
			.setDesc("Choose the cursor color")
			.addColorPicker((color) =>
				color.setValue(this.plugin.settings.cursorColor).onChange(async (value) => {
					this.plugin.settings.cursorColor = value;
					await this.plugin.saveSettings();
					this.updatePreview();
				})
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default")
					.onClick(async () => {
						this.plugin.settings.cursorColor = "#528BFF";
						await this.plugin.saveSettings();
						this.display();
					})
			);

		// Cursor Width
		new Setting(containerEl)
			.setName("Cursor width")
			.setDesc("Width of the cursor in pixels (1-10)")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 0.5)
					.setValue(this.plugin.settings.cursorWidth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.cursorWidth = value;
						await this.plugin.saveSettings();
						this.updatePreview();
					})
			);

		// Cursor Height
		new Setting(containerEl)
			.setName("Cursor height")
			.setDesc("Height multiplier relative to line height (0.5-2.0)")
			.addSlider((slider) =>
				slider
					.setLimits(0.5, 2.0, 0.1)
					.setValue(this.plugin.settings.cursorHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.cursorHeight = value;
						await this.plugin.saveSettings();
						this.updatePreview();
					})
			);

		// Blink only when idle
		new Setting(containerEl)
			.setName("Blink only when idle")
			.setDesc("Cursor will only blink when you're not typing")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.blinkOnlyWhenIdle).onChange(async (value) => {
					this.plugin.settings.blinkOnlyWhenIdle = value;
					await this.plugin.saveSettings();
					this.updatePreview();
					this.display(); // Refresh to show/hide idle delay setting
				})
			);

		// Idle delay (only shown if blink only when idle is enabled)
		if (this.plugin.settings.blinkOnlyWhenIdle) {
			new Setting(containerEl)
				.setName("Idle delay")
				.setDesc("Time to wait before cursor starts blinking (in milliseconds)")
				.addSlider((slider) =>
					slider
						.setLimits(100, 2000, 100)
						.setValue(this.plugin.settings.idleDelay)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.idleDelay = value;
							await this.plugin.saveSettings();
							this.updatePreview();
						})
				);
		}

		// Blink Speed
		new Setting(containerEl)
			.setName("Blink speed")
			.setDesc("Speed of cursor blinking in milliseconds (200-2000)")
			.addSlider((slider) =>
				slider
					.setLimits(200, 2000, 100)
					.setValue(this.plugin.settings.blinkSpeed)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.blinkSpeed = value;
						await this.plugin.saveSettings();
						this.updatePreview();
					})
			);
	}

	private createPreviewSection(containerEl: HTMLElement): void {
		const previewSetting = new Setting(containerEl)
			.setName("Preview")
			.setDesc("Live preview of your cursor settings");

		const previewWrapper = previewSetting.controlEl.createDiv({
			cls: "custom-cursor-preview-wrapper",
		});

		this.previewContainer = previewWrapper.createDiv({
			cls: "custom-cursor-preview",
		});

		this.updatePreview();
	}

	private updatePreview(): void {
		if (!this.previewContainer) return;

		const { cursorColor, cursorWidth, cursorHeight, cursorStyle, blinkSpeed, blinkOnlyWhenIdle } =
			this.plugin.settings;

		// Clear previous content
		this.previewContainer.empty();

		// Create preview text
		const previewText = this.previewContainer.createEl("div", {
			cls: "custom-cursor-preview-text",
			text: "Sample text with cursor",
		});

		// Create cursor element
		const cursor = this.previewContainer.createEl("span", {
			cls: "custom-cursor-preview-cursor",
		});

		// Apply cursor styles based on settings
		let cursorCss = `
			background-color: ${cursorColor};
			animation: cursor-blink ${blinkSpeed}ms infinite;
		`;

		switch (cursorStyle) {
			case "line":
				cursorCss += `
					width: ${cursorWidth}px;
					height: calc(1em * ${cursorHeight});
				`;
				break;
			case "block":
				cursorCss += `
					width: 0.6em;
					height: calc(1em * ${cursorHeight});
				`;
				break;
			case "underline":
				cursorCss += `
					width: 0.6em;
					height: ${cursorWidth}px;
					bottom: 0;
				`;
				break;
		}

		cursor.setAttribute("style", cursorCss);

		// Add note about idle blinking
		if (blinkOnlyWhenIdle) {
			this.previewContainer.createEl("div", {
				cls: "custom-cursor-preview-note",
				text: "Note: Cursor will only blink when idle (not typing)",
			});
		}
	}
}
