import { Marked } from "marked";
import type { Message } from "@/types.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Assistant text can quote arbitrary content (web pages, tool output) that
// might contain raw HTML. Render markdown normally, but escape any literal
// HTML in the source instead of passing it through — otherwise a quoted
// <script> tag would become live, executable markup in the output file.
const markdown = new Marked({ gfm: true, breaks: true });
markdown.use({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});

function renderMarkdown(text: string): string {
  return markdown.parse(text, { async: false }) as string;
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderText(text: string, role: string): string {
  return role === "assistant"
    ? `<div class="markdown">${renderMarkdown(text)}</div>`
    : `<div class="text">${escapeHtml(text)}</div>`;
}

// biome-ignore lint/suspicious/noExplicitAny: message parts are a large discriminated union
function renderPart(part: any, role: string): string {
  if (part.type === "text") {
    return renderText(part.text ?? "", role);
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
    ? anyMsg.parts.map((p: any) => renderPart(p, msg.role)).filter(Boolean)
    : [];

  const body = partsHtml.length
    ? partsHtml.join("\n")
    : renderText(anyMsg.content ?? "", msg.role);

  const time = anyMsg.createdAt
    ? new Date(anyMsg.createdAt).toLocaleString()
    : "";

  const roleLabel = anyMsg._originKind
    ? `${msg.role} · ${anyMsg._originKind}`
    : msg.role;

  // System (automated) messages are usually noise — skill preambles, task
  // notifications, command echoes — so collapse them by default. The role
  // and timestamp stay visible either way.
  const bodyHtml =
    msg.role === "system"
      ? `<details class="collapsed-body"><summary>Show content</summary>${body}</details>`
      : `<div class="body">${body}</div>`;

  return `
    <article class="message role-${escapeHtml(msg.role)}">
      <header>
        <span class="role">${escapeHtml(roleLabel)}</span>
        <span class="time">${escapeHtml(time)}</span>
      </header>
      ${bodyHtml}
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
  .collapsed-body summary {
    cursor: pointer; font-size: .8rem; color: var(--muted);
  }
  .collapsed-body[open] summary { margin-bottom: .5rem; }
  .markdown :first-child { margin-top: 0; }
  .markdown :last-child { margin-bottom: 0; }
  .markdown { line-height: 1.55; word-wrap: break-word; }
  .markdown p { margin: 0 0 .75em; }
  .markdown ul, .markdown ol { margin: 0 0 .75em; padding-left: 1.4em; }
  .markdown li { margin: .2em 0; }
  .markdown a { color: inherit; text-decoration-color: var(--muted); }
  .markdown code {
    background: var(--code-bg); padding: .1em .35em; border-radius: 4px;
    font-size: .85em;
  }
  .markdown pre {
    background: var(--code-bg); padding: .6em .8em; border-radius: 6px;
    overflow-x: auto; margin: 0 0 .75em;
  }
  .markdown pre code { background: none; padding: 0; }
  .markdown blockquote {
    margin: 0 0 .75em; padding-left: .8em; border-left: 3px solid var(--border);
    color: var(--muted);
  }
  .markdown h1, .markdown h2, .markdown h3, .markdown h4 {
    margin: 1em 0 .4em; line-height: 1.3;
  }
  .markdown table { border-collapse: collapse; margin: 0 0 .75em; font-size: .9em; }
  .markdown th, .markdown td { border: 1px solid var(--border); padding: .3em .6em; }
  .markdown hr { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
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
