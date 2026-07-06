import { type Extension, RangeSetBuilder, type SelectionRange } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { Platform } from "obsidian";
import type { CustomCursorSettings } from "./settings";

const IS_ANDROID = Platform.isAndroidApp;

class CaretWidget extends WidgetType {
	constructor(readonly cssClass = "custom-caret-anchor") {
		super();
	}

	toDOM(): HTMLElement {
		const anchor = document.createElement("span");
		anchor.className = this.cssClass;
		anchor.setAttribute("aria-hidden", "true");
		return anchor;
	}

	ignoreEvent(): boolean {
		return true;
	}

	eq(other: WidgetType): boolean {
		return other instanceof CaretWidget && other.cssClass === this.cssClass;
	}
}

const CARET_WIDGET = new CaretWidget();
const CARET_WIDGET_BLINK = new CaretWidget("custom-caret-anchor blink");

function createCaretPlugin(getSettings: () => CustomCursorSettings) {
	return ViewPlugin.fromClass(
		class {
			deco: DecorationSet = Decoration.none;
			private lastCursorHeads: number[] = [];
			private lastInViewport = false;
			private isIdle = false;
			private isComposing = false;
			private idleTimeout: number | null = null;

			private readonly onCompositionStart = () => {
				if (IS_ANDROID || this.isComposing) return;
				this.isComposing = true;
				this.isIdle = false;
				this.clearIdleTimeout();
				this.view.dom.classList.add("custom-cursor-ime-active");
				this.applyNativeCaretState();
				this.deco = this.build();
				this.view.update([]);
			};

			private readonly onCompositionEnd = () => {
				if (IS_ANDROID || !this.isComposing) return;
				this.isComposing = false;
				this.view.dom.classList.remove("custom-cursor-ime-active");
				this.applyNativeCaretState();
				this.markActivity();
				this.scheduleIdleCheck();
			};

			constructor(readonly view: EditorView) {
				this.view.dom.classList.add("custom-cursor-enabled");
				this.view.dom.addEventListener("compositionstart", this.onCompositionStart);
				this.view.dom.addEventListener("compositionend", this.onCompositionEnd);
				this.applyNativeCaretState();
				this.deco = this.build();
				this.updateCursorCache();
				this.scheduleIdleCheck();
			}

			update(update: ViewUpdate): void {
				const settings = getSettings();
				this.applyNativeCaretState();
				const focusChanged = update.focusChanged;

				if (update.docChanged && settings.blinkOnlyWhenIdle && !this.isComposing) {
					this.markActivity();
				}

				if (!settings.blinkOnlyWhenIdle && this.isIdle) {
					this.isIdle = false;
					this.deco = this.build();
				}

				if (!update.selectionSet && !update.docChanged && !update.viewportChanged && !focusChanged) {
					return;
				}

				if (focusChanged) {
					this.deco = this.build();
					this.updateCursorCache();
					return;
				}

				const newRanges = update.state.selection.ranges;
				const cursorsUnchanged = this.cursorsEqual(newRanges);

				if (update.viewportChanged && !update.selectionSet && !update.docChanged && cursorsUnchanged) {
					const viewport = this.view.viewport;
					const currentInViewport = this.lastCursorHeads.some(
						head => head >= viewport.from - 1 && head <= viewport.to + 1
					);

					if (currentInViewport === this.lastInViewport) return;

					this.lastInViewport = currentInViewport;
					this.deco = this.build();
					return;
				}

				if (!update.viewportChanged && cursorsUnchanged) return;

				this.deco = this.build();
				this.updateCursorCache();
			}

			build(): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();
				const viewport = this.view.viewport;
				const settings = getSettings();
				const shouldBlink = !settings.blinkOnlyWhenIdle || this.isIdle;
				const widget = shouldBlink ? CARET_WIDGET_BLINK : CARET_WIDGET;
				const side = settings.cursorStyle === "block" ? -1 : 1;

				if (!IS_ANDROID && this.isComposing) return Decoration.none;
				if (!this.view.hasFocus) return Decoration.none;

				for (const range of this.view.state.selection.ranges) {
					if (!range.empty) continue;
					const head = range.head;
					if (head < viewport.from - 1 || head > viewport.to + 1) continue;
					builder.add(head, head, Decoration.widget({ widget, side }));
				}

				return builder.finish();
			}

			destroy(): void {
				this.clearIdleTimeout();
				this.view.dom.classList.remove("custom-cursor-ime-active");
				this.view.dom.classList.remove("custom-cursor-enabled");
				this.view.dom.removeEventListener("compositionstart", this.onCompositionStart);
				this.view.dom.removeEventListener("compositionend", this.onCompositionEnd);
				this.clearNativeCaretState();
			}

			private applyNativeCaretState(): void {
				const nativeVisible = !IS_ANDROID && this.isComposing;
				const caretColor = nativeVisible ? "auto" : "transparent";
				const layerOpacity = nativeVisible ? "1" : "0";
				const layerVisibility = nativeVisible ? "visible" : "hidden";

				this.view.contentDOM.style.setProperty("caret-color", caretColor, "important");
				this.view.dom.style.setProperty("caret-color", caretColor, "important");

				this.view.dom.querySelectorAll<HTMLElement>(".cm-cursorLayer").forEach((layer) => {
					layer.style.setProperty("opacity", layerOpacity, "important");
					layer.style.setProperty("visibility", layerVisibility, "important");
				});
			}

			private clearNativeCaretState(): void {
				this.view.contentDOM.style.removeProperty("caret-color");
				this.view.dom.style.removeProperty("caret-color");

				this.view.dom.querySelectorAll<HTMLElement>(".cm-cursorLayer").forEach((layer) => {
					layer.style.removeProperty("opacity");
					layer.style.removeProperty("visibility");
				});
			}

			private clearIdleTimeout(): void {
				if (this.idleTimeout === null) return;
				window.clearTimeout(this.idleTimeout);
				this.idleTimeout = null;
			}

			private scheduleIdleCheck(): void {
				const settings = getSettings();
				this.clearIdleTimeout();

				if (!settings.blinkOnlyWhenIdle || this.isComposing) {
					if (this.isIdle) {
						this.isIdle = false;
						this.deco = this.build();
						this.view.update([]);
					}
					return;
				}

				this.idleTimeout = window.setTimeout(() => {
					this.idleTimeout = null;
					if (this.isComposing || this.isIdle) return;
					this.isIdle = true;
					this.deco = this.build();
					this.view.update([]);
				}, Math.max(0, settings.idleDelay));
			}

			private markActivity(): void {
				if (this.isIdle) {
					this.isIdle = false;
					this.deco = this.build();
				}
				this.scheduleIdleCheck();
			}

			private updateCursorCache(): void {
				this.lastCursorHeads = this.view.state.selection.ranges
					.filter(r => r.empty)
					.map(r => r.head);

				const viewport = this.view.viewport;
				this.lastInViewport = this.lastCursorHeads.some(
					head => head >= viewport.from - 1 && head <= viewport.to + 1
				);
			}

			private cursorsEqual(ranges: readonly SelectionRange[]): boolean {
				const currentHeads = ranges.filter(r => r.empty).map(r => r.head);
				if (currentHeads.length !== this.lastCursorHeads.length) return false;

				for (let i = 0; i < currentHeads.length; i++) {
					if (currentHeads[i] !== this.lastCursorHeads[i]) return false;
				}

				return true;
			}
		},
		{ decorations: (instance) => instance.deco }
	);
}

export function createCaretExtension(getSettings: () => CustomCursorSettings): Extension[] {
	return [createCaretPlugin(getSettings)];
}
