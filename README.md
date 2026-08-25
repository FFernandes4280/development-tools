# JSON Make Pretty

A Vite-powered React project that packages a JSON formatter as a web component.

## Features

- JSON formatting and prettifying
- Built as a reusable web component via `@r2wc/react-to-web-component`
- Uses Monaco Editor for JSON editing support
- **Air-Gapped Operation:** Operates completely offline with zero dependency on external assets or CDNs.
- **Dynamic JSON Path Tracking:** Automatically computes the precise JSON/JavaScript object query path underneath the active cursor.

## Technical Details & Architecture

### 1. Local Monaco Integration (Blocking External Connections)
By default, `@monaco-editor/react` downloads its heavy core assets, themes, and background workers dynamically from public unpkg or cdnjs instances. To keep this component secure and deployable inside air-gapped environments or local firewalls, external requests are blocked entirely:
* **Local Loading Override:** The initialization pulls from local dependencies by assigning locally bundled assets into the configuration mechanism via `loader.config({ monaco })` inside `src/JsonMakePretty.jsx`.
* **Inline Worker Bundling:** Rather than pointing Monaco to external scripts for background processing loops, `src/web-components/entry.js` configures `window.MonacoEnvironment.getWorker`. It utilizes Vite's inline worker strategy (`?worker&inline`) to stitch the editor core and JSON-specific syntax workers into the final component distribution.

### 2. Shadow DOM CSS Isolation Management (`SafeWrapper`)
The web component relies on an open shadow boundary (`shadow: 'open'`) to prevent variable bleeding or style collusions with host layouts. However, this isolation strips away global cascading styles. Because Monaco Editor generates its operational nodes and interactive layout tokens via styles appended to the global header ecosystem, isolating it inside a Shadow DOM severely fragments theme layers, selection highlights, and line geometries.

The `SafeWrapper.jsx` module functions as an automated bridge to circumvent this limitation:
* **Shadow Root Discovery:** Upon structural initialization, it dynamically walks up node trees or hooks into reference hosts to map out the targeted `shadowRoot` context.
* **Programmatic Styling Injection:** It forces inline asset maps of Monaco's underlying UI rules (`editor.main.css?inline`) as well as local view rules (`JsonMakePretty.css?inline`) directly down into the isolated DOM root.
* **Resilient Injection Queue:** To safeguard scenarios where style compilation fires before the shadow element maps entirely, it tracks attachment flags and rolls out a staggered retry delay fallback loop.

### 3. Absolute 1D Character Offset Path Tokenizer
To output real-time object selection paths cleanly during active hover routines without lagging UI thread workflows, `src/tools/jsonTools.js` utilizes a custom high-performance tokenizer state machine:
* **Coordinate Reduction:** Monaco updates tracking states in 2D coordinates (Line and Column numbers), which are reduced down into a singular absolute 1D character pointer across the overall flat string payload.
* **Sequential Lookbehinds:** A specialized tokenization loop steps linearly character-by-character through structural JSON anchors (`{`, `}`, `[`, `]`, `,`, `:`, `"`) and tracks navigation history onto a internal indexing stack.
* **Zero-Parser Interception:** The moment the linear worker reaches the absolute 1D coordinate target, it dumps active trace paths from the context stack without spinning up overhead heavy JSON validation passes, returning valid query paths smoothly regardless of depth constraints.

## Project Structure

- `index.html` — Application entry page for deployed production outputs.
- `src/web-components/entry.js` — Bootstraps the `json-formatter` web component custom definition.
- `src/web-components/SafeWrapper.jsx` — Programmatic wrapper component managing style parsing within Shadow DOM roots.
- `src/tools/jsonTools.js` — Operational scripts handling prettifying and the absolute 1D object path tokenizer.
- `src/tools/domUtils.js` — Custom interaction layer hooks managing state buffers and pointer logic for Monaco.
- `vite.config.js` — Build configuration rules handling single-file compilation, web components, and inline worker constraints.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

