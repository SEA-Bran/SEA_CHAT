# Chat Widget Roadmap

## Phase Plan

### Phase 1

- Scaffold a React + TypeScript + Vite app
- Create the widget shell and layout
- Define the message data model

Phase 1 status: Completed

### Phase 2

- Implement launcher, panel, transcript, and composer
- Add API-driven assistant response flow via configurable endpoint
- Add responsive and animated styling

Phase 2 status: Completed

### Phase 3

- Refine accessibility and keyboard behavior
- Validate build output
- Implement configurable backend request integration points
- Deliver embeddable script entry for external websites

Phase 3 status: Completed (embed baseline delivered with configurable runtime API request flow)

### Phase 4

- Evaluate open-source embeddable chat widgets for OpenAI Responses API fit
- Replace hand-rolled widget UI with `@assistant-ui/react` Thread component
- Implement `OpenAIResponsesAdapter`: SSE streaming, multi-turn via `previous_response_id`, per-role `instructions`, optional `file_search` via `vector_store_ids`
- Update init API: `request.*` replaced by `openaiApiKey`, `model`, `instructions`, `vectorStoreId`
- Inject assistant-ui styles into Shadow DOM

Phase 4 status: Completed (2026-04-21)

## Production Integration Next Steps

1. **Proxy the OpenAI API key server-side** — never expose raw keys to browser in production. Route requests through your own backend.
2. Pre-create vector stores per role and pass the `vectorStoreId` at init time.
3. Add request retry behavior and user-facing retry controls.
4. Add chat persistence (local storage or backend session store).
5. Add attachment support in the composer.
6. Add authentication and user context.
7. Publish widget to CDN with versioned script URLs.
