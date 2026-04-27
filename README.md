# SEA Chat Widget

A simple, embeddable chat widget for customer support. Built with React, TypeScript, and the OpenAI Responses API.

## What This Project Does

This is a floating chat widget that you can embed on your website. It:

- Opens and closes with a button
- Connects to OpenAI API for responses
- **Supports multi-turn conversations** — the assistant remembers your entire conversation
- Shows typing state and conversation history
- Responsive on desktop and mobile
- Works inside a Shadow DOM (doesn't conflict with your page styles)

## Quick Start

### Install dependencies

```bash
npm install
```

### Run the demo locally

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) to see the widget in action.

### Build for production

```bash
npm run build          # Build the main demo app
npm run build:widget   # Build the embeddable widget bundle
npm run build:all      # Build both
```

## Project Structure

The code is organized so it's easy to find and fix things:

```
src/
├── chat/                      # Core widget code
│   ├── components/            # UI parts (ChatPanel, ChatLauncher)
│   ├── adapter/               # How we talk to the API
│   ├── ChatWidget.tsx         # Main widget component (uses useState)
│   ├── types.ts              # All TypeScript types
│   └── defaults.ts           # Default text and settings
├── demo/                      # Demo page (shows the widget)
│   └── DemoPage.tsx          # The demo HTML and setup
├── App.tsx                    # Main app entry point
├── embeddable.tsx            # Bundle entry point (for npm package)
└── main.tsx                   # React startup
```

**See [src/chat/README.md](src/chat/README.md) for details on widget code.**

## How to Use This Widget

### In Your Website (Simple HTML)

```html
<script src="path/to/sea-chat-widget.js"></script>
<script>
  window.SeaChatWidget.init({
    assistantName: "My Assistant",
    title: "Chat with us",
    openaiApiKey: "sk-...", // Get from environment, never hardcode
    model: "gpt-4.1",
    instructions: "You are helpful customer support.",
  });
</script>
```

### In a React App

```tsx
import { ChatWidget } from "sea-chat";

export function MyPage() {
  return (
    <ChatWidget
      openaiApiKey={import.meta.env.VITE_OPENAI_API_KEY}
      model="gpt-4.1"
      instructions="You are helpful."
    />
  );
}
```

### Use a Custom ASP.NET Endpoint (`GetQueryResponse`)

Simple rule: if `endpointUrl` is set, the widget uses your custom endpoint first.

For custom endpoints, the widget auto-uses this request body when `body` is not provided:

```json
{
  "userQuery": "string",
  "vectorStoreIds": ["string"],
  "previousResponseId": "string"
}
```

**Key improvements** over the old concatenated history approach:

- **Cost**: Each turn is billed once. Previously, turn 20 would pay for turns 1–19 again.
- **Security**: Only the current user message is sent. Eliminates prompt injection from history.
- **Quality**: Your endpoint can structure messages properly instead of parsing concatenated strings.

#### How Your Backend Should Handle It:

1. **Receive** `userQuery` and `previousResponseId` from the widget
2. **Look up** any previous conversation state using `previousResponseId` (or ignore if stateless)
3. **Return** the response (and optionally include `previousResponseId` in your response if you want multi-turn support)

The widget will automatically track `previousResponseId` for the next message.

configure the widget like this:

```tsx
<ChatWidget
  endpointUrl="https://your-api-host/api/Chat/GetQueryResponse"
  method="POST"
  authKey="your-auth-key-value"
  authValue="your-auth-value"
  vectorStoreIds={["vs_support_docs"]}
  responsePath="Result"
  fallbackErrorMessage="Unable to reach assistant right now."
/>
```

### Copy/Paste Setup Snippet (`GetQueryResponse`)

React:

```tsx
<ChatWidget
  endpointUrl="https://your-api-host/api/Chat/GetQueryResponse"
  method="POST"
  authKey={import.meta.env.VITE_GENERAL_QUERY_AUTH_KEY}
  authValue={import.meta.env.VITE_GENERAL_QUERY_AUTH_VALUE}
  vectorStoreIds={(import.meta.env.VITE_GENERAL_QUERY_VECTOR_STORE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)}
  responsePath="Result"
  fallbackErrorMessage="Unable to get query response from API."
/>
```

Plain HTML:

```html
<script src="./dist-widget/sea-chat-widget.js"></script>
<script>
  window.SeaChatWidget.init({
    endpointUrl: "https://your-api-host/api/Chat/GetQueryResponse",
    method: "POST",
    authKey: "your-auth-key-value",
    authValue: "your-auth-value",
    vectorStoreIds: ["vs_support_docs"],
    responsePath: "Result",
    fallbackErrorMessage: "Unable to get query response from API.",
  });
</script>
```

### Quick Setup (3 steps)

1. Set `endpointUrl` to your `GetQueryResponse` API.
2. Set `authKey` and `authValue` if your API requires authentication headers.
3. Set `vectorStoreIds`.
4. Set `responsePath` to `Result`.

If `authKey` and `authValue` are provided, the widget sends two separate headers:

```text
AuthKey: <authKey value>
AuthValue: <authValue value>
```

You can now chat immediately. Each user message is sent as:

```json
{
  "userQuery": "<latest user message>",
  "vectorStoreIds": ["vs_support_docs"],
  "model": "gpt-4.1",
  "previousResponseId": "resp_abc123"
}
```

**Note**: Only the current message is sent. If this is the first message in the conversation, `previousResponseId` will be absent. Your backend should:

- **First message**: Treat it as a fresh conversation start
- **Subsequent messages**: Use `previousResponseId` to look up the conversation context and maintain state

The widget sends this JSON body by default when:

- `endpointUrl` is provided, or
- `vectorStoreIds` or `model` are provided, or
- `useCustomEndpointRequest: true` is set.

You can still provide a custom `body` template and use placeholders such as `{{userQuery}}`, `{{vectorStoreIds}}`, `{{model}}`, `{{previousResponseId}}`, and `{{conversationHistory}}`.

**Important**: If you use `{{conversationHistory}}` in your custom template, the widget will send the full recent history (capped at 10 messages) for backwards compatibility. For new implementations, use `{{previousResponseId}}` instead for better cost and security.

To force a different behavior, set `useCustomEndpointRequest: false`.

## Multi-Turn Conversations

The widget automatically supports multi-turn conversations using the `previous_response_id` pattern — **the assistant remembers your entire chat history via server-side state.**

### Why This Matters

**Old approach** (full history concatenation):

- ❌ Turn 20 = pay for turns 1–19 again
- ❌ Full history = prompt injection surface
- ❌ Concatenated string = weak multi-turn quality

**New approach** (`previous_response_id`):

- ✅ Each turn billed once
- ✅ Only current message sent (minimal injection surface)
- ✅ Server maintains conversation state properly

### How It Works

1. **User sends message 1** — "What are your pricing plans?"
2. **OpenAI/Your API responds** — returns a `previousResponseId` or stores one internally
3. **User sends message 2** — "Tell me more about the Pro plan"
4. **Widget sends `previousResponseId` from message 1** → API knows the context and gives a relevant answer
5. **Repeats for every message** — full conversation stays in memory server-side

This is built in and **happens automatically**. You don't need to do anything — just use the widget normally.

### Under the Hood

- The `ChatWidget.tsx` creates a single adapter instance that lives for the entire widget lifetime (using `useMemo`)
- The adapter tracks `previousResponseId` (from OpenAI's Responses API or your custom endpoint)
- Every API call includes `previousResponseId` so the server knows the context
- See [src/chat/adapter/runOpenAIRequest.ts](src/chat/adapter/runOpenAIRequest.ts) lines 35–37 and [src/chat/adapter/runEndpointRequest.ts](src/chat/adapter/runEndpointRequest.ts) lines 34–45 for the implementation

### Reset Conversation

To clear the conversation history and start fresh:

```tsx
// If you have a reference to the adapter (advanced)
// adapter.reset();
```

Most users never need this — conversations reset automatically when the browser closes or you navigate away.

## Tools: File Search & Vector Search

The widget supports OpenAI's built-in tools like **file search** (searches your uploaded documents) and **vector search** (finds relevant content from a vector store).

### Step 1 — Create a Vector Store in OpenAI

Go to [platform.openai.com](https://platform.openai.com) → Storage → Vector Stores → Create.  
Upload your documents (PDFs, text files, etc.) and copy the **Vector Store ID** — it looks like `vs_abc123xyz`.

### Step 2 — Pass the ID to the widget

**In a React app (`src/demo/DemoPage.tsx` or your own page):**

```tsx
<ChatWidget
  openaiApiKey={import.meta.env.VITE_OPENAI_API_KEY}
  model="gpt-4.1"
  instructions="You are a helpful assistant. Search the documents to answer questions."
  vectorStoreId="vs_abc123xyz"
/>
```

**In the HTML embed (`embed-test.html` or your website):**

```html
<script src="./dist-widget/sea-chat-widget.js"></script>
<script>
  window.SeaChatWidget.init({
    openaiApiKey: "sk-...",
    model: "gpt-4.1",
    instructions:
      "You are a helpful assistant. Search the documents to answer questions.",
    vectorStoreId: "vs_abc123xyz",
  });
</script>
```

That's it. The widget automatically enables `file_search` on every message when `vectorStoreId` is set.

---

### How It Works Internally

The `vectorStoreId` prop flows through the code like this:

```
Your config (vectorStoreId: "vs_abc123")
    ↓
ChatWidget.tsx          — receives the prop
    ↓
createOpenAIResponsesAdapter.ts  — passes it to the request runner
    ↓
runOpenAIRequest.ts     — THIS is where the tool is added to the API call
```

**The exact lines in `src/chat/adapter/runOpenAIRequest.ts`:**

```ts
// Lines 17-25 — tools are built here
let tools;

if (options.vectorStoreId) {
  tools = [
    {
      type: "file_search",
      vector_store_ids: [options.vectorStoreId], // ← your vector store ID
    },
  ];
}

// Lines 40-42 — tools are attached to the request body here
if (tools) {
  requestBody.tools = tools;
}
```

---

### Add More Tools (Web Search, Code Interpreter)

Open `src/chat/adapter/runOpenAIRequest.ts` and add more objects to the `tools` array:

```ts
if (options.vectorStoreId) {
  tools = [
    // Tool 1: Search your uploaded documents
    {
      type: "file_search",
      vector_store_ids: [options.vectorStoreId],
    },

    // Tool 2: Search the web (add this line to enable)
    { type: "web_search_preview" },

    // Tool 3: Run Python code (add this line to enable)
    { type: "code_interpreter", container: { type: "auto" } },
  ];
}
```

> **Note:** `web_search_preview` and `code_interpreter` are OpenAI built-in tools.
> Check [OpenAI docs](https://platform.openai.com/docs/api-reference/responses/create#responses-create-tools) for the full list and any extra config they need.

---

### Add a Custom Tool (Your Own Function)

If you want the assistant to call your own backend function, add a `function` tool:

```ts
tools = [
  {
    type: "function",
    name: "get_order_status", // name your function
    description: "Look up the status of a customer order by order ID.",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID to look up" },
      },
      required: ["order_id"],
    },
  },
];
```

Then handle the function call result in `runOpenAIRequest.ts` — OpenAI will return a `function_call` event and you respond with the result.

---

## Common Tasks

### Add a New Setting to the Widget

1. Add it to `src/chat/types.ts` in the `ChatWidgetProps` type
2. Add a default value in `src/chat/defaults.ts` (if needed)
3. Use it in `src/chat/ChatWidget.tsx` (accept the prop, pass to components)
4. Update your component (e.g., `ChatPanel` or `ChatLauncher`) to use it

**Example:** Add a custom welcome message:

```tsx
// src/chat/types.ts
export type ChatWidgetProps = OpenAIResponsesAdapterOptions & {
  welcomeMessage?: string; // Add this
  // ... rest of props
};

// src/chat/defaults.ts
export const DEFAULT_WELCOME_MESSAGE =
  "Ask about pricing, support, or onboarding.";

// src/chat/ChatWidget.tsx
const welcomeMessage = props.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
// Pass to ChatPanel or Thread as needed
```

### Debug API Calls

The adapter (request handler) is in `src/chat/adapter/`:

- `createOpenAIResponsesAdapter.ts` - Main logic
- `runOpenAIRequest.ts` - Calls OpenAI API
- `runEndpointRequest.ts` - Calls your own backend
- `buildRequestBody.ts` - Builds the request
- `resolvePath.ts` - Extracts response text

**To debug:**

1. Add `console.log()` in the file you think the issue is
2. Run `npm run dev`
3. Open DevTools (F12) → Console tab
4. Test the widget, watch logs

### Change Widget Appearance

All styles are in CSS files:

- `src/widget.css` - Main widget styles (panel, launcher, buttons)
- `src/App.css` - Demo page styles (not part of the widget)
- `src/index.css` - Base styles

Update colors or sizes directly in the CSS. The widget uses CSS custom properties (variables) so you can theme it:

```css
.sea-chat-widget {
  --sea-accent-a: #dc2626; /* Change this color */
  --sea-accent-b: #be123c; /* And this one */
}
```

### Fix a Bug

1. Find where the issue is (see the structure above)
2. Read the file - it's written to be simple
3. Add `console.log()` to see what's happening
4. Run `npm run dev` and test
5. Once fixed, run `npm run lint` to check code style
6. Run `npm run build:all` to make sure it still compiles

### Add a Feature (e.g., Send Button Styling)

1. **Find the component:** Is it in `ChatPanel`, `ChatLauncher`, or `ChatWidget`?
2. **Add the prop:** Update `src/chat/types.ts`
3. **Add defaults:** Update `src/chat/defaults.ts` if needed
4. **Use it:** Update the component file
5. **Test:** `npm run dev` and check it works
6. **Validate:** `npm run build:all`

## Understanding the Code

### useState and useEffect (Simple React)

This project uses only `useState` because it's simple to understand:

```tsx
// This is how we track if the chat is open or closed
const [isOpen, setIsOpen] = useState(false);

// When the button is clicked, toggle open/closed
function handleToggle() {
  setIsOpen(!isOpen);
}
```

No fancy hooks or context - just state that changes when buttons are clicked.

### Types (TypeScript)

All the data shapes are defined in one place: `src/chat/types.ts`. When you change one, TypeScript tells you everywhere else you need to update. This makes changes safe.

### No Magic - Just Functions

Everything is a function that:

1. Takes some data in (props or arguments)
2. Does something (renders UI, makes API call, etc.)
3. Returns a result

There's no magic middleware, no global state library, no decorators. Just plain React and fetch.

## Troubleshooting

### "Widget not configured" error

You didn't pass `openaiApiKey` or `endpointUrl`. Add one:

```tsx
<ChatWidget openaiApiKey="sk-..." />
// or
<ChatWidget endpointUrl="https://your-api.com/chat" />
```

### Blank widget

1. Check your API key is valid (not "sk-..." or empty)
2. Open DevTools → Console, look for red errors
3. Try the demo locally: `npm run dev`

### Styling looks broken

The widget uses Shadow DOM. Make sure:

1. You're not hiding `.sea-chat-widget` with CSS
2. You didn't delete `src/widget.css`
3. Check that the CSS files are being imported

### Build fails

Run these in order:

```bash
npm install                # Make sure dependencies are installed
npm run lint               # Fix any code style issues
npm run build:all          # Try building everything
```

## Development Workflow

### Make a change:

```bash
npm run dev        # Watch mode (auto-reload)
```

### Before you commit:

```bash
npm run lint       # Check code style
npm run build:all  # Make sure it builds
```

### Quick validation:

```bash
npm run build      # Just the demo app
npm run build:widget  # Just the widget bundle
```

## File Quick Reference

| File                                               | What It Does                           |
| -------------------------------------------------- | -------------------------------------- |
| `src/chat/ChatWidget.tsx`                          | Main widget, manages open/closed state |
| `src/chat/components/ChatPanel.tsx`                | The chat box that appears              |
| `src/chat/components/ChatLauncher.tsx`             | The floating button                    |
| `src/chat/adapter/createOpenAIResponsesAdapter.ts` | Creates the API client                 |
| `src/chat/adapter/runOpenAIRequest.ts`             | Calls OpenAI API                       |
| `src/chat/adapter/runEndpointRequest.ts`           | Calls your own backend API             |
| `src/chat/types.ts`                                | All TypeScript types and interfaces    |
| `src/chat/defaults.ts`                             | Default values for props               |
| `src/demo/DemoPage.tsx`                            | The demo/test page                     |
| `src/App.tsx`                                      | App entry point                        |
| `src/embeddable.tsx`                               | Widget bundle entry point              |

## Need Help?

- **Types don't match:** Check `src/chat/types.ts` - that's the contract
- **Component not updating:** Check `useState` in the component
- **API not working:** Check `src/chat/adapter/` files and your API key
- **Styles broken:** Check `src/widget.css` and CSS custom properties
- **Build fails:** Run `npm install` then `npm run lint`

## Environment Variables

Create a `.env.local` file (or add to your deployment):

```
VITE_OPENAI_API_KEY=sk-your-key-here
```

Never commit real API keys. Use environment variables in production.

---

**Happy coding!** If you get stuck, start with the simplest file that does the thing you want to change, add `console.log()`, run `npm run dev`, and watch what happens.
