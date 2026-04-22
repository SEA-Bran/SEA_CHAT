# Chat Widget Code (`src/chat/`)

This folder has all the widget code. It's split into small files so it's easy to understand and change.

## Structure

```
chat/
├── ChatWidget.tsx              # Main widget (root component)
├── types.ts                    # All TypeScript types
├── defaults.ts                 # Default values
├── components/
│   ├── ChatPanel.tsx           # The chat box UI
│   └── ChatLauncher.tsx        # The floating button
└── adapter/
    ├── createOpenAIResponsesAdapter.ts     # Creates the API client
    ├── runOpenAIRequest.ts                 # Calls OpenAI API
    ├── runEndpointRequest.ts               # Calls your own API
    ├── buildRequestBody.ts                 # Builds the request payload
    ├── resolvePath.ts                      # Extracts response text
    └── types.ts                            # Adapter types
```

## How It Works

### 1. User opens the widget

The widget starts closed. User clicks the launcher button → `ChatLauncher` calls `onToggle()` → `ChatWidget` sets `isOpen = true`.

```
User clicks button
    ↓
ChatLauncher.onToggle()
    ↓
ChatWidget.handleToggle()
    ↓
setIsOpen(true)
    ↓
ChatPanel appears
```

### 2. User types a message

User types in the composer (part of `Thread` from `@assistant-ui/react`) → message is sent to the adapter.

### 3. Adapter fetches a response

The `createOpenAIResponsesAdapter` is the brain:

```
User's text
    ↓
Check: Do we have endpointUrl?
    ├─ YES → runEndpointRequest() → Calls your backend
    └─ NO → Check: Do we have openaiApiKey?
         ├─ YES → runOpenAIRequest() → Calls OpenAI
         └─ NO → Return error message
    ↓
Response text
    ↓
ChatPanel shows it
```

### 4. State management

The widget has one piece of state: `isOpen` (boolean). Everything else is props flowing down.

```
ChatWidget (isOpen state)
    ↓
    ├─ ChatPanel (gets isOpen, onClose)
    │   └─ Thread (from @assistant-ui/react, handles messages)
    │
    └─ ChatLauncher (gets isOpen, onToggle)
        └─ Button that toggles isOpen
```

### 5. Multi-Turn Conversations (OpenAI memory)

When using OpenAI's API, the widget automatically tracks conversation context:

```
Message 1: "What are your hours?"
    ↓
OpenAI response → saves response_id "resp_001"
    ↓
Message 2: "Are you open on Sundays?"
    ↓
runOpenAIRequest sends: { input: "...", previous_response_id: "resp_001" }
    ↓
OpenAI remembers context → gives relevant answer
    ↓
(repeats for every message)
```

**Why this matters:** The assistant can refer back to earlier messages. Example:

- User: "I want the Pro plan"
- Assistant: "Great choice! The Pro plan includes..."
- User: "Tell me more about the support" (support = from the Pro plan the user mentioned)
- Assistant: "The Pro plan includes 24/7 email support..."

This works because we save the response ID and send it with every subsequent request.

**Implementation details:**

- `ChatWidget.tsx` creates the adapter with `useMemo` — same instance for the widget's lifetime
- `createOpenAIResponsesAdapter.ts` holds the `state` object with `previousResponseId`
- `runOpenAIRequest.ts` reads `state.previousResponseId` and includes it in the request (line 35-36)
- When OpenAI responds, we extract the new `response_id` and save it (line 125-127)

## Key Files Explained

### `ChatWidget.tsx`

**The main component.** It:

- Holds the `isOpen` state (is the chat box visible?)
- **Creates the API adapter with `useMemo` — IMPORTANT for multi-turn conversations** (see section 5 above)
- Renders the panel and launcher button
- Passes callbacks down

**Important:** The adapter is created with `useMemo` with an empty dependency array `[]`. This means:

- The adapter is created ONCE when the widget mounts
- The same adapter instance is reused on every re-render
- This keeps `previousResponseId` alive across renders
- Without this, every re-render would create a new adapter and forget conversation history

Very simple - just `useMemo` and `useState` for state, and passing props. This is what a junior dev should start with.

### `types.ts`

**All the TypeScript types in one place.** When you add a new prop, add it here first. TypeScript then tells you everywhere else you need to update.

Example:

```tsx
export type ChatWidgetProps = OpenAIResponsesAdapterOptions & {
  assistantName?: string; // Widget header name
  title?: string; // Panel title
  statusText?: string; // "Online now" text
  launcherText?: string; // Button label
  initiallyOpen?: boolean; // Start open?
};
```

### `defaults.ts`

**Safe default values.** If the user doesn't provide a prop, we use these defaults:

```tsx
export const DEFAULT_WIDGET_PROPS = {
  assistantName: "SEA Assistant",
  title: "Chat with us",
  statusText: "Online now",
  launcherText: "Chat with SEA",
  initiallyOpen: false,
};
```

### `components/ChatPanel.tsx`

**The chat box.** It shows:

- Assistant name and title in the header
- Close button
- The `Thread` component (which is from `@assistant-ui/react` - that library handles all the chat UI)

Takes props:

- `isOpen` - Show or hide?
- `assistantName`, `title`, `statusText` - Text to display
- `onClose()` - Callback when user clicks close button

### `components/ChatLauncher.tsx`

**The floating button.** Shows:

- Icon (✦ when closed, − when open)
- Label text
- Notification badge

Takes props:

- `isOpen` - Which icon to show?
- `launcherText` - Button label
- `onToggle()` - Callback when clicked

### `adapter/createOpenAIResponsesAdapter.ts`

**The main API handler and multi-turn memory manager.** It:

- Holds the `state` object that keeps track of `previousResponseId`
- Checks which API to use (endpointUrl or openaiApiKey)
- Calls the right request function
- Handles errors
- **Manages response IDs for multi-turn conversations** — saves the response ID from each OpenAI response so the next message includes it

Returns an object that `@assistant-ui/react` knows how to work with.

**Key concept:** The `state` variable here is persistent. It's created once (in `ChatWidget.tsx` via `useMemo`) and lives for the entire widget lifetime. This is how conversation context is preserved.

### `adapter/runOpenAIRequest.ts`

**Calls the OpenAI Responses API.** It:

- Builds the request (model, instructions, tools, **`previous_response_id` from state**)
- Streams the response
- Extracts the response ID from OpenAI's reply
- **Saves the response ID back to state** for the next message
- Returns the full response text

Uses basic `fetch()` and reads streaming JSON events.

**Lines 35-36:** Sends `previous_response_id` if one was saved  
**Lines 125-127:** Extracts and saves the new response ID

### `adapter/runEndpointRequest.ts`

**Calls your own backend API.** It:

- Takes your endpoint URL
- Builds the request body (can substitute `{{message}}`, `{{messages}}`, etc.)
- Sends it with GET or POST
- Extracts the response using `responsePath` (JSON path like `data.text`)

Useful if you want to hide your API key or add custom logic on your server.

### `adapter/buildRequestBody.ts`

**Helper that builds request payloads.** It:

- Takes a template (string, object, or array)
- Replaces placeholders like `{{message}}` with the actual user text
- Recursively handles nested objects
- Returns the filled-in template

Example:

```tsx
template = { prompt: "{{message}}", context: "{{messages}}" }
userText = "Hello"
history = [{ role: "user", text: "Hi" }]

Returns: {
  prompt: "Hello",
  context: '[{"role":"user","text":"Hi"}]'
}
```

### `adapter/resolvePath.ts`

**Helper that extracts values from JSON.** It:

- Takes a path like `data.response.text` or `result[0].message`
- Navigates the JSON object
- Returns the value as a string

Used to extract the response text from your API response.

#### ASP.NET `GeneralQueryRequest` support

Simple behavior:

- If `endpointUrl` is present, endpoint mode is always used before direct OpenAI mode.
- If `body` is not provided, request body defaults to the custom endpoint format below.

For custom links, endpoint requests default to:

```json
{
  "apiKey": "...",
  "userQuery": "latest user text",
  "vectorStoreIds": ["vs_support_docs"],
  "model": "gpt-4.1"
}
```

If `authKey` is set, the request also includes this extra header:

```text
{ [authKey]: authValue }
```

If you pass `body`, the adapter keeps using your custom payload, with support for placeholders:

- `{{message}}` / `{{prompt}}` / `{{userInput}}` / `{{userQuery}}`
- `{{messages}}`
- `{{apiKey}}`
- `{{vectorStoreIds}}`
- `{{model}}`

If you want to disable this automatic custom-endpoint body behavior, set `useCustomEndpointRequest: false`.

### `adapter/types.ts`

**Types just for the adapter.** Keeps adapter-specific types separate.

## How to Debug

### Issue: Widget doesn't respond to API key

1. Open `ChatWidget.tsx`
2. Check that `props.openaiApiKey` is being passed
3. Trace it through to `createOpenAIResponsesAdapter`
4. Check `runOpenAIRequest.ts` - is the key in the Authorization header?

### Issue: Response doesn't show up

1. Check `ChatPanel.tsx` - does the `Thread` component render?
2. Check the adapter - did it return the text?
3. Check `runOpenAIRequest.ts` or `runEndpointRequest.ts` - did the request work?
4. Check browser DevTools → Network tab → look for the API call
5. Check DevTools → Console for errors

### Issue: Wrong text showing

1. If custom endpoint: check `responsePath` in `types.ts` - is the path correct?
2. Run `resolvePath.js` manually to test:
   ```js
   // In browser console:
   const response = { data: { text: "Hello" } };
   resolvePath(response, "data.text"); // Should return "Hello"
   ```

### Issue: Styling is broken

1. Check `src/widget.css` - is it imported?
2. Check CSS custom properties - `--sea-accent-a`, etc.
3. Open DevTools → Styles tab → check what CSS is applied
4. Remember: widget is in Shadow DOM, so external CSS doesn't affect it

## Common Changes

### Add a new prop (e.g., `maxMessages`)

1. **Add to types:**

   ```tsx
   // src/chat/types.ts
   export type ChatWidgetProps = OpenAIResponsesAdapterOptions & {
     maxMessages?: number; // Add this
   };
   ```

2. **Add default:**

   ```tsx
   // src/chat/defaults.ts
   export const DEFAULT_MAX_MESSAGES = 50;
   ```

3. **Use it in ChatWidget:**
   ```tsx
   // src/chat/ChatWidget.tsx
   const maxMessages = props.maxMessages ?? DEFAULT_MAX_MESSAGES;
   // Pass to Thread or ChatPanel as needed
   ```

### Change colors

Edit `src/widget.css` - look for `--sea-accent-a`, `--sea-accent-b`, etc.

### Add a button to the panel

Edit `ChatPanel.tsx` - add the button in the JSX, add the handler function.

### Call a different API

Edit `createOpenAIResponsesAdapter.ts` - change which function is called (`runOpenAIRequest` vs `runEndpointRequest`).

## Testing

The widget is tested by:

1. Running `npm run dev` - opens the demo page
2. Click the button, type a message, see if it works
3. Check DevTools → Console for errors
4. Check DevTools → Network tab to see API calls

No unit tests yet - we test manually. When you make a change:

1. Run `npm run dev`
2. Test the widget end-to-end
3. Run `npm run lint` to check code style
4. Run `npm run build:all` to make sure it still builds

## Quick Reference

| When you want to...         | Edit this file                  |
| --------------------------- | ------------------------------- |
| Add a new prop              | `types.ts`                      |
| Change default text         | `defaults.ts`                   |
| Change the button           | `components/ChatLauncher.tsx`   |
| Change the panel            | `components/ChatPanel.tsx`      |
| Change main logic           | `ChatWidget.tsx`                |
| Change how we call OpenAI   | `adapter/runOpenAIRequest.ts`   |
| Change how we call your API | `adapter/runEndpointRequest.ts` |
| Change colors/layout        | `../widget.css`                 |

---

**Remember:** Every file is short and simple. Read it top to bottom. If you don't understand something, add `console.log()` and run `npm run dev`.
