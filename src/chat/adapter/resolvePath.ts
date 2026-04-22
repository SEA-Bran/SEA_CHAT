// This function digs into a JSON object using a dot path like "data.response.text"
// Example: resolvePath({ data: { text: "Hello" } }, "data.text") → "Hello"
export function resolvePath(value: unknown, path: string): string {
  // "const" = this value never changes after it is set
  // Turn array notation like "items[0]" into dot notation "items.0" so we can split on dots
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");

  // Split "data.response.text" into ["data", "response", "text"]
  const parts = normalizedPath.split(".");

  // "let" = this value WILL change as we walk deeper into the object
  let current = value;
  let i = 0;

  while (i < parts.length) {
    // "const" inside loop = this only holds the current key name, doesn't change within one loop step
    const part = parts[i];

    if (!part) {
      i += 1;
      continue;
    }

    if (current === null || typeof current !== "object") {
      return "";
    }

    current = (current as Record<string, unknown>)[part];
    i += 1;
  }

  if (typeof current === "string") {
    return current;
  }

  if (current === undefined || current === null) {
    return "";
  }

  return JSON.stringify(current);
}
