---
sujet: "mcp usage for Claude"
date: 2026-09-21
platform: tutorial
featured_image: images/2026-09-21-mcp-usage-for-claude.png
seo_title: "How to Connect MCP Servers to Claude for Tool Calls"
meta_description: "Connect MCP servers to Claude: local filesystem on Desktop, a remote HTTPS connector on claude.ai, per-chat approvals, and config mistakes that hide servers."
image_alt: "Walnut desk with manila folders and a brass key linked by copper filaments to a teal glass pavilion of small tools"
focus_keyword: "mcp"
seo_analysis:
  readability_score: "Green"
  seo_score: "Green"
  keyword_density: "2.2%"
  keyword_variations: ["mcp servers", "Model Context Protocol", "custom connector", "Claude Desktop"]
  internal_linking_suggestions:
    - "Prerequisites: revue skills Cursor Claude Code LinkedIn post"
    - "Step 7: Mirror the same MCP server in Claude Code: usage of LangSmith tutorial"
    - "Pitfalls: spec-driven development with AI blog"
  word_count: 1843
---

# How to Connect MCP Servers to Claude and Use Them in Chat

## Outcome

By the end of this tutorial you will have **MCP servers** wired into Claude in two complementary ways. On **Claude Desktop**, a local filesystem server will start with the app, and Claude will be able to list, read, and write files in folders you name, after you approve each tool call. On **claude.ai** (and Desktop, if you add it there too), you will register a **remote MCP** connector so Claude can reach a hosted server over HTTPS. You will also know how to inspect tools, enable them per conversation, and spot the usual config mistakes.

MCP is the Model Context Protocol: an open standard for exposing tools and data to an LLM. Claude does not magically “see” your disk or your SaaS apps. An MCP server advertises tools; Claude proposes a call; you approve; the server runs the action and returns a result into the chat.

## Prerequisites

- A Claude account. Remote custom connectors work on Free, Pro, Max, Team, and Enterprise. Free is limited to **one** custom connector.
- **Claude Desktop** on macOS or Windows, updated from the Claude menu → **Check for Updates…**
- **Node.js LTS** if you will run a local `npx` server (the filesystem example below)
- Comfort editing a JSON file and fully quitting a desktop app
- For a remote connector: the **HTTPS URL** of an MCP server you trust, reachable from the public internet (not only from your laptop)

If you work mainly in the terminal, keep **Claude Code** installed as well. Step 7 is optional and uses the same protocol with a different config surface.

## Step 1: Decide local MCP versus remote MCP

Pick the transport from the job, not from habit.

Use a **local MCP** server when the tool must touch your machine: files, a browser, a database socket, a private script. Claude Desktop starts that process for you from `claude_desktop_config.json`. The connection stays on your computer.

Use a **remote MCP** server when the tool already lives on the internet: Notion, GitHub, an internal HTTP service you host. You add it as a **custom connector**. Claude then talks to that URL from **Anthropic’s cloud**, even if you clicked “Add” inside Desktop or Cowork. A server behind a VPN, with no allowlist for Anthropic’s IPs, will fail even though your browser can open it.

I often see people paste a localhost URL into Connectors and then spend an hour debugging TLS. Localhost is for the JSON file on Desktop, not for remote connectors.

You can run both at once. Local servers never appear on claude.ai or Cowork. Remote connectors do.

## Step 2: Add a local filesystem MCP server on Claude Desktop

This is the shortest path to a real tool call.

Open **Claude Desktop**. Use the **Claude** item in the system menu bar (macOS) or the app menu (Windows), not the in-window account gear, then choose **Settings…**. Open the **Developer** tab and click **Edit Config**. Claude creates the file if it is missing:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Put a single server in `mcpServers`. Replace `username` with your account name. Keep **absolute** paths. Relative paths are a frequent silent failure.

macOS:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ]
    }
  }
}
```

Windows:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\username\\Desktop",
        "C:\\Users\\username\\Downloads"
      ]
    }
  }
}
```

What this does: Claude Desktop runs `npx` on launch. `-y` skips the npm prompt. `@modelcontextprotocol/server-filesystem` is the official filesystem server. Extra args are the only directories the server may touch. The process runs as **you**, so it can do anything those folders allow. Start with Desktop and Downloads. Do not point it at your whole home directory on the first try.

If you already have other entries under `mcpServers`, merge `filesystem` into that object. Do not replace a working config with a file that only contains this one server unless you intend to drop the others.

Prefer a reviewed package? **Settings → Extensions → Browse extensions**, then **Install**, and fill any API keys in the form. Desktop extensions bundle Node for many servers, so you may not need a system `node`. The JSON route above stays useful for servers that are not in the directory.

Save the file.

## Step 3: Restart Desktop and confirm the MCP tools

Config is read at startup. Closing the window is not enough. **Quit Claude Desktop completely** (Cmd+Q on macOS) and open it again.

In a new chat, click the **+** control on the composer (the control labeled for files, connectors, and more). Open **Connectors**, then **Manage connectors**. Select **filesystem**. You should see tools such as listing directories, reading files, writing files, and searching.

If the server is missing, stay here; do not start prompting yet. Open Developer settings again and check connection status. On macOS you can follow logs with:

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

Windows logs live under `%APPDATA%\Claude\logs`. `mcp.log` covers handshake failures. `mcp-server-filesystem.log` is the server’s stderr.

You can also run the same command Claude would run, to see install or path errors in the terminal:

```bash
npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop /Users/username/Downloads
```

A healthy start prints that the server is listening on stdio. Stop it with Ctrl+C. If `npx` cannot find Node, fix PATH, then relaunch Desktop from the dock or Start menu so it inherits the updated environment.

## Step 4: Run a first approved tool call

In a Desktop conversation with the filesystem connector enabled, ask something small and checkable:

> List the files on my Desktop, then write a short note called `mcp-check.txt` there that says MCP is connected.

Claude should propose a tool call (list, then write). Read the arguments. Confirm the path is inside a folder you allowed. Click **Allow** for this run. Prefer **Allow always** only after you trust both the server and that specific tool unsupervised.

When it finishes, open Finder or Explorer. `mcp-check.txt` should sit on the Desktop with that sentence. If Claude “succeeds” in chat but the file is missing, you approved a relative path or a different folder than the one you are looking at. Ask it to print the absolute path it used.

This approval step is the product. MCP is not a background daemon that silently rewrites your disk. Treat every write like a command you typed yourself.

## Step 5: Add a remote MCP connector on claude.ai

Next, connect a **hosted** server. You need its MCP HTTPS URL from the vendor or from your own deployment, for example `https://mcp.example.com/mcp`. Use a server you trust. A malicious remote MCP server can exfiltrate data you authorize and can try prompt injection through tool results.

For **Pro** and **Max**:

1. Open **Customize → Connectors**.
2. Click **+**, then **Add custom connector**.
3. Paste the MCP server URL.
4. If the server needs a pre-registered OAuth app, open **Advanced settings** and set the client id and secret.
5. Click **Add** and finish sign-in if a browser window appears.

For **Team** and **Enterprise**, an Owner (or Primary Owner) adds the connector first under **Organization settings → Connectors → Add**, hovering **Custom**, then **Web**. Members then open **Customize → Connectors**, find the custom entry, and click **Connect**.

If the server uses an API key instead of OAuth, choose **No sign-in** and put the key in **Request headers** (often `Authorization: Bearer …`). Claude stores the header value and does not show it again. You cannot set `Authorization` as a request header on an OAuth connector; OAuth already owns that header.

Claude will probe the URL and mark detected auth as **Detected** when it can. A private-network URL that only resolves on your Wi-Fi will not work here.

## Step 6: Enable MCP connectors for one conversation

Remote connectors are configured on the account. They are not all injected into every chat.

Click **+** at the lower left of the composer, then **Connectors**. Toggle only the servers this thread needs. Extra tools compete for attention and raise the chance of a surprising write.

Ask a question that can only succeed with that server (a specific Notion page, a GitHub issue, a ticket id). Watch the tool card. Check inputs before you approve. If you use **Research**, Claude may call connector tools without asking again; turn off write tools before you start a long research run.

## Step 7: Mirror the same MCP server in Claude Code (optional)

If your daily loop is the terminal, Claude Code speaks MCP too. Scopes differ: `local` is you in this project (default), `project` writes a shareable `.mcp.json`, `user` follows you everywhere.

Add a hosted HTTP server:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

Add a local stdio server. Put Claude Code flags **before** the name. Put the process command **after** `--`:

```bash
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest
```

Confirm health:

```bash
claude mcp list
```

You want `✔ Connected`. `! Needs authentication` means open a session and run `/mcp`, then authenticate. `✘ Failed to connect` is a URL, header, or process error; `claude mcp get <name>` prints more detail.

Project JSON must set `"type": "http"` (or `"sse"` / `"ws"`) on URL servers. An entry with only `"url"` is treated as stdio and skipped.

## Pitfalls

**The server never appears after Edit Config.** The JSON is invalid (trailing comma, smart quotes from a docs page), a path is relative, or Desktop was not fully quit. Validate the file, use absolute directories, then quit and reopen. Read `mcp.log` before changing ten settings at once.

**Windows `npx` dies with `ENOENT` and `${APPDATA}` in the path.** Expand environment variables in the server’s `env` block. A documented pattern is to set `APPDATA` to the real `C:\\Users\\you\\AppData\\Roaming\\` folder, plus any API keys that server needs. Install npm globally if `%APPDATA%\npm` does not exist.

**Remote connector stays disconnected.** The URL is HTTP, internal-only, or blocked to Anthropic’s egress. Host it on public HTTPS, or allowlist Anthropic’s published IP ranges. Do not confuse this with local MCP in `claude_desktop_config.json`.

**You clicked Allow always on a write tool.** A later prompt can drive that tool with arguments you did not expect, including prompt injection in fetched content. Revoke the connector under **Customize → Connectors** (or disconnect OAuth at the provider). Disable unused tools from the search-and-tools menu for the current chat.

## Recap

You now have a local **MCP** filesystem server on Claude Desktop, a verified file drop on the Desktop, and a remote connector path on claude.ai with per-chat toggles. Same protocol, two networks: your machine versus Anthropic’s cloud.

A useful next step is to add one server you already pay for (docs, issue tracker, or repo host), keep write tools off until a dry-run read looks right, then allow a single mutating tool with a tight approval habit.
