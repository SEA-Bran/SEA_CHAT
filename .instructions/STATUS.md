# Chat Widget Status

Last updated: 2026-04-22

## Current State

- Status: V2 — OpenAI Responses API integration complete
- Stack: React + TypeScript + Vite + @assistant-ui/react
- Build: passing (`npm run build:all`)
- Embeddable build: passing (`dist-widget/sea-chat-widget.js`, ~517 kB IIFE)
- Runtime compatibility: `process is not defined` and `URL constructor: null` errors resolved in prior builds

## Completed Against Spec

- Floating launcher implemented at bottom-right
- Chat panel with open/close animation implemented
- Header includes assistant name, status, and close action
- Scrollable transcript with user/assistant bubble alignment implemented
- Composer supports multiline input
- `Enter` sends message and `Shift+Enter` inserts newline
- Send action is disabled on empty input and during assistant response
- Empty state with starter prompts implemented
- Auto-scroll to latest message implemented
- Keyboard-focus and ARIA labels implemented for key controls
- Responsive behavior validated for desktop and mobile layouts
- Widget extracted into reusable `ChatWidget` component
- IIFE embeddable entry with global `window.SeaChatWidget.init(...)`
- Shadow DOM mount for style isolation from host pages
- **[V2] Replaced hand-rolled widget UI with `@assistant-ui/react` Thread component**
- **[V2] `OpenAIResponsesAdapter` calls `POST /v1/responses` directly with SSE streaming**
- **[V2] Multi-turn continuity via `previous_response_id` — no server session required**
- **[V2] Per-role `instructions` (system prompt) injected into every request**
- **[V2] Optional `file_search` tool enabled by passing `vectorStoreId`**
- **[V2] Init options changed: `request.*` replaced by `openaiApiKey`, `model`, `instructions`, `vectorStoreId`**
- **[V2] Assistant-UI styles injected into Shadow DOM alongside widget CSS**
- **[V2] Custom endpoint is prioritized when `endpointUrl` is provided**
- **[V2] `GetQueryResponse` endpoint now auto-uses `{ ApiKey, UserQuery, AssistantId }` request body**
- **[V2] ApiResponse envelope handling (`Success`, `Message`, `Result`) documented and wired for endpoint flow**

## Pending / Out of Scope

- Server-side API key proxy (currently key is passed client-side)
- Persistent chat history across page loads
- File upload and voice input
- Authentication and user context
- Thread history / multi-session support
