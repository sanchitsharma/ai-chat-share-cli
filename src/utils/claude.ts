import fs from "node:fs";
import path from "node:path";
import { claude } from "@/providers/claude";
import type { Conversation } from "@/types.js";
import { renderConversationToHtml, slugify } from "./render-html.js";

export function isRunningInClaudeCode(): boolean {
  return process.env.CLAUDECODE === "1";
}

/**
 * Renders the active Claude Code conversation to a self-contained, local
 * HTML file. Nothing is sent over the network.
 * @returns The absolute path to the written HTML file.
 */
export async function renderActiveConversationToHtml(
  outputPath?: string,
): Promise<string> {
  const { conversations } = claude;

  if (conversations.length === 0) {
    console.log("❌ No Claude Code conversations found.");
    process.exit(1);
  }

  const conv = findActiveConversation(conversations);
  if (!conv) {
    console.log("❌ No valid conversation found.");
    process.exit(1);
  }

  const content = fs.readFileSync(conv.path, "utf-8");
  const messages = claude.convertToMessages(content);

  const title = conv.title || "Claude Code Conversation";
  const html = renderConversationToHtml(messages, title);
  const finalPath = path.resolve(outputPath || `${slugify(title)}.html`);
  fs.writeFileSync(finalPath, html, "utf-8");

  return finalPath;
}

/**
 * `~/.claude/projects` holds every Claude Code session on the machine, not
 * just this one — picking "most recently modified file" can pick up a
 * different, unrelated session if another one happens to be active at the
 * same time. Claude Code sets CLAUDE_CODE_SESSION_ID for the running
 * session, and each conversation file is named `<sessionId>.jsonl`, so
 * prefer matching on that. Falls back to newest-mtime if the env var isn't
 * set (e.g. running outside Claude Code despite CLAUDECODE being set).
 */
function findActiveConversation(
  conversations: Conversation[],
): Conversation | undefined {
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
  if (sessionId) {
    const match = conversations.find(
      (c) => path.basename(c.path, ".jsonl") === sessionId,
    );
    if (match) return match;
  }
  return conversations[0];
}
