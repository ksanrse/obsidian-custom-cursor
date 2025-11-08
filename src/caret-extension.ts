import { type Extension, RangeSetBuilder } from "@codemirror/state";
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
			private idleTimeout: number | null = null;
			private lastActivityTime: number = Date.now();

			constructor(readonly view: EditorView) {
				this.deco = this.build();
				this.updateCursorCache();
				this.startIdleTracking();
			}

			/**
			 * Starts tracking user activity to determine idle state
			 * Checks every 100ms if user has been inactive
			 */
			private startIdleTracking() {
				const IDLE_CHECK_INTERVAL = 100; // ms

				const checkIdle = () => {
					const settings = getSettings();

					// If feature is disabled, ensure we're not in idle state
					if (!settings.blinkOnlyWhenIdle) {
						if (this.isIdle) {
							this.isIdle = false;
							this.deco = this.build();
						}
						return;
					}

					const now = Date.now();
					const timeSinceActivity = now - this.lastActivityTime;

					const wasIdle = this.isIdle;
					this.isIdle = timeSinceActivity >= settings.idleDelay;

					// If idle state changed, rebuild decorations
					if (wasIdle !== this.isIdle) {
						this.deco = this.build();
						this.view.update([]);
					}
				};

				this.idleTimeout = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL);
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
			private cursorsEqual(ranges: readonly any[]): boolean {
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

				// Track typing activity for idle detection
				if (update.docChanged && settings.blinkOnlyWhenIdle) {
					this.markActivity();
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
						Decoration.widget({ widget, side: 1 })
					);
				}

				return builder.finish();
			}

			/**
			 * Cleanup on plugin unload
			 */
			destroy() {
				if (this.idleTimeout !== null) {
					window.clearInterval(this.idleTimeout);
					this.idleTimeout = null;
				}
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
