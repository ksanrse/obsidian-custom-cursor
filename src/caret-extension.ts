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

		constructor(readonly view: EditorView) {
			this.deco = this.build();
		}

		update(update: ViewUpdate) {
			// Only rebuild if something actually changed
			if (!update.selectionSet && !update.docChanged && !update.viewportChanged) {
				return;
			}

			// Check if cursor positions actually changed
			const oldRanges = update.startState.selection.ranges;
			const newRanges = update.state.selection.ranges;

			// Fast path: if viewport didn't change and selection structure is identical
			if (!update.viewportChanged && oldRanges.length === newRanges.length) {
				let positionsChanged = false;
				for (let i = 0; i < oldRanges.length; i++) {
					if (oldRanges[i].head !== newRanges[i].head || oldRanges[i].empty !== newRanges[i].empty) {
						positionsChanged = true;
						break;
					}
				}
				// If no cursor positions changed, skip rebuild
				if (!positionsChanged) {
					return;
				}
			}

			// Optimization for scroll: if only viewport changed but cursor didn't move
			if (update.viewportChanged && !update.selectionSet && !update.docChanged) {
				const newViewport = this.view.viewport;

				// Check if all cursor positions are outside the new viewport
				let anyInViewport = false;
				for (const range of newRanges) {
					if (!range.empty) continue;
					const head = range.head;
					if (head >= newViewport.from - 1 && head <= newViewport.to + 1) {
						anyInViewport = true;
						break;
					}
				}

				// If no decorations would be rendered, and we had no decorations before, skip rebuild
				if (!anyInViewport && this.deco.size === 0) {
					return;
				}
			}

			this.deco = this.build();
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
