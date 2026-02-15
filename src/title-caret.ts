import type { CustomCursorSettings } from "./settings";

const TITLE_SELECTOR = ".inline-title[contenteditable='true']";

type CaretSize = {
	width: number;
	height: number;
};

export class InlineTitleCaretManager {
	private readonly caretEl: HTMLSpanElement;
	private readonly disposers: Array<() => void> = [];
	private activeTitle: HTMLElement | null = null;
	private isComposing = false;
	private isIdle = false;
	private idleTimeout: number | null = null;
	private rafId: number | null = null;

	private readonly onFocusIn = (event: Event): void => {
		const title = this.getTitleFromTarget(event.target);
		if (title) {
			this.setActiveTitle(title);
			this.markActivity();
			this.requestRender();
		}
	};

	private readonly onFocusOut = (): void => {
		window.setTimeout(() => {
			this.syncActiveTitleFromSelection();
			this.requestRender();
		}, 0);
	};

	private readonly onSelectionChange = (): void => {
		const previousTitle = this.activeTitle;
		this.syncActiveTitleFromSelection();

		if (this.activeTitle && previousTitle === this.activeTitle) {
			this.markActivity();
		}

		this.requestRender();
	};

	private readonly onUserActivity = (): void => {
		if (!this.activeTitle || this.isComposing) return;
		this.markActivity();
		this.requestRender();
	};

	private readonly onCompositionStart = (event: Event): void => {
		const title = this.getTitleFromTarget(event.target);
		if (!title) return;

		this.setActiveTitle(title);
		this.isComposing = true;
		title.classList.add("custom-cursor-ime-active");
		this.applyNativeTitleCaretState();
		this.clearIdleTimeout();

		if (this.isIdle) {
			this.isIdle = false;
		}

		this.requestRender();
	};

	private readonly onCompositionEnd = (event: Event): void => {
		const title = this.getTitleFromTarget(event.target);
		if (!title) return;

		this.setActiveTitle(title);
		this.isComposing = false;
		title.classList.remove("custom-cursor-ime-active");
		this.applyNativeTitleCaretState();
		this.markActivity();
		this.requestRender();
	};

	constructor(private readonly getSettings: () => CustomCursorSettings) {
		document.body.classList.add("custom-cursor-plugin-enabled");

		this.caretEl = document.createElement("span");
		this.caretEl.className = "custom-title-caret custom-title-caret-hidden";
		this.caretEl.setAttribute("aria-hidden", "true");
		document.body.appendChild(this.caretEl);

		this.bindEvents();
		this.syncActiveTitleFromSelection();
		this.scheduleIdleCheck();
		this.requestRender();
	}

	refresh(): void {
		this.applyNativeTitleCaretState();
		this.scheduleIdleCheck();
		this.requestRender();
	}

	destroy(): void {
		this.clearIdleTimeout();

		if (this.rafId !== null) {
			window.cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		this.setActiveTitle(null);

		for (const dispose of this.disposers) {
			dispose();
		}
		this.disposers.length = 0;

		this.caretEl.remove();
		document.body.classList.remove("custom-cursor-plugin-enabled");
	}

	private bindEvents(): void {
		this.addListener(document, "focusin", this.onFocusIn, true);
		this.addListener(document, "focusout", this.onFocusOut, true);
		this.addListener(document, "selectionchange", this.onSelectionChange);
		this.addListener(document, "keydown", this.onUserActivity, true);
		this.addListener(document, "input", this.onUserActivity, true);
		this.addListener(document, "pointerdown", this.onUserActivity, true);
		this.addListener(window, "resize", this.requestRender);
		this.addListener(window, "scroll", this.requestRender, true);
		this.addListener(document, "compositionstart", this.onCompositionStart, true);
		this.addListener(document, "compositionend", this.onCompositionEnd, true);
	}

	private addListener(
		target: EventTarget,
		eventName: string,
		handler: EventListener,
		options?: boolean
	): void {
		target.addEventListener(eventName, handler, options);
		this.disposers.push(() => target.removeEventListener(eventName, handler, options));
	}

	private requestRender = (): void => {
		if (this.rafId !== null) return;

		this.rafId = window.requestAnimationFrame(() => {
			this.rafId = null;
			this.render();
		});
	};

	private render(): void {
		const selection = window.getSelection();

		if (
			!this.activeTitle ||
			!selection ||
			selection.rangeCount === 0 ||
			!selection.isCollapsed ||
			this.isComposing
		) {
			this.hideCaret();
			return;
		}

		const range = selection.getRangeAt(0);
		if (!this.activeTitle.contains(range.startContainer)) {
			this.hideCaret();
			return;
		}

		const rect = this.getCaretRect(range);
		if (!rect) {
			this.hideCaret();
			return;
		}

		const titleLineHeight = rect.height > 0 ? rect.height : this.getFallbackLineHeight(this.activeTitle);
		const baseLineHeight = this.getEditorBaseLineHeight();
		const effectiveLineHeight = Math.min(titleLineHeight, baseLineHeight);
		const { width, height } = this.getCaretSize(this.getSettings(), effectiveLineHeight);

		this.caretEl.style.left = `${rect.left}px`;
		this.caretEl.style.top = `${rect.bottom - height}px`;
		this.caretEl.style.width = `${width}px`;
		this.caretEl.style.height = `${height}px`;
		this.caretEl.classList.toggle("custom-title-caret-blink", this.shouldBlink());
		this.caretEl.classList.remove("custom-title-caret-hidden");
	}

	private hideCaret(): void {
		this.caretEl.classList.remove("custom-title-caret-blink");
		this.caretEl.classList.add("custom-title-caret-hidden");
	}

	private applyNativeTitleCaretState(): void {
		if (!this.activeTitle) return;
		const caretColor = this.isComposing ? "auto" : "transparent";
		this.activeTitle.style.setProperty("caret-color", caretColor, "important");
	}

	private clearNativeTitleCaretState(target: HTMLElement): void {
		target.style.removeProperty("caret-color");
	}

	private shouldBlink(): boolean {
		const settings = this.getSettings();
		return !settings.blinkOnlyWhenIdle || this.isIdle;
	}

	private getCaretRect(range: Range): DOMRect | null {
		const collapsedRange = range.cloneRange();
		collapsedRange.collapse(true);

		const rects = collapsedRange.getClientRects();
		const firstRect = rects.length > 0 ? rects.item(0) : null;
		if (firstRect && (firstRect.height > 0 || firstRect.width > 0)) {
			return firstRect;
		}

		const fallbackRect = collapsedRange.getBoundingClientRect();
		if (fallbackRect.height > 0 || fallbackRect.width > 0) {
			return fallbackRect;
		}

		return null;
	}

	private getFallbackLineHeight(element: HTMLElement): number {
		const computed = window.getComputedStyle(element);
		const lineHeight = Number.parseFloat(computed.lineHeight);
		if (Number.isFinite(lineHeight) && lineHeight > 0) {
			return lineHeight;
		}

		const fontSize = Number.parseFloat(computed.fontSize);
		if (Number.isFinite(fontSize) && fontSize > 0) {
			return fontSize * 1.2;
		}

		return 16;
	}

	private getEditorBaseLineHeight(): number {
		const content = document.querySelector<HTMLElement>(".cm-editor .cm-content");
		if (!content) {
			return 16;
		}

		return this.getFallbackLineHeight(content);
	}

	private getCaretSize(settings: CustomCursorSettings, lineHeight: number): CaretSize {
		const scaledHeight = Math.max(1, lineHeight * settings.cursorHeight);
		const blockWidth = Math.max(1, lineHeight * 0.6);

		switch (settings.cursorStyle) {
			case "block":
				return {
					width: blockWidth,
					height: scaledHeight,
				};
			case "underline":
				return {
					width: blockWidth,
					height: Math.max(1, settings.cursorWidth),
				};
			case "line":
			default:
				return {
					width: Math.max(1, settings.cursorWidth),
					height: scaledHeight,
				};
		}
	}

	private syncActiveTitleFromSelection(): void {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) {
			this.setActiveTitle(null);
			return;
		}

		const title = this.getTitleFromNode(selection.anchorNode);
		this.setActiveTitle(title);
	}

	private setActiveTitle(nextTitle: HTMLElement | null): void {
		if (this.activeTitle === nextTitle) return;

		if (this.activeTitle) {
			this.activeTitle.classList.remove("custom-cursor-title-active");
			this.activeTitle.classList.remove("custom-cursor-ime-active");
			this.clearNativeTitleCaretState(this.activeTitle);
		}

		this.activeTitle = nextTitle;
		this.isComposing = false;
		this.isIdle = false;

		if (this.activeTitle) {
			this.activeTitle.classList.add("custom-cursor-title-active");
			this.applyNativeTitleCaretState();
		}

		this.scheduleIdleCheck();
	}

	private getTitleFromTarget(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof Node)) {
			return null;
		}

		return this.getTitleFromNode(target);
	}

	private getTitleFromNode(node: Node | null): HTMLElement | null {
		if (!node) return null;

		const element = node instanceof HTMLElement ? node : node.parentElement;
		if (!element) return null;

		const title = element.closest(TITLE_SELECTOR);
		return title instanceof HTMLElement ? title : null;
	}

	private clearIdleTimeout(): void {
		if (this.idleTimeout !== null) {
			window.clearTimeout(this.idleTimeout);
			this.idleTimeout = null;
		}
	}

	private markActivity(): void {
		const settings = this.getSettings();
		if (!settings.blinkOnlyWhenIdle || !this.activeTitle || this.isComposing) {
			if (this.isIdle) {
				this.isIdle = false;
			}
			this.scheduleIdleCheck();
			return;
		}

		if (this.isIdle) {
			this.isIdle = false;
		}

		this.scheduleIdleCheck();
	}

	private scheduleIdleCheck(): void {
		this.clearIdleTimeout();

		const settings = this.getSettings();
		if (!settings.blinkOnlyWhenIdle || !this.activeTitle || this.isComposing) {
			if (this.isIdle) {
				this.isIdle = false;
				this.requestRender();
			}
			return;
		}

		const idleDelay = Math.max(0, settings.idleDelay);
		this.idleTimeout = window.setTimeout(() => {
			this.idleTimeout = null;

			if (!this.activeTitle || this.isComposing || this.isIdle) {
				return;
			}

			this.isIdle = true;
			this.requestRender();
		}, idleDelay);
	}
}
