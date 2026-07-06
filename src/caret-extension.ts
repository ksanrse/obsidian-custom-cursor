import { type Extension } from "@codemirror/state";
import { type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { Platform } from "obsidian";
import type { CustomCursorSettings } from "./settings";

const IS_ANDROID = Platform.isAndroidApp;

function createCaretPlugin(getSettings: () => CustomCursorSettings) {
	return ViewPlugin.fromClass(
		class {
			private isIdle = false;
			private isComposing = false;
			private idleTimeout: number | null = null;

			private readonly onCompositionStart = () => {
				if (IS_ANDROID || this.isComposing) return;
				this.isComposing = true;
				this.setIdle(false);
				this.clearIdleTimeout();
				this.view.dom.classList.add("custom-cursor-ime-active");
			};

			private readonly onCompositionEnd = () => {
				if (IS_ANDROID || !this.isComposing) return;
				this.isComposing = false;
				this.view.dom.classList.remove("custom-cursor-ime-active");
				this.markActivity();
			};

			constructor(readonly view: EditorView) {
				this.view.dom.classList.add("custom-cursor-enabled");
				this.view.dom.addEventListener("compositionstart", this.onCompositionStart);
				this.view.dom.addEventListener("compositionend", this.onCompositionEnd);
				this.scheduleIdleCheck();
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.selectionSet || update.focusChanged) {
					this.markActivity();
					return;
				}

				if (!getSettings().blinkOnlyWhenIdle && this.isIdle) {
					this.setIdle(false);
					this.clearIdleTimeout();
				}
			}

			destroy(): void {
				this.clearIdleTimeout();
				this.view.dom.classList.remove(
					"custom-cursor-enabled",
					"custom-cursor-idle",
					"custom-cursor-ime-active"
				);
				this.view.dom.removeEventListener("compositionstart", this.onCompositionStart);
				this.view.dom.removeEventListener("compositionend", this.onCompositionEnd);
			}

			private markActivity(): void {
				if (this.isComposing) return;
				this.setIdle(false);
				this.scheduleIdleCheck();
			}

			private scheduleIdleCheck(): void {
				this.clearIdleTimeout();

				const settings = getSettings();
				if (!settings.blinkOnlyWhenIdle || this.isComposing) return;

				this.idleTimeout = window.setTimeout(() => {
					this.idleTimeout = null;
					if (!this.isComposing) {
						this.setIdle(true);
					}
				}, Math.max(0, settings.idleDelay));
			}

			private setIdle(next: boolean): void {
				if (this.isIdle === next) return;
				this.isIdle = next;
				this.view.dom.classList.toggle("custom-cursor-idle", next);
			}

			private clearIdleTimeout(): void {
				if (this.idleTimeout === null) return;
				window.clearTimeout(this.idleTimeout);
				this.idleTimeout = null;
			}
		}
	);
}

export function createCaretExtension(getSettings: () => CustomCursorSettings): Extension[] {
	return [createCaretPlugin(getSettings)];
}
