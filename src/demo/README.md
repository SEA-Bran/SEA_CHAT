# Demo Page (`src/demo/`)

This folder has the demo/test page that shows the chat widget in action.

## What Is This?

The demo page is a test environment where you can:

- See the widget running in a real webpage
- Test different settings
- Verify it works before shipping
- Test responsive design (mobile, tablet, desktop)

## Files

### `DemoPage.tsx`

The demo page component. It shows:

- A title and description
- Three info cards explaining features
- The `ChatWidget` component with test settings

When you run `npm run dev`, this is what you see.

## How to Test the Widget

1. **Run the demo:**

   ```bash
   npm run dev
   ```

   Opens [http://localhost:5173](http://localhost:5173)

2. **You should see:**
   - A page with a title "Support chat that opens like a production widget"
   - Three cards explaining the widget
   - A floating red button in the bottom-right (the widget launcher)

3. **Click the button:**
   - The chat box should appear
   - Type a message
   - The widget should get a response (if your API key is valid)

4. **Test different screen sizes:**
   - Open DevTools (F12)
   - Click the phone icon to view mobile
   - Resize the window
   - The widget should stay in the corner and be readable

## How to Modify the Demo

### Change the widget settings

Edit `DemoPage.tsx`:

```tsx
<ChatWidget
  openaiApiKey={import.meta.env.VITE_OPENAI_API_KEY ?? ""}
  model="gpt-4.1"
  instructions="You are a helpful SEA support assistant. Be concise and professional."
  assistantName="My Custom Name" // Change this
  title="Ask me anything" // Change this
  statusText="Ready to help" // Change this
  launcherText="Click to chat" // Change this
/>
```

### Change the page title or description

Edit the JSX in `DemoPage.tsx`:

```tsx
<h1>Your new title here</h1>
<p className="page-preview__lede">Your description here</p>
```

### Add another widget

You can test multiple widgets on one page:

```tsx
<ChatWidget
  openaiApiKey={import.meta.env.VITE_OPENAI_API_KEY ?? ""}
  assistantName="Widget 1"
/>

<ChatWidget
  openaiApiKey={import.meta.env.VITE_OPENAI_API_KEY ?? ""}
  assistantName="Widget 2"
/>
```

Note: The second widget will be in the same corner, so you'd need to modify CSS to position them differently.

### Test with a custom API

Instead of OpenAI:

```tsx
<ChatWidget endpointUrl="https://your-api.com/chat" assistantName="My API" />
```

For an ASP.NET endpoint like `GetQueryResponse([FromBody] GeneralQueryRequest req)`, use:

```tsx
<ChatWidget
  endpointUrl="https://your-api-host/api/Chat/GetQueryResponse"
  method="POST"
  authKey="your-auth-key-value"
  authValue="your-auth-value"
  vectorStoreIds={["vs_support_docs"]}
  model="gpt-4.1"
  responsePath="Result"
  assistantName="My API"
/>
```

Simple setup:

1. Put your API URL in `endpointUrl`.
2. If needed, put auth key value in `authKey` (sent as HTTP header "AuthKey").
3. If needed, put auth value in `authValue` (sent as HTTP header "AuthValue").
4. Put vector store IDs in `vectorStoreIds`.
5. Put model name in `model`.
6. Keep `responsePath="Result"`.

The widget prioritizes this custom endpoint flow when `endpointUrl` is provided.

Default request body sent by the widget in this mode:

```json
{
  "userQuery": "<user text>",
  "vectorStoreIds": ["vs_support_docs"],
  "model": "gpt-4.1",
  "previousResponseId": "resp_abc123"
}
```

## Styling the Demo Page

The demo page has its own styles in `src/App.css`. The widget has its own styles in `src/widget.css`.

- **Page background, title, cards:** Edit `src/App.css`
- **Widget appearance:** Edit `src/widget.css`

## Quick Testing Checklist

Before you share the widget, test:

- [ ] Button appears in bottom-right corner
- [ ] Button changes icon when opened (✦ → −)
- [ ] Chat box slides in smoothly
- [ ] Can type a message
- [ ] Widget responds (from API)
- [ ] Can close the chat box
- [ ] Works on mobile (DevTools mobile view)
- [ ] No console errors (DevTools → Console)

## Common Issues During Testing

### Widget doesn't appear

- Check that `npm run dev` is running
- Check the browser console (F12) for errors
- Make sure you're viewing port 5173

### Can't send messages

- For OpenAI direct mode: check `VITE_OPENAI_API_KEY` in `.env.local`
- For custom endpoint mode: check `VITE_GENERAL_QUERY_ENDPOINT_URL`, `VITE_GENERAL_QUERY_AUTH_KEY`, `VITE_GENERAL_QUERY_AUTH_VALUE`, `VITE_GENERAL_QUERY_API_KEY`, `VITE_GENERAL_QUERY_USER_ROLE`, and `VITE_GENERAL_QUERY_MODEL`
- Check DevTools → Network tab - are there API calls?
- Check DevTools → Console for errors

### Widget appears but looks wrong

- Check `src/widget.css` - is it broken?
- Check `src/App.css` - might be overriding styles
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

### Page looks broken

- Check `src/App.css` - edit there
- Reload the page (F5)
- Check for TypeScript errors: `npm run lint`

## Next Steps

Once the demo works:

1. Run `npm run build:all` to create the production bundle
2. The widget bundle will be in `dist-widget/sea-chat-widget.js`
3. Use that file in your real website

---

**Pro tip:** Keep the demo page simple. Use it only to test the widget works. The real tests are when you embed it in your actual website.
