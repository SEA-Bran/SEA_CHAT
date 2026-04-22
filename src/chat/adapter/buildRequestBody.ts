import type { MessageHistory } from "./types";

type RequestTemplateContext = {
  apiKey: string;
  userRole: string;
  model: string;
};

export function buildRequestBody(
  template: unknown,
  userText: string,
  history: MessageHistory,
  context?: RequestTemplateContext,
): unknown {
  const templateContext = context ?? {
    apiKey: "",
    userRole: "user",
    model: "",
  };

  if (typeof template === "string") {
    return template
      .replace(/\{\{message\}\}/g, userText)
      .replace(/\{\{prompt\}\}/g, userText)
      .replace(/\{\{userInput\}\}/g, userText)
      .replace(/\{\{userQuery\}\}/g, userText)
      .replace(/\{\{messages\}\}/g, JSON.stringify(history))
      .replace(/\{\{apiKey\}\}/g, templateContext.apiKey)
      .replace(/\{\{userRole\}\}/g, templateContext.userRole)
      .replace(/\{\{model\}\}/g, templateContext.model);
  }

  if (Array.isArray(template)) {
    // "const" = the array itself doesn't change (we only push into it, not replace it)
    const list = [];
    // "let" = index changes each loop step
    let index = 0;

    while (index < template.length) {
      list.push(
        buildRequestBody(template[index], userText, history, templateContext),
      );
      index += 1;
    }

    return list;
  }

  if (template !== null && typeof template === "object") {
    // "const" = we never replace these variables, only read or fill them
    const source = template as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key in source) {
      result[key] = buildRequestBody(
        source[key],
        userText,
        history,
        templateContext,
      );
    }

    return result;
  }

  return template;
}
