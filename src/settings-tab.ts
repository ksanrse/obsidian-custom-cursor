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

		containerEl.addClass("custom-cursor-settings-container");
		containerEl.createEl("h2", { text: "Custom Cursor Settings" });

		// Preview Section
		this.createPreviewSection(containerEl);

		// Appearance Section
		this.createAppearanceSection(containerEl);

		// Behavior Section
		this.createBehaviorSection(containerEl);
	}

	private createAppearanceSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });
		section.createEl("h3", { text: "Appearance" });
		section.createDiv({
			cls: "custom-cursor-section-description",
			text: "Customize the visual appearance of your cursor",
		});

		this.addStyleSetting(section);
		this.addColorPresetSetting(section);
		if (this.plugin.settings.colorPreset === "custom") {
			this.addColorSetting(section);
		}
		this.addWidthSetting(section);
		this.addHeightSetting(section);
	}

	private createBehaviorSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });
		section.createEl("h3", { text: "Behavior" });
		section.createDiv({
			cls: "custom-cursor-section-description",
			text: "Control how your cursor behaves during editing",
		});

		this.addBlinkOnlyWhenIdleSetting(section);
		if (this.plugin.settings.blinkOnlyWhenIdle) {
			this.addIdleDelaySetting(section);
		}
		this.addBlinkSpeedSetting(section);
	}

	private addStyleSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Style")
			.setDesc("Choose the shape of your cursor (line, block, or underline)")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("line", "Line (vertical bar)")
					.addOption("block", "Block (filled rectangle)")
					.addOption("underline", "Underline (horizontal bar)")
					.setValue(this.plugin.settings.cursorStyle)
					.onChange(async (value) => {
						this.plugin.settings.cursorStyle = value as CustomCursorSettings["cursorStyle"];
						await this.plugin.saveSettings();
						this.updatePreview();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("info")
					.setTooltip("Line: thin vertical bar | Block: filled box | Underline: horizontal bar")
					.onClick(() => {})
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addColorPresetSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Color preset")
			.setDesc("Choose a color preset or use a custom color")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("accent", "Accent color (theme's accent color)")
					.addOption("text", "Text color (theme's text color)")
					.addOption("custom", "Custom color")
					.setValue(this.plugin.settings.colorPreset)
					.onChange(async (value) => {
						this.plugin.settings.colorPreset = value as CustomCursorSettings["colorPreset"];
						await this.plugin.saveSettings();
						this.updatePreview();
						this.display(); // Refresh to show/hide custom color picker
					})
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addColorSetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Color")
			.setDesc("Pick a color for your cursor to match your theme or preference")
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
					.setTooltip("Reset to default blue (#528BFF)")
					.onClick(async () => {
						this.plugin.settings.cursorColor = "#528BFF";
						await this.plugin.saveSettings();
						this.display();
					})
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addWidthSetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Width")
			.setDesc("Thickness of the cursor in pixels (affects line style and underline height)")
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
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addHeightSetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Height")
			.setDesc("Height multiplier relative to line height (1.0 = normal line height)")
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
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addBlinkOnlyWhenIdleSetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Blink only when idle")
			.setDesc(
				"Stop cursor blinking while typing for better visual focus. Cursor will resume blinking after you stop typing."
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.blinkOnlyWhenIdle).onChange(async (value) => {
					this.plugin.settings.blinkOnlyWhenIdle = value;
					await this.plugin.saveSettings();
					this.updatePreview();
					this.display(); // Refresh to show/hide idle delay setting
				})
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addIdleDelaySetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Idle delay")
			.setDesc(
				"How long to wait (in milliseconds) after you stop typing before the cursor starts blinking"
			)
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
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private addBlinkSpeedSetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Blink speed")
			.setDesc(
				"Duration of one complete blink cycle in milliseconds (lower = faster, higher = slower)"
			)
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
			)
			.settingEl.addClass("custom-cursor-setting");
	}

	private createPreviewSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });

		const previewSetting = new Setting(section)
			.setName("Live Preview")
			.setDesc("See how your cursor will look with the current settings");

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

		const { colorPreset, cursorColor, cursorWidth, cursorHeight, cursorStyle, blinkSpeed, blinkOnlyWhenIdle } =
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

		// Apply cursor styles based on settings
		let cursorCss = `
			background-color: ${finalColor};
			animation: custom-cursor-blink ${blinkSpeed}ms infinite;
			position: absolute;
		`;

		switch (cursorStyle) {
			case "line":
				cursorCss += `
					width: ${cursorWidth}px;
					height: calc(1em * ${cursorHeight});
					bottom: 0;
				`;
				break;
			case "block":
				cursorCss += `
					width: 0.6em;
					height: calc(1em * ${cursorHeight});
					bottom: 0;
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

		// Add informative notes
		let noteText = "";

		// Color preset info
		switch (colorPreset) {
			case "accent":
				noteText = "🎨 Using theme's accent color | ";
				break;
			case "text":
				noteText = "🎨 Using theme's text color | ";
				break;
			case "custom":
				noteText = `🎨 Custom color: ${finalColor} | `;
				break;
		}

		// Blink behavior info
		if (blinkOnlyWhenIdle) {
			noteText += `Cursor will stop blinking while you type and resume after ${this.plugin.settings.idleDelay}ms of inactivity`;
		} else {
			noteText += "Cursor will blink continuously, even while typing";
		}

		this.previewContainer.createEl("div", {
			cls: "custom-cursor-preview-note",
			text: noteText,
		});
	}
}
