import type { Message } from "@/types.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: message parts are a large discriminated union
function renderPart(part: any): string {
  if (part.type === "text") {
    return `<div class="text">${escapeHtml(part.text ?? "")}</div>`;
  }

  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    const toolName = part.type.slice("tool-".length);
    const input = part.input !== undefined ? stringifyValue(part.input) : "";
    const output =
      part.state === "output-available"
        ? stringifyValue(part.output)
        : "(pending)";

    return `
      <details class="tool">
        <summary>🔧 ${escapeHtml(toolName)}</summary>
        ${input ? `<pre class="tool-input">${escapeHtml(input)}</pre>` : ""}
        <pre class="tool-output">${escapeHtml(output)}</pre>
      </details>
    `;
  }

  return "";
}

function renderMessage(msg: Message): string {
  // biome-ignore lint/suspicious/noExplicitAny: parts/createdAt aren't on the base Message type
  const anyMsg = msg as any;
  const partsHtml: string[] = Array.isArray(anyMsg.parts)
    ? anyMsg.parts.map(renderPart).filter(Boolean)
    : [];

  const body = partsHtml.length
    ? partsHtml.join("\n")
    : `<div class="text">${escapeHtml(anyMsg.content ?? "")}</div>`;

  const time = anyMsg.createdAt
    ? new Date(anyMsg.createdAt).toLocaleString()
    : "";

  return `
    <article class="message role-${escapeHtml(msg.role)}">
      <header>
        <span class="role">${escapeHtml(msg.role)}</span>
        <span class="time">${escapeHtml(time)}</span>
      </header>
      <div class="body">${body}</div>
    </article>
  `;
}

export function renderConversationToHtml(
  messages: Message[],
  title: string,
): string {
  const body = messages.map(renderMessage).join("\n");
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1a1a1a; --muted: #666666;
    --user-bg: #eef4ff; --assistant-bg: #f6f6f6; --system-bg: #fff8e6;
    --border: #e2e2e2; --code-bg: rgba(127,127,127,.10);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #161616; --fg: #eaeaea; --muted: #9a9a9a;
      --user-bg: #132033; --assistant-bg: #1f1f1f; --system-bg: #2a2410;
      --border: #333333; --code-bg: rgba(127,127,127,.14);
    }
  }
  * { box-sizing: border-box; }
  body {
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    max-width: 860px; margin: 2rem auto; padding: 0 1rem 4rem;
  }
  h1 { font-size: 1.15rem; color: var(--muted); font-weight: 600; margin-bottom: .25rem; }
  .meta { font-size: .8rem; color: var(--muted); margin-bottom: 1.5rem; }
  .message {
    border: 1px solid var(--border); border-radius: 10px;
    padding: .75rem 1rem; margin-bottom: 1rem;
  }
  .role-user { background: var(--user-bg); }
  .role-assistant { background: var(--assistant-bg); }
  .role-system { background: var(--system-bg); }
  header {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: .72rem; color: var(--muted); margin-bottom: .5rem;
    text-transform: uppercase; letter-spacing: .05em;
  }
  .text { white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; }
  .tool {
    margin: .5rem 0; border: 1px solid var(--border); border-radius: 6px;
    padding: .4rem .6rem;
  }
  .tool summary { cursor: pointer; font-size: .85rem; }
  .tool pre {
    overflow-x: auto; font-size: .78rem; background: var(--code-bg);
    padding: .5rem; border-radius: 6px; margin: .4rem 0 0;
  }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">Generated locally by ai-chat-share-cli on ${escapeHtml(generatedAt)} · nothing in this file was uploaded anywhere.</div>
${body}
</body>
</html>`;
}

export function slugify(text: string): string {
  const slug = (text || "conversation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return slug || "conversation";
}
