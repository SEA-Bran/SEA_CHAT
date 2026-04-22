# Core Requirements

This document captures the non-negotiable requirements for the SEA Chat Widget, plus the evaluation record and upgrade decision that led to the current implementation.

---

## Open-Source Widget Evaluation (2026-04-21)

### Requirement Being Evaluated

Replace the custom hand-rolled chat widget with an open-source solution that:

- Supports multi-turn chat
- Calls the OpenAI Responses API directly (not through a bridge)
- Uses `file_search` with a per-role `vector_store_id`
- Carries per-role `instructions` (system prompts) per session

### Options Evaluated

| Option                                 | Stars | Embeddable          | Responses API | file_search | Per-role system prompt | Verdict                      |
| -------------------------------------- | ----- | ------------------- | ------------- | ----------- | ---------------------- | ---------------------------- |
| `openai/openai-responses-starter-app`  | 810   | ❌ Full Next.js app | ✅ Native     | ✅ Native   | ✅                     | Disqualified: not embeddable |
| `@assistant-ui/react` + `LocalRuntime` | 9.6k  | ✅ React lib        | Via adapter   | Via adapter | Via adapter            | **Selected**                 |
| Other search results                   | —     | ❌                  | ❌            | ❌          | ❌                     | No matches found             |

### Evaluation Finding

No open-source embeddable widget natively implements the Responses API with configurable `vector_store_ids` and per-role system prompts. The closest match is `@assistant-ui/react`, which:

- Provides a production-grade, fully composable React chat UI (MIT, Y Combinator-backed)
- Exposes a `LocalRuntime` custom adapter that accepts any API call
- Does NOT require a full custom widget build — the UI layer is fully provided by the library

A thin `LocalRuntime` adapter (~30 lines) is written to call the Responses API directly. This is the recommended path because it avoids maintaining a custom chat UI, gains streaming/a11y/auto-scroll for free, and remains embeddable via the existing Shadow DOM architecture.

### Selected Approach

- **UI layer**: `@assistant-ui/react` Thread component + shadcn/ui theme
- **Runtime**: `LocalRuntime` with a custom `ChatModelAdapter` that supports endpoint AJAX mode plus OpenAI direct fallback
- **Multi-turn**: `previous_response_id` threaded per widget instance
- **file_search**: `tools: [{ type: "file_search", vector_store_ids: [...] }]` per init options
- **System prompt**: `instructions` field per init options

---

---

## Requirement 1: Embeddable on Third-Party Websites

The widget must be usable from any website without code coupling to the host site.

### Rules

- Must load by including a single JavaScript file on any website.
- Must support CDN hosting and static file distribution.
- Must expose a global browser API (`window.SeaChatWidget`) that initializes after script load.
- Must mount using Shadow DOM to isolate styles from the host page.
- Must not require a build step on the consuming website.

### Implementation

- Entry: `src/embeddable.tsx`
- Build output: `dist-widget/sea-chat-widget.js` (IIFE bundle)
- Build command: `npm run build:widget`
- Global API: `window.SeaChatWidget.init(options)`
- Mount strategy: `host.attachShadow({ mode: 'open' })` with scoped styles injected at runtime

### Usage

```html
<script src="https://your-cdn.example.com/sea-chat-widget.js"></script>
<script>
  window.SeaChatWidget.init({
    assistantName: "SEA Assistant",
    openaiApiKey: "sk-...",
    model: "gpt-4.1",
    instructions: "You are a helpful support assistant for role X.",
    vectorStoreId: "vs_abc123",
  });
</script>
```

---

## Requirement 2: Runtime Request Routing (Endpoint First, OpenAI Fallback)

On send, the widget must support both runtime paths:

- If `endpointUrl` is provided, call that URL via AJAX/fetch.
- If `endpointUrl` is not provided but `openaiApiKey` is provided, call `POST /v1/responses` directly.

This preserves the original configurable URL requirement while retaining direct OpenAI support.

### Rules

- Each user message must call either a configured `endpointUrl` or the OpenAI Responses API.
- `endpointUrl` takes priority over direct OpenAI mode when both are provided.
- Endpoint mode supports configurable method, headers, body, and responsePath mapping.
- `previous_response_id` must be threaded per widget instance to maintain multi-turn context.
- `instructions` (system prompt) must be configurable per widget instance.
- `model` must be configurable per widget instance.
- OpenAI API key is passed at init time via `openaiApiKey` option for direct mode.
- Responses are streamed using SSE (`stream: true`).

### Implementation

- Adapter: `src/OpenAIResponsesAdapter.ts` — `LocalRuntime` ChatModelAdapter
- State: `previousResponseId` tracked per widget instance in the adapter
- Library: `@assistant-ui/react` `LocalRuntime` + `Thread` component
- Endpoint mode: standard fetch call with configurable request/response mapping
- OpenAI mode: native SSE stream from Responses API processed by the adapter

### Runtime Flow

```
User sends message
  → if endpointUrl exists:
    adapter calls endpointUrl via fetch (method/headers/body/responsePath)
  → else if openaiApiKey exists:
    adapter calls POST /v1/responses with previous_response_id
  → else:
    adapter returns a configuration error message
```

---

## Requirement 3: file_search Against Per-Role Vector Store

When a `vectorStoreId` is provided at init time, the widget enables the `file_search` built-in tool against that store.

### Rules

- `vectorStoreId` is configured per widget instance (per role).
- When present, `tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }]` is included in every Responses API call.
- When absent, no `tools` array is sent (plain assistant response).
- The `vectorStoreId` cannot be changed after init without destroying and reinitializing the widget.

### Implementation

- Adapter reads `options.vectorStoreId` and constructs the tools array conditionally.
- No vector store management is performed by the widget (stores must be pre-created).

### Usage

```html
<script>
  window.SeaChatWidget.init({
    openaiApiKey: "sk-...",
    model: "gpt-4.1",
    instructions: "Answer only from the knowledge base.",
    vectorStoreId: "vs_abc123", // omit to disable file_search
  });
</script>
```

---

## Init Options Reference

| Option                 | Type                            | Required | Description                                                 |
| ---------------------- | ------------------------------- | -------- | ----------------------------------------------------------- |
| `endpointUrl`          | `string`                        | —        | Custom endpoint URL called first when set                   |
| `method`               | `GET\|POST\|PUT\|PATCH\|DELETE` | —        | HTTP method for endpoint mode (default: `POST`)             |
| `headers`              | `Record<string,string>`         | —        | Request headers for endpoint mode                           |
| `body`                 | `unknown`                       | —        | Request body template for endpoint mode                     |
| `responsePath`         | `string`                        | —        | JSON path mapping for endpoint response text                |
| `fallbackErrorMessage` | `string`                        | —        | User-facing error text when request fails                   |
| `openaiApiKey`         | `string`                        | —        | OpenAI API key used when endpointUrl is not provided        |
| `model`                | `string`                        | —        | Model ID (default: `gpt-4.1`)                               |
| `instructions`         | `string`                        | —        | System prompt / per-role instructions                       |
| `vectorStoreId`        | `string`                        | —        | Pre-created vector store ID; enables `file_search` when set |
| `assistantName`        | `string`                        | —        | Display name shown in widget header                         |
| `title`                | `string`                        | —        | Widget panel title                                          |
| `statusText`           | `string`                        | —        | Status line in header                                       |
| `launcherText`         | `string`                        | —        | Launcher button label                                       |
| `initiallyOpen`        | `boolean`                       | —        | Open panel on first render                                  |
| `target`               | `string\|HTMLElement`           | —        | Mount container (defaults to `document.body`)               |

---

## Known Runtime Constraints

| Constraint                                              | Resolution                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `process is not defined` in browser                     | Widget bundle ships a browser-safe process shim; rebuild with `npm run build:widget` if stale                              |
| `URL constructor: null is not a valid URL` on `file://` | Endpoint resolution uses `window.location.href` as base with try/catch; no crash                                           |
| CORS on direct browser Responses API calls              | `openaiApiKey` must have correct permissions; production deployments should proxy through a backend to avoid exposing keys |

---

## What Cannot Be Changed

- The widget must call a real runtime target on every send (configured endpoint URL or OpenAI direct fallback); no mock fallback is acceptable.
- Multi-turn state (`previous_response_id`) must be threaded per widget instance.
- The IIFE build with global API must remain the distribution format for embed usage.
- Shadow DOM mount must be preserved to guarantee style isolation on host websites.
- `vectorStoreId` and `instructions` are per-init and cannot be changed at runtime without a destroy/reinit cycle.
