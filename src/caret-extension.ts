import { type Extension, RangeSetBuilder, type SelectionRange } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import type { CustomCursorSettings } from "./settings";

/**
 * Widget that renders the custom cursor at the caret position
 */
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

// Reuse widget instances for performance
const CARET_WIDGET = new CaretWidget();
const CARET_WIDGET_BLINK = new CaretWidget("custom-caret-anchor blink");

/**
 * Creates the CodeMirror ViewPlugin that manages custom cursor rendering
 * @param getSettings - Function to get current settings (allows dynamic updates)
 */
function createCaretPlugin(getSettings: () => CustomCursorSettings) {
	return ViewPlugin.fromClass(
		class {
			deco: DecorationSet = Decoration.none;
			private lastCursorHeads: number[] = [];
			private lastInViewport: boolean = false;
			private isIdle: boolean = false;
			private isComposing: boolean = false;
			private idleTimeout: number | null = null;
			private lastActivityTime: number = Date.now();

			private readonly onCompositionStart = () => {
				if (this.isComposing) return;
				this.isComposing = true;
				this.isIdle = false;
				this.clearIdleTimeout();
				this.view.dom.classList.add("custom-cursor-ime-active");
				this.applyNativeCaretState();
				this.deco = this.build();
				this.view.update([]);
			};

			private readonly onCompositionEnd = () => {
				if (!this.isComposing) return;
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

			/**
			 * Forces native caret visibility state with inline !important styles.
			 * This prevents external themes/snippets from overriding caret hiding.
			 */
			private applyNativeCaretState() {
				const nativeVisible = this.isComposing;
				const caretColor = nativeVisible ? "auto" : "transparent";
				const layerOpacity = nativeVisible ? "1" : "0";
				const layerVisibility = nativeVisible ? "visible" : "hidden";

				this.view.contentDOM.style.setProperty("caret-color", caretColor, "important");
				this.view.dom.style.setProperty("caret-color", caretColor, "important");

				const cursorLayers = this.view.dom.querySelectorAll<HTMLElement>(".cm-cursorLayer");
				cursorLayers.forEach((layer) => {
					layer.style.setProperty("opacity", layerOpacity, "important");
					layer.style.setProperty("visibility", layerVisibility, "important");
				});
			}

			private clearNativeCaretState() {
				this.view.contentDOM.style.removeProperty("caret-color");
				this.view.dom.style.removeProperty("caret-color");

				const cursorLayers = this.view.dom.querySelectorAll<HTMLElement>(".cm-cursorLayer");
				cursorLayers.forEach((layer) => {
					layer.style.removeProperty("opacity");
					layer.style.removeProperty("visibility");
				});
			}

			/**
			 * Clears pending idle timeout, if any
			 */
			private clearIdleTimeout() {
				if (this.idleTimeout !== null) {
					window.clearTimeout(this.idleTimeout);
					this.idleTimeout = null;
				}
			}

			/**
			 * Schedules a one-shot idle check instead of constant polling
			 */
			private scheduleIdleCheck() {
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

				const delay = Math.max(0, settings.idleDelay);
				this.idleTimeout = window.setTimeout(() => {
					this.idleTimeout = null;
					if (this.isComposing || this.isIdle) return;
					this.isIdle = true;
					this.deco = this.build();
					this.view.update([]);
				}, delay);
			}

			/**
			 * Marks user activity (typing) to reset idle timer
			 */
			private markActivity() {
				this.lastActivityTime = Date.now();
				if (this.isIdle) {
					this.isIdle = false;
					this.deco = this.build();
				}
				this.scheduleIdleCheck();
			}

			/**
			 * Caches current cursor positions for optimization
			 */
			private updateCursorCache() {
				this.lastCursorHeads = this.view.state.selection.ranges
					.filter(r => r.empty)
					.map(r => r.head);

				const viewport = this.view.viewport;
				this.lastInViewport = this.lastCursorHeads.some(
					head => head >= viewport.from - 1 && head <= viewport.to + 1
				);
			}

			/**
			 * Checks if cursor positions have changed
			 * @returns true if cursors are in the same positions
			 */
			private cursorsEqual(ranges: readonly SelectionRange[]): boolean {
				const currentHeads = ranges.filter(r => r.empty).map(r => r.head);

				if (currentHeads.length !== this.lastCursorHeads.length) {
					return false;
				}

				for (let i = 0; i < currentHeads.length; i++) {
					if (currentHeads[i] !== this.lastCursorHeads[i]) {
						return false;
					}
				}

				return true;
			}

			/**
			 * Called on editor updates - optimized to minimize rebuilds
			 */
			update(update: ViewUpdate) {
				const settings = getSettings();
				this.applyNativeCaretState();

				// Track typing activity for idle detection
				if (update.docChanged && settings.blinkOnlyWhenIdle && !this.isComposing) {
					this.markActivity();
				}

				// Settings may change without editor transactions; keep idle mode synced.
				if (!settings.blinkOnlyWhenIdle && this.isIdle) {
					this.isIdle = false;
					this.deco = this.build();
				}

				// Early exit: nothing changed
				if (!update.selectionSet && !update.docChanged && !update.viewportChanged) {
					return;
				}

				const newRanges = update.state.selection.ranges;
				const cursorsUnchanged = this.cursorsEqual(newRanges);

				// Optimization: viewport scrolled but cursors didn't move
				if (update.viewportChanged && !update.selectionSet && !update.docChanged && cursorsUnchanged) {
					const viewport = this.view.viewport;
					const currentInViewport = this.lastCursorHeads.some(
						head => head >= viewport.from - 1 && head <= viewport.to + 1
					);

					// If visibility state didn't change, skip rebuild
					if (currentInViewport === this.lastInViewport) {
						return;
					}

					// Update visibility cache and rebuild
					this.lastInViewport = currentInViewport;
					this.deco = this.build();
					return;
				}

				// Optimization: cursors didn't move and viewport didn't change
				if (!update.viewportChanged && cursorsUnchanged) {
					return;
				}

				// Rebuild decorations and update cache
				this.deco = this.build();
				this.updateCursorCache();
			}

			/**
			 * Builds decoration set with cursor widgets at caret positions
			 * Only renders cursors within viewport for performance
			 */
			build(): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();
				const viewport = this.view.viewport;
				const settings = getSettings();

				// Choose widget based on blink settings and idle state
				const shouldBlink = !settings.blinkOnlyWhenIdle || this.isIdle;
				const widget = shouldBlink ? CARET_WIDGET_BLINK : CARET_WIDGET;
				const side = settings.cursorStyle === "block" ? -1 : 1;

				// Let IME/mobile composition use the native caret.
				if (this.isComposing) {
					return Decoration.none;
				}

				// Add cursor widget at each caret position (if in viewport)
				for (const range of this.view.state.selection.ranges) {
					if (!range.empty) continue; // Skip selections, only show at carets

					const head = range.head;

					// Skip if outside viewport (with small buffer)
					if (head < viewport.from - 1 || head > viewport.to + 1) {
						continue;
					}

					builder.add(
						head,
						head,
						Decoration.widget({ widget, side })
					);
				}

				return builder.finish();
			}

			/**
			 * Cleanup on plugin unload
			 */
			destroy() {
				this.clearIdleTimeout();
				this.view.dom.classList.remove("custom-cursor-ime-active");
				this.view.dom.classList.remove("custom-cursor-enabled");
				this.view.dom.removeEventListener("compositionstart", this.onCompositionStart);
				this.view.dom.removeEventListener("compositionend", this.onCompositionEnd);
				this.clearNativeCaretState();
			}
		},
		{ decorations: (instance) => instance.deco }
	);
}

/**
 * Creates the CodeMirror extension for custom cursor rendering
 * @param getSettings - Function to retrieve current settings
 * @returns CodeMirror extension array
 */
export function createCaretExtension(getSettings: () => CustomCursorSettings): Extension[] {
	return [createCaretPlugin(getSettings)];
}
