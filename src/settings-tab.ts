import { App, PluginSettingTab, Setting } from "obsidian";
import type CustomCursorPlugin from "../main";
import type { CustomCursorSettings } from "./settings";

/**
 * Settings tab for Custom Cursor plugin
 * Provides UI for configuring cursor appearance and behavior
 */
export class CustomCursorSettingTab extends PluginSettingTab {
	plugin: CustomCursorPlugin;
	private previewContainer: HTMLElement;

	constructor(app: App, plugin: CustomCursorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Renders the settings interface
	 * Organized into sections: Preview, Appearance, and Behavior
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.addClass("custom-cursor-settings-container");

		this.createPreviewSection(containerEl);
		this.createAppearanceSection(containerEl);
		this.createBehaviorSection(containerEl);
	}

	/**
	 * Creates the Appearance settings section
	 * Controls cursor style, color, and dimensions
	 */
	private createAppearanceSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });
		new Setting(section).setName("Appearance").setHeading();
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

	/**
	 * Creates the Behavior settings section
	 * Controls cursor blinking and idle behavior
	 */
	private createBehaviorSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });
		new Setting(section).setName("Behavior").setHeading();
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
					.setTooltip("Line: thin vertical bar; block: filled box; underline: horizontal bar")
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
					.setTooltip("Restore default color")
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

	/**
	 * Creates the live preview section at the top of settings
	 */
	private createPreviewSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "custom-cursor-settings-section" });

		const previewSetting = new Setting(section)
			.setName("Live preview")
			.setDesc("See how your cursor will look with the current settings");

		const previewWrapper = previewSetting.controlEl.createDiv({
			cls: "custom-cursor-preview-wrapper",
		});

		this.previewContainer = previewWrapper.createDiv({
			cls: "custom-cursor-preview",
		});

		this.updatePreview();
	}

	/**
	 * Updates the preview cursor to reflect current settings
	 * Called whenever settings change
	 */
	private updatePreview(): void {
		if (!this.previewContainer) return;

		const { blinkOnlyWhenIdle, idleDelay } = this.plugin.settings;

		// Clear previous content
		this.previewContainer.empty();

		// Create text line with cursor - use identical structure to real cursor
		const textLine = this.previewContainer.createDiv({
			cls: "custom-cursor-preview-line",
		});

		// Text before cursor
		textLine.createSpan({ text: "The quick brown fox jumps over the lazy d" });

		// Cursor - use EXACTLY the same class as real cursor
		textLine.createSpan({
			cls: "custom-caret-anchor blink",
		});

		// Text after cursor
		textLine.createSpan({ text: "og" });

		// Add subtle hint about blink behavior
		if (blinkOnlyWhenIdle) {
			this.previewContainer.createEl("div", {
				cls: "custom-cursor-preview-hint",
				text: `Cursor stops blinking while typing (${idleDelay}ms idle delay)`,
			});
		}
	}
}
