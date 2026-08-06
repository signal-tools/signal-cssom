# @signal-tools/cssom

Signal-driven utilities for constructible stylesheets and the CSS Object Model, built on
[`@signal-tools/signal`](https://github.com/signal-tools/signal).

```shell
npm install @signal-tools/signal @signal-tools/cssom
```

## Usage

```js
import { Signal } from "@signal-tools/signal";
import { bindStyleRule, css } from "@signal-tools/cssom";

const accent = new Signal.State("rebeccapurple");
const sheet = css`:host { color: ${accent}; }`;

document.adoptedStyleSheets.push(sheet);
accent.set("tomato");

const rule = sheet.cssRules[0];
const dispose = bindStyleRule(rule, {
	opacity: new Signal.State(0.8),
});

dispose();
sheet.dispose();
```

Initial values are written synchronously. Signal changes are batched and written on the next microtask. Every binding
returns a disposer; disposal stops future writes without undoing the latest CSSOM state.

The package uses `@signal-tools/effect` for scheduling. Both packages resolve the consumer's peer-installed
`@signal-tools/signal` instance.

## API

- `createStyleSheet` constructs a stylesheet from static or signal-backed CSS text and owns its reactive disposer.
- `css` creates a `StyleSheet` from a template whose interpolations may be signals.
- `bindStyleSheet` reacts by replacing a complete stylesheet.
- `bindStyleProperty` reacts by setting or removing one declaration.
- `bindStyleProperties` and `bindStyleRule` bind declaration maps.
- `bind` is the low-level primitive for other CSSOM fields.
- `getStyleRoot`, `toggleStyleSheet`, `acquireStyleSheet`, and `releaseStyleSheet` manage constructed-sheet adoption.

## Migration

Stylesheet adoption is now exclusively function-based. Replace `sheet.adopt(node)`, `sheet.evict(node)`,
`sheet.acquire(node)`, `sheet.release(node)`, and `sheet.toggle(node)` with the corresponding exported
`toggleStyleSheet`, `acquireStyleSheet`, and `releaseStyleSheet` functions. `StyleSheet.with()` and
`sheet.dispose()` remain the lifecycle APIs for reactive CSS text. Replace `new StyleSheet(cssText)` with
`createStyleSheet(cssText)`; the returned object is a native `CSSStyleSheet` with `with()` and `dispose()` methods.

## License

[MIT-0](workspaces/cssom/LICENSE.md) — No attribution required.
