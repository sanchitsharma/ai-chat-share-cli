#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "@commander-js/extra-typings";
import { getProvider } from "@/providers";
import type { Message } from "@/types.js";
import { selectConversation } from "./tui";
import { isRunningInClaudeCode, renderActiveConversationToHtml } from "./utils/claude.js";
import { readFileOrStdin } from "./utils/file-utils.js";
import { renderConversationToHtml, slugify } from "./utils/render-html.js";

const program = new Command();

program
  .name("ai-chat-share-cli")
  .description(
    "Turn your Claude Code (and other) conversation logs into a self-contained local HTML file. Nothing is uploaded anywhere.",
  )
  .version("0.1.0");

// Main command: render a conversation to a local HTML file
program
  .argument(
    "[file]",
    "The path to the history file. Reads from stdin if not provided.",
  )
  .option(
    "-p, --provider <name>",
    "Specify the provider (e.g., claude, gemini)",
    "claude", // Default value
  )
  .option("-o, --output <path>", "Output HTML file path")
  .action(async (filepath, opts) => {
    // Resolve provider with friendly error handling
    const provider = getProvider(opts.provider);

    if (!filepath && !opts.output && isRunningInClaudeCode()) {
      const outPath = await renderActiveConversationToHtml(opts.output);
      printSuccess(outPath);
      return;
    }

    let messages: Message[];
    let title = "Conversation";

    if (filepath) {
      const content = await readFileOrStdin(filepath);
      messages = provider.convertToMessages(content);
      title = path.basename(filepath, path.extname(filepath));
    } else if (!process.stdin.isTTY) {
      // Handle piped input (e.g., ai-chat-share-cli < file.jsonl)
      const content = await readFileOrStdin();
      messages = provider.convertToMessages(content);
    } else {
      // Interactive mode
      const { conversations } = provider;

      if (conversations.length === 0) {
        console.log(`❌ No ${provider.displayName} conversations found.`);
        process.exit(1);
      }

      const selectedConv = await selectConversation(conversations);
      const content = fs.readFileSync(selectedConv.path, "utf-8");
      messages = provider.convertToMessages(content);
      title = selectedConv.title;
    }

    const html = renderConversationToHtml(messages, title);
    const outPath = path.resolve(opts.output || `${slugify(title)}.html`);
    fs.writeFileSync(outPath, html, "utf-8");

    printSuccess(outPath);
  });

function printSuccess(outPath: string): void {
  console.log("\n✅ Done — rendered locally, nothing was uploaded anywhere.");
  console.log(`📄 HTML saved to: ${outPath}`);
  console.log(`🔗 file://${outPath}`);
}

program.parse(process.argv);
