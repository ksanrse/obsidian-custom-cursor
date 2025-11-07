import { Plugin } from "obsidian";
import { caretExtension } from "./src/caret-extension";

export default class MyPlugin extends Plugin {
	async onload() {
		this.registerEditorExtension(caretExtension);
	}
}
