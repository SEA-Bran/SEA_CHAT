# Usage Guide

This guide explains how to use the chat widget from another website and how to update it safely.

## Quick Start

1. Build the embeddable bundle:

```bash
npm run build:widget
```

2. Publish this file to your static host or CDN:

- `dist-widget/sea-chat-widget.js`

3. Add the script to any website page:

```html
<script src="https://your-cdn.example.com/sea-chat-widget.js"></script>
<script>
  window.SeaChatWidget.init({
    assistantName: "SEA Assistant",
    title: "Open widget chat",
    statusText: "Online now",
    launcherText: "Chat with SEA",
    initiallyOpen: false,
    // OpenAI Responses API — called directly from the browser.
    // For production, proxy through a server endpoint to protect your key.
    openaiApiKey: "YOUR_OPENAI_API_KEY",
    model: "gpt-4.1",
    instructions: "You are a helpful SEA support assistant.",
    // vectorStoreId: "vs_xxxxxxxxxxxxxxxx", // optional: enables file_search
    // target: '#chat-widget-mount'          // optional mount selector
  });
</script>
```

## API

### `window.SeaChatWidget.init(options)`

Creates one widget instance.

| Option          | Type                    | Required | Description                                             |
| --------------- | ----------------------- | -------- | ------------------------------------------------------- |
| `target`        | `string \| HTMLElement` | No       | Mount selector or element. Defaults to `document.body`. |
| `assistantName` | `string`                | No       | Header label text                                       |
| `title`         | `string`                | No       | Panel title                                             |
| `statusText`    | `string`                | No       | Online/status text                                      |
| `launcherText`  | `string`                | No       | Launcher button label                                   |
| `initiallyOpen` | `boolean`               | No       | Open panel on mount                                     |
| `openaiApiKey`  | `string`                | Yes      | Sent as `Authorization: Bearer <key>` to OpenAI         |
| `model`         | `string`                | No       | Model ID (default: `gpt-4.1`)                           |
| `instructions`  | `string`                | No       | Per-role system prompt injected into every request      |
| `vectorStoreId` | `string`                | No       | Enables `file_search` tool with this vector store       |

Returns:

- `destroy()`: unmount and remove the widget instance

Example:

```html
<script>
  const widget = window.SeaChatWidget.init({
    openaiApiKey: "sk-...",
    instructions: "You are a support agent for SEA.",
    vectorStoreId: "vs_abc123",
  });
  // Later when needed:
  // widget.destroy();
</script>
```

## Update Process

1. Make code changes in widget-related files (`src/ChatWidget.tsx`, `src/OpenAIResponsesAdapter.ts`, `src/widget.css`, `src/embeddable.tsx`).
2. Validate local app:

```bash
npm run build
```

3. Validate embeddable output:

```bash
npm run build:widget
```

4. Deploy updated `dist-widget/sea-chat-widget.js` to CDN.
5. Keep the same script URL with cache-busting strategy, or publish a versioned path.

## Local File Testing Note

- When opening an embed page with `file://`, always rebuild first:

```bash
npm run build:widget
```

- If you see `Uncaught ReferenceError: process is not defined`, the page is loading an older widget bundle. Refresh with cache disabled or point to the latest built script.
- Previous `TypeError: URL constructor: null is not a valid URL` errors are resolved in the current build.

## Notes

- The widget uses Shadow DOM to reduce style conflicts with host websites.
- Host websites only need the script and one `window.SeaChatWidget.init(...)` call.
- The OpenAI Responses API is called directly from the browser. **Never expose real API keys in production.** Route requests through a server-side proxy instead.
