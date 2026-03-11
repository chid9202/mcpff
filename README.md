# mcpff — MCP Flip-Flop 🔄

> Toggle MCP server configurations on/off across AI clients. Stop burning tokens on servers you're not using.

## The Problem

Every MCP server's tool definitions get injected into the AI's system prompt, consuming tokens on every request — even when the tools aren't used. With 5+ MCP servers configured, this adds up fast. Today, the only way to "disable" a server is to manually edit JSON config files and delete the entry, losing the configuration.

## The Solution

`mcpff` discovers MCP configs across all AI clients on your machine, lets you toggle servers on/off (preserving their config), and keeps everything backed up.

## Install

```bash
npm install -g mcpff
```

Or run without installing:

```bash
npx mcpff
```

## Quick Start

```bash
# Interactive mode — browse and toggle servers with arrow keys
mcpff

# See all your MCP servers across all clients
mcpff list

# Disable a server you're not using (config is preserved)
mcpff off playwright

# Re-enable it later
mcpff on playwright

# Toggle (flip) a server's state
mcpff flip sequential-thinking

# Disable all servers except the one you need
mcpff off --all --except supabase-db

# Re-enable everything
mcpff on --all
```

## Interactive Mode

Just run `mcpff` with no arguments to launch the interactive TUI:

```
  mcpff — interactive mode
  ↑/↓ navigate · space toggle · q quit

     CLIENT          SCOPE                    SERVER              STATUS
     ──────────────────────────────────────────────────────────────────────
 ❯   claude-code     user                     supabase-db         ● ON
     claude-desktop  global                   playwright          ● ON
     cursor          user                     postgres            ○ OFF
     cursor          user                     sequential-thinking ● ON
     openclaw        workspace: workspace     supabase            ● ON

     5 servers · 4 on · 1 off

  ✓ postgres → ON
```

Arrow keys (or j/k) to navigate, **space** or **enter** to toggle, **q** to quit. Changes apply immediately.

Falls back to `mcpff list` in non-interactive (piped) contexts.

## Commands

### `mcpff` (no args)

Launch interactive mode. Browse all servers and toggle them on/off in real time.

### `mcpff list`

List all MCP servers across all supported clients.

```
$ mcpff list

  CLIENT          SCOPE                       SERVER                STATUS
  ────────────────────────────────────────────────────────────────────────────
  claude-code     user                        supabase-db           ● ON
  claude-code     project: UpPhish            playwright            ● ON
  claude-desktop  global                      playwright            ○ OFF
  cursor          user                        postgres              ● ON
  codex           user                        my-server             ● ON
  openclaw        workspace: workspace-dev    notion                ● ON

  6 servers total · 5 active · 1 disabled
```

**Options:**
- `--client <name>` — Filter by client (e.g., `claude-code`, `cursor`, `codex`)
- `--workspace <name>` — Filter by registered workspace

### `mcpff off <server>`

Disable an MCP server. The config is saved to `~/.mcpff/disabled/` and can be restored at any time.

```bash
mcpff off playwright                      # Disable in all clients
mcpff off playwright --client cursor      # Disable only in Cursor
mcpff off playwright --dry-run            # Preview what would change
mcpff off --all                           # Nuclear option: disable everything
mcpff off --all --except supabase-db      # Disable all except named servers
```

### `mcpff on <server>`

Re-enable a disabled server by restoring its config from the shadow file.

```bash
mcpff on playwright                       # Enable in all clients where it was disabled
mcpff on playwright --client cursor       # Enable only in Cursor
mcpff on --all                            # Re-enable everything
```

### `mcpff flip <server>`

Toggle a server's state — if it's on, turn it off; if it's off, turn it on.

```bash
mcpff flip sequential-thinking
```

### `mcpff workspace`

Register project directories for MCP server discovery. This finds project-level configs like `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json`.

```bash
mcpff workspace add ~/Dev/MyProject --name my-project
mcpff workspace list
mcpff workspace remove my-project
```

### `mcpff status`

Show a summary of your MCP server landscape.

```
$ mcpff status

  mcpff status
  ────────────────────────────────────────
  Servers:  21 total
  Active:   18
  Disabled: 3
  Clients:  4 (claude-code, claude-desktop, cursor, openclaw)
  Scopes:   9
```

### `mcpff backup` / `mcpff restore`

Manually create backups and restore from them.

```bash
mcpff backup                    # Create a backup of all config files
mcpff backup-list               # List available backups
mcpff restore 2026-03-10T15-44  # Restore from a specific backup
```

> **Note:** mcpff automatically creates backups before every toggle operation.

## Supported Clients

| Client | Config Location | Scope |
|--------|----------------|-------|
| **Claude Code** | `~/.claude.json`, `<project>/.mcp.json` | User, per-project, shared project |
| **Claude Desktop** | `~/Library/.../Claude/claude_desktop_config.json` | Global |
| **Cursor** | `~/.cursor/mcp.json`, `<project>/.cursor/mcp.json` | User, per-project |
| **Codex** (OpenAI) | `~/.codex/config.toml` (`[mcp_servers]`) | User |
| **Gemini CLI** | `~/.gemini/settings.json` (`mcpServers`) | User |
| **VS Code** | `~/Library/.../Code/User/settings.json` (`mcp.servers`), `<project>/.vscode/mcp.json` | User, per-project |
| **Antigravity** | `~/Library/.../Antigravity/User/settings.json` (`mcp.servers`), `<project>/.vscode/mcp.json` | User, per-project |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | User |
| **OpenClaw** | Auto-discovers from `~/.openclaw/openclaw.json` agent workspaces | Per-workspace |

Config paths shown are for macOS. Linux and Windows paths are handled automatically.

## How It Works

### Toggle Mechanism

When you disable a server:
1. The server entry is **removed** from the client's config file
2. The full config is **saved** to `~/.mcpff/disabled/<client>/<scope>/<server>.json`
3. A **backup** of the original config file is created

When you re-enable:
1. The config is **read** from the shadow file
2. **Re-inserted** into the client's config file
3. The shadow file is **deleted**

### Why remove instead of `"disabled": true`?

Most clients don't recognize a `disabled` field — they'd still try to load the server and inject its tools into the system prompt. Removing the entry from the config is the only universal way to actually stop token consumption.

### Safety

- **Automatic backups** before every modification
- **Atomic writes** — files are written to a temp path first, then renamed (no partial writes)
- **Dry run** — preview changes with `--dry-run`
- **Manual backup/restore** — full control over your configs

## File Structure

```
~/.mcpff/
├── config.json           # Registered workspaces, preferences
├── disabled/             # Shadow storage for disabled servers
│   ├── claude-code/
│   │   └── user/
│   │       └── supabase-db.json
│   ├── cursor/
│   │   └── user/
│   │       └── sequential-thinking.json
│   └── codex/
│       └── user/
│           └── my-server.json
└── backups/              # Auto-backup before any modification
    └── 2026-03-10T15-44-00/
        └── ...
```

## Development

```bash
git clone https://github.com/daehanchi/mcpff.git
cd mcpff
npm install
npm run build           # Compile TypeScript
npm run dev             # Watch mode
npm link                # Link globally for testing
mcpff                   # Launch interactive mode
```

## License

MIT
