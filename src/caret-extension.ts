import { type Extension, RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";

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

const caretPlugin = ViewPlugin.fromClass(
	class {
		deco: DecorationSet = Decoration.none;
		private lastCursorHeads: number[] = [];
		private lastInViewport: boolean = false;

		constructor(readonly view: EditorView) {
			this.deco = this.build();
			this.updateCursorCache();
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

			for (const range of this.view.state.selection.ranges) {
				if (!range.empty) continue;
				const head = range.head;
				if (head < viewport.from - 1 || head > viewport.to + 1)
					continue;

				builder.add(
					head,
					head,
					Decoration.widget({ widget: CARET_WIDGET, side: 1 })
				);
			}

			return builder.finish();
		}
	},
	{ decorations: (instance) => instance.deco }
);

export const caretExtension: Extension[] = [caretPlugin];
