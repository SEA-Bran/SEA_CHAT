# Chat Widget UI Spec

## Document Purpose

This document is the source of truth for building a compact chat widget UI similar to an embedded support assistant opened from the bottom-right corner of a page.

It is written for spec-driven development with Copilot so implementation, review, and iteration stay aligned to explicit requirements.

## Document Map

- `SPEC.md`: product and UX requirements (this file)
- `STATUS.md`: implementation progress and completion state
- `ROADMAP.md`: phased plan and integration next steps
- `OPEN_QUESTIONS.md`: unresolved product and technical decisions
- `IMPLEMENTATION.md`: deep implementation details and developer notes

## Product Goal

Build a polished web chat widget that:

- starts as a floating launcher button
- opens into a compact chat panel
- supports a responsive mobile and desktop layout
- feels modern, fast, and trustworthy
- can later connect to a real backend without major UI refactoring

## Non-Negotiable Core Requirement

The widget must be embeddable on third-party websites.

- It must load by adding a JavaScript file to another website.
- It must support CDN hosting and script reference usage.
- It must initialize with a global browser API after script load.
- This requirement is fixed and cannot be changed.

## Non-Negotiable Runtime Request Requirement

After the user sends a message, the widget must send that message to a configured URL via AJAX/fetch and wait for the response.

- The target URL is externally configurable.
- The target may be OpenAI, Google, or any other HTTP endpoint.
- Request body and headers must be configurable.
- Response text mapping must be configurable from the returned payload.
- This requirement is fixed and cannot be changed.

## Scope

### In Scope

- Floating chat launcher
- Open and close animation
- Header with title, status, and close action
- Scrollable message list
- Distinct user and assistant message styles
- Composer with multiline input and send button
- Loading state for assistant reply
- Starter prompts / empty state
- Basic accessibility support
- Mobile-safe layout behavior
- Embeddable script entrypoint for external websites
- Global initialization API for host pages
- Configurable outbound request URL/body/headers for message processing

### Out of Scope for V1

- Authentication
- File upload
- Voice input
- Rich markdown rendering
- Streaming from a real backend
- Chat persistence across browser sessions
- Agent orchestration logic

## Primary User Story

As a user,
I want to open a small chat widget from any page,
so that I can ask questions without leaving the current experience.

## UX Requirements

### Launcher

- Fixed position at bottom-right on desktop
- Clearly visible and tappable on mobile
- Rounded and brandable
- Shows unread badge placeholder support in structure, even if not active in V1

### Panel

- Opens above the launcher
- Desktop width target: 360px to 420px
- Desktop height target: 560px to 680px
- Mobile behavior: near full-screen with safe spacing
- Rounded top corners and elevated surface
- Subtle entrance animation, no heavy motion

### Header

- Assistant name
- Availability / status text
- Close button
- Optional subtitle area for future trust or help text

### Message List

- Assistant messages align left
- User messages align right
- Maintain readable line length
- Auto-scroll to latest message on send / receive
- Empty state shows suggested first prompts

### Composer

- Multiline textarea
- Enter sends, Shift+Enter adds a new line
- Send button disabled when input is empty
- Loading state disables repeat sends while the API response is pending

## Visual Direction

The UI should resemble a production support or assistant widget, not a generic demo.

- Clean, bright palette
- Strong contrast for text
- Distinct surfaces for page background, widget chrome, assistant bubbles, and user bubbles
- Intentional typography
- Subtle shadow and gradient accents
- Small but meaningful motion for open, close, and message reveal

## Technical Direction

### Recommended Stack

- React
- TypeScript
- Vite
- Plain CSS or CSS modules for simple control over the widget styling

### State Model

- `isOpen`: widget visibility
- `messages`: ordered list of chat items
- `input`: current draft message
- `isTyping`: assistant loading state

### Message Shape

```ts
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};
```

## Interaction Rules

1. Page loads with launcher visible and panel closed.
2. User taps launcher to open panel.
3. Empty panel shows greeting and suggested prompts.
4. User sends a message.
5. Message appears immediately in the transcript.
6. Assistant typing state appears while request is in progress.
7. Assistant response renders after a short delay.
8. Transcript scrolls to newest item.

## Accessibility Requirements

- Keyboard accessible launcher, close button, input, and send button
- Visible focus states
- Sufficient color contrast
- Semantic labels for interactive elements
- Reasonable screen-reader text for status and message regions

## Acceptance Criteria

### V1 Complete When

- The project runs locally in development
- The launcher opens and closes the widget reliably
- The message area supports a realistic conversation flow
- Empty, typing, and populated states are implemented
- The layout works on both mobile and desktop sizes
- Basic accessibility checks pass by inspection
- A host website can render the widget via script include and JS initialization

## Implementation Note For Copilot

When generating code from this spec:

- prefer small, composable components
- keep request handling separate from presentation
- keep runtime request mapping configurable
- preserve embeddable behavior and API-driven send flow
