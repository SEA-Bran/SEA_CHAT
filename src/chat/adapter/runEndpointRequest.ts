import { buildRequestBody } from "./buildRequestBody";
import { resolvePath, resolvePathValue } from "./resolvePath";
import type { EndpointOptions, MessageHistory } from "./types";

type EndpointRequestState = {
  previousResponseId: string | null;
};

function getValueCaseInsensitive(
  source: Record<string, unknown>,
  key: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    return source[key];
  }

  const matchingKey = Object.keys(source).find(
    (currentKey) => currentKey.toLowerCase() === key.toLowerCase(),
  );

  if (!matchingKey) {
    return undefined;
  }

  return source[matchingKey];
}

function setPreviousResponseIdFromValue(
  value: unknown,
  state: EndpointRequestState,
): void {
  if (!value || typeof value !== "object") {
    return;
  }

  const source = value as Record<string, unknown>;
  const previousResponseId = getValueCaseInsensitive(
    source,
    "previousResponseId",
  );
  const responseId = getValueCaseInsensitive(source, "responseId");

  if (typeof previousResponseId === "string" && previousResponseId.length > 0) {
    state.previousResponseId = previousResponseId;
    return;
  }

  if (typeof responseId === "string" && responseId.length > 0) {
    state.previousResponseId = responseId;
  }
}

function extractTextFromValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const responseText = getValueCaseInsensitive(source, "responseText");

    if (typeof responseText === "string") {
      return responseText;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

export async function runEndpointRequest(
  options: EndpointOptions,
  userText: string,
  history: MessageHistory,
  abortSignal: AbortSignal,
  state: EndpointRequestState,
): Promise<string> {
  if (!options.endpointUrl) {
    throw new Error("endpointUrl is required");
  }

  // "const" = these values are set once and never changed
  const method = options.method ?? "POST";
  const hasCustomEndpointConfig =
    options.vectorStoreIds !== undefined || options.model !== undefined;
  const useCustomEndpointRequest =
    options.useCustomEndpointRequest ?? hasCustomEndpointConfig;

  // "let" = responseBody may be replaced below if the user provided a template
  let responseBody = options.body;

  if (responseBody === undefined) {
    if (useCustomEndpointRequest) {
      // Build the default request body with previous_response_id for multi-turn support
      // Only send the current user message, not the full history (conversation state is
      // maintained server-side via previous_response_id, improving cost and security)
      responseBody = {
        userQuery: userText,
        vectorStoreIds: options.vectorStoreIds ?? [],
      };

      if (state.previousResponseId) {
        (responseBody as Record<string, unknown>).previousResponseId =
          state.previousResponseId;
      }

      // Send full history only if the user has a custom template that explicitly requests it
    } else {
      // No custom body provided — use a simple default with the user's message
      responseBody = { message: userText, prompt: userText };
    }
  } else {
    // Fill in any {{message}} or {{messages}} placeholders in the custom body
    responseBody = buildRequestBody(responseBody, userText, history, {
      apiKey: options.apiKey ?? "",
      vectorStoreIds: options.vectorStoreIds ?? [],
      model: options.model ?? "",
      previousResponseId: state.previousResponseId ?? "",
    });
  }

  // "let" = url may have query params added to the end (for GET requests)
  let url = options.endpointUrl;

  // Start with the required Content-Type header
  // "const" = this object is never replaced, we only add entries to it
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Merge in any extra headers the caller provided
  if (options.headers) {
    for (const headerName in options.headers) {
      requestHeaders[headerName] = options.headers[headerName];
    }
  }

  // Add AuthKey and AuthValue headers if provided
  if (options.authKey) {
    requestHeaders["AuthKey"] = options.authKey;
  }

  if (options.authValue) {
    requestHeaders["AuthValue"] = options.authValue;
  }

  // Build the fetch options object
  // "const" = the object is never replaced; we may add .body below
  const requestOptions: RequestInit = {
    method: method,
    headers: requestHeaders,
    signal: abortSignal,
  };

  if (method === "GET") {
    // GET requests put data in the URL as ?key=value instead of the body
    const params = new URLSearchParams();

    if (responseBody && typeof responseBody === "object") {
      for (const key in responseBody as Record<string, unknown>) {
        const value = (responseBody as Record<string, unknown>)[key];
        params.set(key, String(value));
      }
    }

    url += "?" + params.toString();
  } else {
    // POST/PUT etc. put the data in the request body as JSON
    requestOptions.body = JSON.stringify(responseBody);
  }

  // Make the actual network request
  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(
      "Endpoint error " + response.status + ": " + (await response.text()),
    );
  }

  // Parse the JSON response
  const json = (await response.json()) as unknown;

  // Extract previousResponseId from the response if the endpoint provides it
  // (for multi-turn conversation support)
  setPreviousResponseIdFromValue(json, state);

  if (json && typeof json === "object") {
    const jsonObject = json as Record<string, unknown>;
    setPreviousResponseIdFromValue(
      getValueCaseInsensitive(jsonObject, "Result"),
      state,
    );
  }

  if (options.responsePath) {
    // Extract the text from a specific path inside the JSON, e.g. "data.message"
    const resolvedValue = resolvePathValue(json, options.responsePath);
    setPreviousResponseIdFromValue(resolvedValue, state);
    const text = extractTextFromValue(resolvedValue);

    if (!text) {
      throw new Error(
        'responsePath "' + options.responsePath + '" returned empty result',
      );
    }

    return text;
  }

  if (useCustomEndpointRequest && json && typeof json === "object") {
    const apiResponse = json as Record<string, unknown>;
    const success = apiResponse.Success;
    const message = apiResponse.Message;
    const result = apiResponse.Result;

    setPreviousResponseIdFromValue(result, state);

    if (success === false) {
      if (typeof message === "string" && message.length > 0) {
        throw new Error(message);
      }

      throw new Error("Endpoint returned Success=false");
    }

    if (result === null || result === undefined) {
      if (typeof message === "string" && message.length > 0) {
        throw new Error(message);
      }

      throw new Error("Endpoint response Result is empty");
    }

    return extractTextFromValue(result);
  }

  if (typeof json === "string") {
    return json;
  }

  return resolvePath(json, "responseText") || JSON.stringify(json);
}
