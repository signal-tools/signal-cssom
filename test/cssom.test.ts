import { Signal } from "@signal-tools/signal";
import { describe, expect, it } from "vitest";

import {
	acquireStyleSheet,
	bindStyleProperty,
	bindStyleRule,
	bindStyleSheet,
	createStyleSheet,
	css,
	releaseStyleSheet,
	toggleStyleSheet,
} from "../workspaces/cssom/src/index.js";

const flush = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

describe("reactive CSSOM bindings", () => {
	it("replaces complete stylesheet text and stops after disposal", async () => {
		const color = new Signal.State("red");
		const sheet = new CSSStyleSheet();
		const dispose = bindStyleSheet(sheet, new Signal.Computed(() => `a { color: ${color.get()}; }`));

		expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("red");

		color.set("blue");
		await flush();
		expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("blue");

		dispose();
		color.set("green");
		await flush();
		expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("blue");
	});

	it("sets, prioritizes, and removes individual properties", async () => {
		const value = new Signal.State<string | null>("grid");
		const priority = new Signal.State<"" | "important">("important");
		const style = document.createElement("div").style;
		const dispose = bindStyleProperty(style, "display", value, priority);

		expect(style.getPropertyValue("display")).toBe("grid");
		expect(style.getPropertyPriority("display")).toBe("important");

		value.set(null);
		await flush();
		expect(style.getPropertyValue("display")).toBe("");

		dispose();
	});

	it("binds multiple declarations on a style rule", async () => {
		const color = new Signal.State("red");
		const sheet = new CSSStyleSheet();
		sheet.replaceSync("a {}");
		const rule = sheet.cssRules[0] as CSSStyleRule;
		const dispose = bindStyleRule(rule, { color, opacity: 0.5 });

		expect(rule.style.color).toBe("red");
		expect(rule.style.opacity).toBe("0.5");

		color.set("blue");
		await flush();
		expect(rule.style.color).toBe("blue");

		dispose();
	});
});

describe("StyleSheet", () => {
	it("reacts to CSS template interpolation signals", async () => {
		const color = new Signal.State("red");
		const sheet = css`a { color: ${color}; }`;

		expect(sheet).toBeInstanceOf(CSSStyleSheet);
		expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("red");

		color.set("blue");
		await flush();
		expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("blue");

		sheet.dispose();
	});

	it("adopts, acquires, releases, and evicts without duplicate sheets", () => {
		const initialSheets = document.adoptedStyleSheets;
		const sheet = createStyleSheet("a {}");
		const node = document.body;

		try {
			expect(toggleStyleSheet(sheet, node, true)).toBe(true);
			expect(toggleStyleSheet(sheet, node, true)).toBe(true);
			expect(document.adoptedStyleSheets.filter((candidate) => candidate === sheet)).toHaveLength(1);
			expect(toggleStyleSheet(sheet, node, false)).toBe(false);

			expect(acquireStyleSheet(sheet, node)).toBe(true);
			expect(acquireStyleSheet(sheet, node)).toBe(false);
			expect(document.adoptedStyleSheets).toContain(sheet);

			document.adoptedStyleSheets = document.adoptedStyleSheets.filter((candidate) => candidate !== sheet);
			expect(acquireStyleSheet(sheet, node)).toBe(false);
			expect(document.adoptedStyleSheets).toContain(sheet);

			expect(releaseStyleSheet(sheet, node)).toBe(true);
			expect(releaseStyleSheet(sheet, node)).toBe(false);
			expect(document.adoptedStyleSheets).not.toContain(sheet);
		} finally {
			document.adoptedStyleSheets = initialSheets;
			sheet.dispose();
		}
	});
});
