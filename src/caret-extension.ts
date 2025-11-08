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

// Reuse a single widget instance for performance
const CARET_WIDGET = new CaretWidget();
const CARET_WIDGET_BLINK = new CaretWidget("custom-caret-anchor blink");

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

			private startIdleTracking() {
				// Check idle state periodically
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

				// Check every 100ms
				this.idleTimeout = window.setInterval(checkIdle, 100);
			}

			private markActivity() {
				this.lastActivityTime = Date.now();
				if (this.isIdle) {
					this.isIdle = false;
					this.deco = this.build();
				}
			}

			private updateCursorCache() {
				this.lastCursorHeads = this.view.state.selection.ranges
					.filter(r => r.empty)
					.map(r => r.head);

				const viewport = this.view.viewport;
				this.lastInViewport = this.lastCursorHeads.some(
					head => head >= viewport.from - 1 && head <= viewport.to + 1
				);
			}

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

			update(update: ViewUpdate) {
				const settings = getSettings();

				// Mark activity on document changes (typing)
				if (update.docChanged && settings.blinkOnlyWhenIdle) {
					this.markActivity();
				}

				// Only rebuild if something actually changed
				if (!update.selectionSet && !update.docChanged && !update.viewportChanged) {
					return;
				}

				const newRanges = update.state.selection.ranges;

				// Check if cursor positions actually changed
				const cursorsUnchanged = this.cursorsEqual(newRanges);

				// Optimization: if only viewport changed but cursors didn't move
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

				// Fast path: if viewport didn't change and cursors are identical, skip rebuild
				if (!update.viewportChanged && cursorsUnchanged) {
					return;
				}

				// Rebuild decorations and update cache
				this.deco = this.build();
				this.updateCursorCache();
			}

			build(): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();
				const viewport = this.view.viewport;
				const settings = getSettings();

				// Determine which widget to use based on idle state
				const shouldBlink = !settings.blinkOnlyWhenIdle || this.isIdle;
				const widget = shouldBlink ? CARET_WIDGET_BLINK : CARET_WIDGET;

				for (const range of this.view.state.selection.ranges) {
					if (!range.empty) continue;
					const head = range.head;
					if (head < viewport.from - 1 || head > viewport.to + 1)
						continue;

					builder.add(
						head,
						head,
						Decoration.widget({ widget, side: 1 })
					);
				}

				return builder.finish();
			}

			destroy() {
				// Clean up idle tracking
				if (this.idleTimeout !== null) {
					window.clearInterval(this.idleTimeout);
					this.idleTimeout = null;
				}
			}
		},
		{ decorations: (instance) => instance.deco }
	);
}

export function createCaretExtension(getSettings: () => CustomCursorSettings): Extension[] {
	return [createCaretPlugin(getSettings)];
}
