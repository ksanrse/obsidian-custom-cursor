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
