### Table of Contents

- [Overview](#overview)
- [1. Host integration & window.openai patterns](#1-host-integration--windowopenai-patterns)
- [2. Widget state, props, and data modeling](#2-widget-state-props-and-data-modeling)
- [3. Layout, responsiveness, and interaction patterns](#3-layout-responsiveness-and-interaction-patterns)
- [4. Build, assets, and dev experience](#4-build-assets-and-dev-experience)
- [5. Testing and debugging UX](#5-testing-and-debugging-ux)
- [6. Concrete next steps for gpt-hello-world](#6-concrete-next-steps-for-gpt-hello-world)

### Overview

This file compares **best-practice patterns** in `openai-apps-sdk-examples` with your `gpt-hello-world` app and calls out things the examples do that you either **don’t do at all** or only **partially** do. It’s explicitly focused on **actionable gaps**, not a generic recap of what you already know from `architecture.md`.

---

### 1. Host integration & `window.openai` patterns

- **Dedicated host-global hooks (`useWidgetState`, `useWidgetProps`)**
  - **Examples**: Implement `useWidgetState` and `useWidgetProps` (`src/use-widget-state.ts`, `src/use-widget-props.ts`) on top of `useOpenAiGlobal`:
    - `useWidgetState`:
      - Initializes local state from `window.openai.widgetState` if present.
      - Keeps local React state in sync with host updates via `useEffect`.
      - Writes back to the host by calling `window.openai.setWidgetState(newState)` inside the setter.
    - `useWidgetProps`:
      - Treats `toolOutput` as typed props, with an explicit, typed fallback for local dev / partial data.
  - **Hello-world**:
    - `ui/hooks.ts` defines `useOpenAiGlobal`, `useToolOutput`, `useToolInput`, `useTheme`, but **no** `useWidgetState` or `useWidgetProps`.
    - `ProductListWidget` reads `toolOutput` directly via `useToolOutput` and doesn’t use `widgetState` at all.
  - **Gap / risk**:
    - You have to hand-roll all host state plumbing per widget.
    - You’re not using host-persisted widget state as a first-class primitive, which limits cross-turn continuity for UI-only state (filters, selection, view toggles, etc.).

- **Systematic use of display-mode and max-height helpers**
  - **Examples**:
    - `useDisplayMode` and `useMaxHeight` read `displayMode` and `maxHeight` from `window.openai` via `useOpenAiGlobal`.
    - Widgets like `pizzaz-shop`:
      - Use `useMaxHeight` and set container styles (`maxHeight`, `height`) so the layout respects host constraints.
      - Switch layout (grid columns, side panel vs single-column) based on `displayMode` and fullscreen vs inline.
  - **Hello-world**:
    - `OpenAiGlobals` in `ui/hooks.ts` includes `displayMode` and `maxHeight`, but you don’t have convenience hooks or layout logic that actually responds to them.
    - `ProductListWidget` only uses `theme` to choose a Tailwind background; scroll behavior is fixed and not host-aware.
  - **Gap / risk**:
    - Widgets can overflow or feel cramped in different host display modes.
    - You’re not using an obvious lever (display mode) to adapt layouts for inline vs fullscreen vs PiP.

- **Breadth of `window.openai` API usage**
  - **Examples** (especially `kitchen-sink-lite`):
    - Exercise almost the full host API:
      - `callTool`, `requestDisplayMode`, `requestModal`, `sendFollowUpMessage`, `openExternal`, `notifyIntrinsicHeight`, and direct `widgetState` reads.
    - They:
      - Check for method existence and show friendly errors when not available.
      - Log host interactions for debugging.
  - **Hello-world**:
    - `ProductListWidget` only uses `window.openai.callTool` and does the bare minimum existence check.
    - No usage of `requestDisplayMode`, `requestModal`, `sendFollowUpMessage`, `openExternal`, or `notifyIntrinsicHeight`.
  - **Gap / risk**:
    - You’re leaving a lot of UX on the table (no host-driven modals, no display-mode requests, no follow-up message flows).
    - Debuggability of host interactions is weaker than in the examples.

---

### 2. Widget state, props, and data modeling

- **Host-synced widget state as the single source of truth**
  - **Examples** (`pizzaz-shop`):
    - `useWidgetState` is the backbone of the cart widget:
      - Local React state is always reconciled with host widget state (`widgetStateFromWindow`).
      - They merge host-driven state (`widgetProps.widgetState`, `widgetState.cartItems`) with defaults via functions like `mergeWithDefaultItems`.
      - They use equality helpers (`cartItemsEqual`, `nutritionFactsEqual`, etc.) to avoid unnecessary updates.
  - **Hello-world**:
    - Your architecture doc *describes* this pattern conceptually, but no widget in the repo actually uses `widgetState` in this disciplined way.
    - `ProductListWidget` treats all client state as purely local (alerts, etc.) and relies on tool calls + DB as the only durable state.
  - **Gap / risk**:
    - No reusable pattern for ephemeral-but-host-persisted UI state (e.g., selection, expanded sections, filters) that should survive re-renders / small context changes.
    - Every new widget would likely reinvent its own (worse) version of this synchronization logic.

- **Robust sanitization of host-provided data**
  - **Examples**:
    - `pizzaz-shop`:
      - When reading modal parameters and cart items, they:
        - Treat `view.params` as `unknown` and downcast with runtime checks.
        - Coerce numeric fields via `Number(...)` and validate with `Number.isFinite`.
        - Provide safe fallbacks when data is missing or malformed.
  - **Hello-world**:
    - `ProductListWidget` does some defensive work (try/catch when reading `toolOutput`, `Array.isArray` check), but stops well short of the level of sanitization in `pizzaz-shop`.
  - **Gap / risk**:
    - If the server or model ever sends slightly malformed `structuredContent`, the widget is more likely to break or silently behave oddly.

---

### 3. Layout, responsiveness, and interaction patterns

- **Layout that adapts to host view / fullscreen vs inline**
  - **Examples**:
    - `pizzaz-shop`:
      - Uses `displayMode`, `maxHeight`, and `view.mode` (`modal` vs normal) to:
        - Switch between “cart-only”, “checkout-only”, and split-layout views.
        - Dynamically compute grid columns (`gridColumnCount`) based on available width and fullscreen state.
        - Use `ResizeObserver` to keep the grid responsive as the widget’s container changes.
  - **Hello-world**:
    - `ProductListWidget` uses a fixed horizontal scroll layout with Tailwind but doesn’t:
      - Adjust density / layout based on display mode or height limits.
      - Recompute layout on resize beyond basic flexbox behavior.
  - **Gap / risk**:
    - UX is more brittle and less “ChatGPT-native”; it won’t feel as well integrated in different surface modes as the official examples do.

- **Richer, host-aware interaction flows**
  - **Examples**:
    - `pizzaz-shop`:
      - Uses `requestModal` with anchor rectangles so modals can originate from clicked elements in a visually coherent way.
      - Listens to `view.params` and `widgetState.state` to decide whether to show a cart item detail modal, cart summary modal, or full checkout.
      - Emits custom DOM events (`CustomEvent(CONTINUE_TO_PAYMENT_EVENT, { detail })`) so other parts of the system can react to widget actions.
  - **Hello-world**:
    - Interactions are strictly within the widget; the only host interaction is a fire-and-forget `callTool` for wishlist mutations.
  - **Gap / risk**:
    - You don’t have a pattern for multi-step flows that span:
      - Inline widget → modal detail → checkout-like views.
    - There is no eventing pattern to let other widgets or tools react to UI events.

---

### 4. Build, assets, and dev experience

- **Convention-based multi-entry build vs manual widget registration**
  - **Examples** (`vite.config.mts`):
    - Discover entrypoints with `fast-glob` (`src/**/index.{tsx,jsx}`) and build them all:
      - Each widget gets its own `index.tsx` entry and corresponding `.html`, `.js`, `.css` outputs.
    - Provide a `multiEntryDevEndpoints` plugin that:
      - Serves a simple index page listing all example widgets.
      - Auto-generates `/<name>.html`, `/<name>.js`, `/<name>.css` dev endpoints without manual config.
  - **Hello-world**:
    - `vite.config.ts` manually enumerates:
      - `wishlist.html`, `products-list.html`, `products-list.dev.html`, `todo-widget.html`.
    - No convention for new widgets; each new entry must be added and wired by hand.
  - **Gap / risk**:
    - Adding widgets is more error-prone and slower than necessary.
    - There’s no “gallery” index or auto-generated dev entrypoints; discoverability is worse than the examples repo.

- **Versioned / hashed assets vs stable names**
  - **Examples**:
    - Build outputs go to `assets/` with hashed filenames (per Vite defaults), and docs clearly assume a static file server that serves versioned bundles.
    - Combined with `BASE_URL` env, this gives you a clean story for:
      - Long-term caching.
      - Deploying multiple versions safely.
  - **Hello-world**:
    - `vite.config.ts` uses deterministic names (`assets/[name].js`, `assets/[name].[ext]`).
    - Your own rule in `architecture.md` says “when you change your widget’s HTML/JS/CSS in a breaking way, give the template a new URI or file name”, but the build system doesn’t enforce or help with that.
  - **Gap / risk**:
    - It’s easy to accidentally ship a breaking UI change to an existing `ui://widget/...` URI and get clobbered by ChatGPT’s aggressive caching.
    - You have to remember to manually change template URIs; the build doesn’t give you versioned asset names by default.

- **Static asset hosting separation**
  - **Examples**:
    - The examples repo runs a dedicated static server (`pnpm run serve`, port `4444`) and expects MCP servers to treat those assets as external resources (`BASE_URL` pointing at the asset host).
    - This encourages treating widget assets as independent deployable artifacts.
  - **Hello-world**:
    - Express serves static UI assets directly from `dist/ui` at `/ui`.
    - There’s no abstraction around `BASE_URL` for widgets or explicit separation between MCP transport and asset hosting.
  - **Gap / risk**:
    - Harder to split deployment concerns later (e.g., CDNs, separate static hosts) without reworking paths and URIs.

---

### 5. Testing and debugging UX

- **Explicit logging and introspection of host interactions**
  - **Examples**:
    - `kitchen-sink-lite` logs every meaningful host interaction (tool calls, modal requests, display-mode changes, follow-up messages, errors) into an on-screen log.
    - It intentionally simulates failure modes (`handleThrowError`, bad `callTool` args, etc.) so you see how widgets behave under error conditions.
  - **Hello-world**:
    - Logging is minimal and mostly via `console.error` / `console.warn` in `ProductListWidget`.
    - There’s no UI-level introspection panel for host state or tool I/O.
  - **Gap / risk**:
    - Debugging complex host-widget behavior will be slower and more opaque.

---

### 6. Concrete next steps for `gpt-hello-world`

If you want to align the hello-world with the examples’ best practices instead of just talking about them in `architecture.md`, the highest-leverage changes are:

- **Host-global hooks**
  - Add `useWidgetState` and `useWidgetProps` to `ui/hooks.ts`, modeled directly on the examples.
  - Update existing widgets to:
    - Read data via `useWidgetProps` rather than reaching into `toolOutput` manually.
    - Store any meaningful UI state (filters, selections, view toggles) in host-backed `widgetState`.

- **Display-mode–aware, height-aware layout**
  - Introduce `useDisplayMode` / `useMaxHeight` hooks and refactor `ProductListWidget` to:
    - Respect `maxHeight` and avoid clipping in inline vs fullscreen vs pip.
    - Adjust density / layout based on `displayMode`.

- **Richer host API usage where it actually improves UX**
  - For flows like “view wishlist → edit → confirm”, adopt `requestModal` + `view.params` patterns from `pizzaz-shop` instead of keeping everything inline.
  - Add at least one production-grade widget that uses `sendFollowUpMessage` and `openExternal` in a way that makes sense for your domain.

- **Build & DX**
  - Move from manual Vite inputs to a convention-based multi-entry setup (or steal the `multiEntryDevEndpoints` approach if you want).
  - Start emitting versioned asset filenames and wiring URIs through a `BASE_URL` so you’re not relying on manual URI changes for cache-busting.

Right now, your hello-world *documents* many of these patterns but only **implements the simplest subset**. The examples repo actually bakes them into code—especially around widget state, display modes, layout, and build tooling—which is the main gap. 


