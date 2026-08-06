# @signal-tools/cssom

Signal-driven utilities for constructible stylesheets and the CSS Object Model, built on
[`@signal-tools/signal`](https://github.com/signal-tools/signal).

```shell
npm install @signal-tools/signal @signal-tools/cssom
```

```js
import { Signal } from "@signal-tools/signal";
import { bindStyleProperty, createStyleSheet } from "@signal-tools/cssom";

const color = new Signal.State("rebeccapurple");
const sheet = createStyleSheet(":root {}");
const rule = sheet.cssRules[0];
const dispose = bindStyleProperty(rule.style, "--accent", color);

color.set("tomato");

dispose();
sheet.dispose();
```

Initial values are applied synchronously and subsequent signal changes are batched onto the next microtask. Disposing a
binding stops future writes without undoing its latest CSSOM state.

Effect scheduling is provided by `@signal-tools/effect`; both packages share the consumer's peer-installed
`@signal-tools/signal` instance.

Adoption is function-based: use `toggleStyleSheet`, `acquireStyleSheet`, and `releaseStyleSheet`. The
stylesheet itself only owns CSS text binding through `with()` and `dispose()`.

## License

[MIT-0](LICENSE.md) — No attribution required.
