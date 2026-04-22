import type { MessageHistory } from "./types";

export function buildRequestBody(
  template: unknown,
  userText: string,
  history: MessageHistory,
): unknown {
  if (typeof template === "string") {
    return template
      .replace(/\{\{message\}\}/g, userText)
      .replace(/\{\{prompt\}\}/g, userText)
      .replace(/\{\{userInput\}\}/g, userText)
      .replace(/\{\{messages\}\}/g, JSON.stringify(history));
  }

  if (Array.isArray(template)) {
    // "const" = the array itself doesn't change (we only push into it, not replace it)
    const list = [];
    // "let" = index changes each loop step
    let index = 0;

    while (index < template.length) {
      list.push(buildRequestBody(template[index], userText, history));
      index += 1;
    }

    return list;
  }

  if (template !== null && typeof template === "object") {
    // "const" = we never replace these variables, only read or fill them
    const source = template as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key in source) {
      result[key] = buildRequestBody(source[key], userText, history);
    }

    return result;
  }

  return template;
}
