import { Signal } from "@signal-tools/signal";

import { bindStyleSheet, type Dispose, type ReadableSignal, type Watchable } from "./reactive.js";

/** Represents a document or shadow root that can adopt stylesheets. */
export type StyleRoot = Document | ShadowRoot;

/** A value accepted in a {@link css} template interpolation. */
export type CSSValue =
	| string
	| number
	| boolean
	| CSSRule
	| CSSRuleList
	| CSSStyleDeclaration
	| CSSStyleSheet
	| CSSStyleValue
	| null
	| undefined;

const noop = (): void => {};
const adoptions = new WeakMap<CSSStyleSheet, Map<StyleRoot, Set<Node>>>();

/** A constructed stylesheet that owns its reactive CSS text binding. */
export interface StyleSheet extends CSSStyleSheet {
	/** Stops this stylesheet from reacting to its current CSS text signal. */
	dispose(): void;

	/** Replaces this stylesheet's text now and after subsequent signal changes. */
	with(cssText: Watchable<string>): this;
}

/** Creates a constructed stylesheet whose CSS text may be driven by a signal. */
export const createStyleSheet = (cssText: Watchable<string> = ""): StyleSheet => {
	const sheet = new CSSStyleSheet() as StyleSheet;
	let dispose: Dispose = noop;

	sheet.dispose = () => {
		dispose();
		dispose = noop;
	};
	sheet.with = (cssText) => {
		dispose();
		dispose = bindStyleSheet(sheet, cssText);

		return sheet;
	};

	return sheet.with(cssText);
};

/** Creates a signal-aware stylesheet from a CSS template literal. */
export const css = (strings: TemplateStringsArray, ...values: Array<Watchable<CSSValue>>): StyleSheet => {
	const hasSignals = values.some(isSignal);
	const serializeTemplate = () =>
		String.raw(strings, ...values.map((value) => serialize(isSignal(value) ? (value.get() as CSSValue) : value)));

	return createStyleSheet(hasSignals ? new Signal.Computed(serializeTemplate) : serializeTemplate());
};

/** Returns the document or shadow root that can adopt stylesheets for a node. */
export const getStyleRoot = (node: Node): StyleRoot | null => {
	const root = node.getRootNode();

	return root instanceof Document || root instanceof ShadowRoot ? root : null;
};

/** Toggles a stylesheet on a node's root and returns whether it is adopted afterward. */
export const toggleStyleSheet = (sheet: CSSStyleSheet, node: Node, force?: boolean): boolean => {
	const root = getStyleRoot(node);

	if (!root) return false;

	const sheets = root.adoptedStyleSheets;
	const isAdopted = sheets.includes(sheet);
	const willAdopt = force ?? !isAdopted;

	if (willAdopt !== isAdopted) {
		root.adoptedStyleSheets = willAdopt ? [...sheets, sheet] : sheets.filter((candidate) => candidate !== sheet);
	}

	return willAdopt;
};

/** Acquires a stylesheet for a node, adopting it while the root has one or more acquisitions. */
export const acquireStyleSheet = (sheet: CSSStyleSheet, node: Node): boolean => {
	const root = getStyleRoot(node);

	if (!root) return false;

	let roots = adoptions.get(sheet);

	if (!roots) adoptions.set(sheet, (roots = new Map()));

	let nodes = roots.get(root);

	if (!nodes) roots.set(root, (nodes = new Set()));

	const acquired = !nodes.has(node);
	nodes.add(node);
	toggleStyleSheet(sheet, root, true);

	return acquired;
};

/** Releases a node's acquisition, evicting the stylesheet after the root's final release. */
export const releaseStyleSheet = (sheet: CSSStyleSheet, node: Node): boolean => {
	const root = getStyleRoot(node);
	const roots = root && adoptions.get(sheet);
	const nodes = root && roots?.get(root);

	if (!root || !nodes?.delete(node)) return false;

	if (!nodes.size) {
		roots?.delete(root);
		toggleStyleSheet(sheet, root, false);
	}

	if (!roots?.size) adoptions.delete(sheet);

	return true;
};

const isSignal = <T>(value: Watchable<T>): value is ReadableSignal<T> =>
	Signal.isState(value) || Signal.isComputed(value);

const serialize = (value: CSSValue): string =>
	value instanceof CSSStyleSheet
		? serializeRuleList(value.cssRules)
		: value instanceof CSSRuleList
			? serializeRuleList(value)
			: value instanceof CSSRule || value instanceof CSSStyleDeclaration
				? value.cssText
				: String(value ?? "");

const serializeRuleList = (list: CSSRuleList): string => Array.from(list, (rule) => rule.cssText).join("\n");
