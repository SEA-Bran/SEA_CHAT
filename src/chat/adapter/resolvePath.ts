// This function digs into a JSON object using a dot path like "data.response.text"
// Example: resolvePath({ data: { text: "Hello" } }, "data.text") → "Hello"
export function resolvePathValue(value: unknown, path: string): unknown {
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  const parts = normalizedPath.split(".");

  let current = value;
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (!part) {
      i += 1;
      continue;
    }

    if (current === null || typeof current !== "object") {
      return undefined;
    }

    const currentObject = current as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(currentObject, part)) {
      current = currentObject[part];
      i += 1;
      continue;
    }

    // Fall back to case-insensitive key matching so "Result" can resolve "result".
    const matchingKey = Object.keys(currentObject).find(
      (key) => key.toLowerCase() === part.toLowerCase(),
    );

    if (!matchingKey) {
      return undefined;
    }

    current = currentObject[matchingKey];
    i += 1;
  }

  return current;
}

export function resolvePath(value: unknown, path: string): string {
  const current = resolvePathValue(value, path);

  if (typeof current === "string") {
    return current;
  }

  if (current === undefined || current === null) {
    return "";
  }

  return JSON.stringify(current);
}
