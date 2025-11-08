/**
 * Custom Cursor Plugin Settings Interface
 */
export interface CustomCursorSettings {
	/** Color preset: accent (theme color), text (text color), or custom */
	colorPreset: "accent" | "text" | "custom";

	/** Custom color value (hex) - used when colorPreset is "custom" */
	cursorColor: string;

	/** Cursor width in pixels (for line style) or underline height */
	cursorWidth: number;

	/** Cursor height multiplier relative to line height (0.5-2.0) */
	cursorHeight: number;

	/** Visual style of the cursor */
	cursorStyle: "block" | "line" | "underline";

	/** Blink animation duration in milliseconds */
	blinkSpeed: number;

	/** Whether cursor should only blink when idle (not typing) */
	blinkOnlyWhenIdle: boolean;

	/** Delay in ms before cursor starts blinking after becoming idle */
	idleDelay: number;
}

/**
 * Default plugin settings
 */
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
