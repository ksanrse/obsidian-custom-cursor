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

const caretPlugin = ViewPlugin.fromClass(
	class {
		deco: DecorationSet = Decoration.none;

		constructor(readonly view: EditorView) {
			this.deco = this.build();
		}

		update(update: ViewUpdate) {
			if (
				update.selectionSet ||
				update.docChanged ||
				update.viewportChanged
			) {
				this.deco = this.build();
			}
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
					Decoration.widget({ widget: new CaretWidget(), side: 1 })
				);
			}

			return builder.finish();
		}
	},
	{ decorations: (instance) => instance.deco }
);

export const caretExtension: Extension[] = [caretPlugin];

export function caretRect(view: EditorView) {
	const head = view.state.selection.main.head;
	return view.coordsAtPos(head);
}
