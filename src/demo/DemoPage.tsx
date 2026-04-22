import { ChatWidget } from "../chat/ChatWidget";

export function DemoPage() {
  const endpointUrl = import.meta.env.VITE_GENERAL_QUERY_ENDPOINT_URL ?? "";
  const encryptedApiKey = import.meta.env.VITE_GENERAL_QUERY_API_KEY ?? "";
  const assistantId = import.meta.env.VITE_GENERAL_QUERY_ASSISTANT_ID ?? "";

  return (
    <main className="app-shell">
      <section className="page-preview" aria-label="Demo page preview">
        <div className="page-preview__eyebrow">Embeddable assistant demo</div>
        <h1>Support chat that opens like a production widget.</h1>
        <p className="page-preview__lede">
          This demo page simulates a product surface with an assistant launcher
          in the corner. Open the widget to test the conversation flow,
          suggestions, typing state, and responsive layout.
        </p>

        <div className="page-preview__grid">
          <article className="info-card">
            <span>Fast answers</span>
            <strong>Guide users without leaving the page.</strong>
          </article>
          <article className="info-card">
            <span>Simple state</span>
            <strong>Mock responses now, API integration later.</strong>
          </article>
          <article className="info-card">
            <span>Responsive shell</span>
            <strong>Works as a compact panel on desktop and mobile.</strong>
          </article>
        </div>
      </section>

      <ChatWidget
        endpointUrl={endpointUrl}
        method="POST"
        apiKey={encryptedApiKey}
        assistantId={assistantId}
        useGeneralQueryRequest
        responsePath="Result"
        fallbackErrorMessage="Unable to get query response from API."
      />
    </main>
  );
}
