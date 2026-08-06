import { Signal } from "@signal-tools/signal";
import { expect, it } from "vitest";

import { createStyleSheet } from "../workspaces/cssom/src/index.js";

const flush = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

it("creates a stylesheet from watchable CSS text", async () => {
	const color = new Signal.State("red");
	const cssText = new Signal.Computed(() => `a { color: ${color.get()}; }`);
	const sheet = createStyleSheet(cssText);

	expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("red");

	color.set("blue");
	await flush();

	expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("blue");

	sheet.dispose();
	color.set("green");
	await flush();

	expect((sheet.cssRules[0] as CSSStyleRule).style.color).toBe("blue");
});
