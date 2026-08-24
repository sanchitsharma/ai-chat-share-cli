import fs from "node:fs";
import path from "node:path";
import { claude } from "@/providers/claude";
import { renderConversationToHtml, slugify } from "./render-html.js";

export function isRunningInClaudeCode(): boolean {
  return process.env.CLAUDECODE === "1";
}

/**
 * Renders the most recent Claude Code conversation to a self-contained,
 * local HTML file. Nothing is sent over the network.
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

  // Most recent conversation (first in sorted array)
  const conv = conversations[0];
  if (!conv) {
    console.log("❌ No valid conversation found.");
    process.exit(1);
  }

  const content = fs.readFileSync(conv.path, "utf-8");
  const messages = claude.convertToMessages(content);

  const title = conv.title || "Claude Code Conversation";
  const html = renderConversationToHtml(messages, title);
  const finalPath = path.resolve(
    outputPath || `${slugify(title)}.html`,
  );
  fs.writeFileSync(finalPath, html, "utf-8");

  return finalPath;
}
