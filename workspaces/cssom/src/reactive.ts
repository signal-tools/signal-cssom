import { effect } from "@signal-tools/effect";
import { Signal } from "@signal-tools/signal";

/** Stops a reactive CSSOM binding. Disposal does not undo its latest write. */
export type Dispose = () => void;

/** A static value or a TC39 Signal state/computed value. */
export type Watchable<T> = T | ReadableSignal<T>;

export interface ReadableSignal<T> {
	get(): T;
}

/** A value accepted by {@link CSSStyleDeclaration.setProperty}. Nullish values remove the property. */
export type StyleValue = string | number | CSSStyleValue | null | undefined;

/** A CSS declaration priority. */
export type StylePriority = "" | "important";

/** A CSSOM rule exposing a declaration block. */
export interface StyleRule {
	readonly style: CSSStyleDeclaration;
}

const noop = (): void => {};

const isSignal = <T>(value: Watchable<T>): value is ReadableSignal<T> =>
	Signal.isState(value) || Signal.isComputed(value);

const read = <T>(value: Watchable<T>): T => (isSignal(value) ? value.get() : value);

/**
 * Applies a value immediately and reapplies it after signal changes.
 *
 * Signal writes in the same turn are batched into one update on the next microtask.
 */
export const bind = <T>(value: Watchable<T>, update: (value: T) => void): Dispose => {
	if (isSignal(value)) return effect(() => update(value.get()));

	update(value);
	return noop;
};

/** Replaces a stylesheet's text whenever the source signal changes. */
export const bindStyleSheet = (sheet: CSSStyleSheet, cssText: Watchable<string>): Dispose =>
	bind(cssText, (value) => sheet.replaceSync(value));

/** Sets or removes one CSS declaration whenever its value or priority changes. */
export const bindStyleProperty = (
	style: CSSStyleDeclaration,
	property: string,
	value: Watchable<StyleValue>,
	priority: Watchable<StylePriority> = "",
): Dispose => {
	const update = ([nextValue, nextPriority]: readonly [StyleValue, StylePriority]): void => {
		if (nextValue === null || nextValue === undefined) style.removeProperty(property);
		else style.setProperty(property, String(nextValue), nextPriority);
	};

	if (isSignal(value) || isSignal(priority)) return effect(() => update([read(value), read(priority)] as const));

	update([value, priority]);
	return noop;
};

/** Binds a set of CSS declarations and returns one disposer for the complete set. */
export const bindStyleProperties = (
	style: CSSStyleDeclaration,
	properties: Readonly<Record<string, Watchable<StyleValue>>>,
): Dispose => {
	const disposers = Object.entries(properties).map(([property, value]) => bindStyleProperty(style, property, value));
	let disposed = false;

	return () => {
		if (disposed) return;

		disposed = true;
		for (const dispose of disposers) dispose();
	};
};

/** Binds declarations on a CSS rule such as a style, font-face, or page rule. */
export const bindStyleRule = (rule: StyleRule, properties: Readonly<Record<string, Watchable<StyleValue>>>): Dispose =>
	bindStyleProperties(rule.style, properties);
