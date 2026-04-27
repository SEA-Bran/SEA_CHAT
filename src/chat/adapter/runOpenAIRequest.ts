import type { OpenAIDirectOptions } from "./types";

type OpenAIRequestState = {
  previousResponseId: string | null;
};

function isPreviousResponseNotFoundError(
  status: number,
  bodyText: string,
): boolean {
  if (status < 400) {
    return false;
  }

  const text = bodyText.toLowerCase();

  return (
    (text.includes("previous response") && text.includes("not found")) ||
    (text.includes("previous_response_id") && text.includes("not found"))
  );
}

export async function runOpenAIRequest(
  options: OpenAIDirectOptions,
  userText: string,
  abortSignal: AbortSignal,
  state: OpenAIRequestState,
): Promise<string> {
  if (!options.openaiApiKey) {
    throw new Error("openaiApiKey is required");
  }

  let tools:
    | Array<{ type: "file_search"; vector_store_ids: string[] }>
    | undefined;

  if (options.vectorStoreId) {
    tools = [
      {
        type: "file_search" as const,
        vector_store_ids: [options.vectorStoreId],
      },
    ];
  }

  async function runRequest(
    includePreviousResponseId: boolean,
  ): Promise<Response> {
    const requestBody: Record<string, unknown> = {
      model: options.model ?? "gpt-4.1",
      input: userText,
      stream: true,
    };

    if (options.instructions) {
      requestBody.instructions = options.instructions;
    }

    if (includePreviousResponseId && state.previousResponseId) {
      requestBody.previous_response_id = state.previousResponseId;
    }

    if (tools) {
      requestBody.tools = tools;
    }

    return fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + options.openaiApiKey,
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });
  }

  let response = await runRequest(true);

  if (!response.ok) {
    const errorBody = await response.text();

    if (
      state.previousResponseId &&
      isPreviousResponseNotFoundError(response.status, errorBody)
    ) {
      // OpenAI discards old response IDs after retention windows.
      // Clear local linkage and retry once as a fresh turn.
      state.previousResponseId = null;
      response = await runRequest(false);
    } else {
      throw new Error(
        "OpenAI Responses API error " + response.status + ": " + errorBody,
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      "OpenAI Responses API error " +
        response.status +
        ": " +
        (await response.text()),
    );
  }

  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let responseId: string | null = null;
  let buffer = "";

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      break;
    }

    buffer += decoder.decode(chunk.value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (!line.startsWith("data: ")) {
        continue;
      }

      const data = line.slice(6).trim();

      if (data === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;

        if (
          parsed.type === "response.created" &&
          parsed.response &&
          typeof (parsed.response as Record<string, unknown>).id === "string"
        ) {
          responseId = (parsed.response as Record<string, unknown>)
            .id as string;
        }

        if (
          parsed.type === "response.output_text.delta" &&
          typeof parsed.delta === "string"
        ) {
          fullText += parsed.delta;
        }
      } catch {
        // Ignore malformed SSE lines.
      }
    }
  }

  if (responseId) {
    state.previousResponseId = responseId;
  }

  return fullText;
}
