import { buildRequestBody } from "./buildRequestBody";
import { resolvePath } from "./resolvePath";
import type { EndpointOptions, MessageHistory } from "./types";

export async function runEndpointRequest(
  options: EndpointOptions,
  userText: string,
  history: MessageHistory,
  abortSignal: AbortSignal,
): Promise<string> {
  if (!options.endpointUrl) {
    throw new Error("endpointUrl is required");
  }

  // "const" = these values are set once and never changed
  const method = options.method ?? "POST";
  const isGetQueryResponseEndpoint = /getqueryresponse/i.test(
    options.endpointUrl,
  );
  const hasGeneralQueryConfig =
    options.apiKey !== undefined || options.assistantId !== undefined;
  const shouldAutoUseGeneralQuery =
    hasGeneralQueryConfig || isGetQueryResponseEndpoint;
  const useGeneralQueryRequest =
    options.useGeneralQueryRequest ?? shouldAutoUseGeneralQuery;

  // "let" = responseBody may be replaced below if the user provided a template
  let responseBody = options.body;

  if (responseBody === undefined) {
    if (useGeneralQueryRequest) {
      responseBody = {
        ApiKey: options.apiKey ?? "",
        UserQuery: userText,
        AssistantId: options.assistantId ?? "",
      };
    } else {
      // No custom body provided — use a simple default with the user's message
      responseBody = { message: userText, prompt: userText };
    }
  } else {
    // Fill in any {{message}} or {{messages}} placeholders in the custom body
    responseBody = buildRequestBody(responseBody, userText, history, {
      apiKey: options.apiKey ?? "",
      assistantId: options.assistantId ?? "",
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

  if (options.responsePath) {
    // Extract the text from a specific path inside the JSON, e.g. "data.message"
    const text = resolvePath(json, options.responsePath);

    if (!text) {
      throw new Error(
        'responsePath "' + options.responsePath + '" returned empty result',
      );
    }

    return text;
  }

  if (useGeneralQueryRequest && json && typeof json === "object") {
    const apiResponse = json as Record<string, unknown>;
    const success = apiResponse.Success;
    const message = apiResponse.Message;
    const result = apiResponse.Result;

    if (success === false) {
      if (typeof message === "string" && message.length > 0) {
        throw new Error(message);
      }

      throw new Error("Endpoint returned Success=false");
    }

    if (typeof result === "string") {
      return result;
    }

    if (result === null || result === undefined) {
      if (typeof message === "string" && message.length > 0) {
        throw new Error(message);
      }

      throw new Error("Endpoint response Result is empty");
    }

    return String(result);
  }

  if (typeof json === "string") {
    return json;
  }

  return JSON.stringify(json);
}
