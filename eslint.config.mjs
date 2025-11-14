import { fixupPluginRules } from "@eslint/compat";
import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	{
		ignores: ["node_modules/", "main.js"],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: {
			obsidianmd: fixupPluginRules(obsidianmd),
		},
		rules: {
			...obsidianmd.configs.recommended.rules,
		},
	},
];
