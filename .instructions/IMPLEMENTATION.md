# Chat Widget Implementation

This document summarizes the implementation of the floating chat widget.

## V2 Architecture (Current)

### What Changed in V2

- **`src/ChatWidget.tsx`** — replaced hand-rolled transcript/composer UI with `@assistant-ui/react` `Thread` component. Uses `useLocalRuntime` + `AssistantRuntimeProvider` to wire the Responses API adapter.
- **`src/OpenAIResponsesAdapter.ts`** — new `ChatModelAdapter` implementation. Calls `POST https://api.openai.com/v1/responses` with SSE streaming. Tracks `previousResponseId` per instance for multi-turn continuity. Supports optional `file_search` via `vector_store_ids`.
- **`src/embeddable.tsx`** — init options updated: `request.*` removed, replaced by `openaiApiKey`, `model`, `instructions`, `vectorStoreId`. Both `@assistant-ui/react-ui` styles and widget CSS are injected into the Shadow DOM.
- **`src/App.tsx`** — demo updated to use `<ChatWidget openaiApiKey={...} model="gpt-4.1" instructions="..."/>`.

### New Dependencies

| Package                        | Version | Purpose                                                                |
| ------------------------------ | ------- | ---------------------------------------------------------------------- |
| `@assistant-ui/react`          | 0.12.25 | `useLocalRuntime`, `AssistantRuntimeProvider`, `ChatModelAdapter` type |
| `@assistant-ui/react-ui`       | 0.2.1   | `Thread` UI component                                                  |
| `@assistant-ui/react-markdown` | latest  | Markdown rendering peer dep for react-ui                               |
| `openai`                       | latest  | Type reference (not used at runtime)                                   |

### Responses API Integration

```
POST https://api.openai.com/v1/responses
Authorization: Bearer <openaiApiKey>

{
  model: "gpt-4.1",
  input: "<user message>",
  stream: true,
  instructions: "<per-role system prompt>",
  previous_response_id: "<id from last turn>",   // multi-turn
  tools: [{ type: "file_search", vector_store_ids: ["vs_..."] }]  // if vectorStoreId set
}
```

SSE events parsed:

- `response.created` → capture `response.id` as `previousResponseId`
- `response.output_text.delta` → stream text chunks to Thread UI

### Init Options (V2)

```typescript
window.SeaChatWidget.init({
  openaiApiKey: string,      // required
  model?: string,            // default: 'gpt-4.1'
  instructions?: string,     // per-role system prompt
  vectorStoreId?: string,    // enables file_search
  assistantName?: string,
  title?: string,
  statusText?: string,
  launcherText?: string,
  initiallyOpen?: boolean,
  target?: string | HTMLElement,
})
```

### Build Outputs

- `dist/` — demo app (~487 kB JS)
- `dist-widget/sea-chat-widget.js` — IIFE embeddable bundle (~517 kB, 0 vulnerabilities)

---

## V1 Architecture (Historical)

### What Was Built

A production-quality embedded chat widget with the following features:

### ✓ Core Features Implemented (V1)

- **Floating launcher button** (bottom-right fixed position)
- **Smooth open/close animation** with scale and opacity transitions
- **Chat panel** with professional header, transcript, and composer
- **Message flow** with user (right-aligned) and assistant (left-aligned) messages
- **Empty state** with three starter prompts that users can click
- **Mock conversation flow** with 1.1s simulated typing delay
- **Configurable request flow** that can call external endpoints per message (URL/method/headers/body/responsePath)
- **API-first reply behavior**: user sends are forwarded to `request.endpointUrl`; no silent mock fallback is used when endpoint is missing
- **Safe endpoint URL resolution** for `file://` host pages
- **Auto-scrolling** to latest message on send and receive
- **Enter key support** for sending (Shift+Enter for new lines)
- **Typing indicator** with animated dots
- **Responsive design** for desktop (390px wide) and mobile (full width with safe spacing)
- **Accessibility support** with ARIA labels, semantic HTML, and keyboard navigation

### Stack (V1)

- **React** 19.2.5
- **TypeScript** 6.0.2
- **Vite** 8.0.9
- **CSS** (plain CSS modules, no external UI libraries)

### Project Structure

```
src/
├── App.tsx         # Main widget component with state and logic
├── App.css         # Widget layout, animations, and component styles
├── index.css       # Global theme and base styles
├── main.tsx        # React entry point
└── ...

dist/              # Production build output (7.48 KB CSS, 195.64 KB JS gzipped)
```

### Data Model

```typescript
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};
```

### Component Architecture

- **App**: Root component managing widget state (`isOpen`, `messages`, `input`, `isTyping`)
- **MessageBubble**: Reusable message display with role-based styling
- Helper functions: `formatTime()`, `queueAssistantReply()`, `submitMessage()`

## How to Run

### Development

```bash
npm run dev
```

Open http://localhost:5173/ in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## Testing Checklist

✓ Open/close widget with launcher button
✓ Send message via starter prompt click
✓ Send message via Enter key in textarea
✓ Verify typing indicator appears and clears
✓ Verify mock assistant replies after delay
✓ Verify messages auto-scroll to bottom
✓ Verify time formatting (e.g., "2:10 PM")
✓ Verify mobile layout (375px viewport)
✓ Verify desktop layout (390px panel width)
✓ Test keyboard accessibility (Tab, Enter, Shift+Enter)

## Next Steps for Production Integration

### Ready to implement without breaking current UI:

1. **Replace mock responses** in `queueAssistantReply()` with real API calls
2. **Connect to a backend endpoint** (e.g., `/api/chat` POST with message body)
3. **Add error handling** for failed requests
4. **Implement message persistence** (local storage or backend session)
5. **Add typing animations** for streamed responses
6. **Support attachments** in the composer UI
7. **Add user authentication** to the launcher/panel

### Current mock data (easy to swap):

```typescript
// Use request config like:
async function fetchAssistantReply(messages: Message[]) {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  return response.json();
}
```

## CSS Classes and Structure

All styles are self-contained in `App.css` and use BEM-style naming:

- `.chat-panel`, `.chat-panel__header`, `.chat-panel__body`, `.chat-panel__composer`
- `.launcher`, `.launcher__icon`, `.launcher__text`, `.launcher__badge`
- `.message`, `.message--user`, `.message--assistant`, `.message__bubble`
- `.empty-state`, `.prompt-chip`, `.typing-indicator`
- `.widget-layer` (fixed container)
- `.app-shell` (page wrapper)

All animations are CSS-based for performance:

- Panel open/close: `transform` and `opacity` (180-220ms)
- Message appear: `fade-up` (220ms)
- Typing dots: `pulse` (800ms per cycle)

## Notes

- No external UI library (no Tailwind, Material, Bootstrap, etc.)
- All motion is intentional and subtle (no heavy easing)
- Responsive breakpoints at 900px and 640px
- Full TypeScript strict mode support
- ESLint enabled with React/TypeScript rules
- Production-ready output with tree-shaking and minification
- Embeddable bundle is compatible with local `file://` testing; if stale bundles are used, rebuild with `npm run build:widget`.
- Endpoint URLs should be valid absolute URLs for external APIs to avoid host-environment parsing differences.
