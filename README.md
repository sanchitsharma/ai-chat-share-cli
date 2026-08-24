# ai-chat-share-cli

Turn a Claude Code conversation log into a single, self-contained, offline HTML file you can open in a browser. **Nothing is uploaded anywhere** — no network calls, no third-party service, no link generation.

This is a fork of [wsxiaoys/claude-code-share](https://github.com/wsxiaoys/claude-code-share) (MIT licensed), stripped of its upload-to-[pochi.dev](https://getpochi.com) sharing feature and replaced with a purely local HTML renderer. All credit for the original conversation-parsing pipeline goes to the upstream project.

## Install

```bash
npm install -g ai-chat-share-cli
```

## Usage

```bash
# Inside a Claude Code session, render the active conversation:
ai-chat-share-cli
# or the short alias:
acs

# Render a specific conversation log:
ai-chat-share-cli path/to/conversation.jsonl

# Pipe one in:
cat conversation.jsonl | ai-chat-share-cli

# Choose the output path:
ai-chat-share-cli -o ~/Desktop/my-conversation.html
```

The output is a plain `.html` file written to disk (default: current directory). Open it directly in a browser — `file:///path/to/output.html`.

## What changed from upstream

- Removed `src/utils/pochi-api.ts` and every call site (the `POST https://app.getpochi.com/api/clips` upload).
- Removed the `statusline` subcommand (it only ever echoed a cached pochi share link).
- Added `src/utils/render-html.ts`: a local, dependency-free HTML renderer for the parsed conversation.
- Everything else — the Claude Code JSONL parser, the interactive conversation picker — is unchanged from upstream.

## License

MIT, same as upstream.
