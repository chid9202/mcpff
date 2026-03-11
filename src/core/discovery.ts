import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { ClaudeCodeClient } from '../clients/claude-code.js';
import { ClaudeDesktopClient } from '../clients/claude-desktop.js';
import { CursorClient } from '../clients/cursor.js';
import { GeminiClient } from '../clients/gemini.js';
import { OpenClawClient } from '../clients/openclaw.js';
import { CodexClient } from '../clients/codex.js';
import { AntigravityClient } from '../clients/antigravity.js';
import { VscodeClient } from '../clients/vscode.js';
import { WindsurfClient } from '../clients/windsurf.js';
import { loadConfig } from './config.js';
import { getDisabledDir, readJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from '../clients/base.js';

// All supported client adapters
const claudeCode = new ClaudeCodeClient();
const claudeDesktop = new ClaudeDesktopClient();
const cursor = new CursorClient();
const gemini = new GeminiClient();
const openClaw = new OpenClawClient();
const codex = new CodexClient();
const antigravity = new AntigravityClient();
const vscode = new VscodeClient();
const windsurf = new WindsurfClient();

export const ALL_CLIENTS: McpClient[] = [
  claudeCode, claudeDesktop, cursor, gemini, openClaw,
  codex, antigravity, vscode, windsurf,
];

export function getClient(name: string): McpClient | undefined {
  return ALL_CLIENTS.find(c => c.name === name);
}

/**
 * Discover all MCP servers across all clients, including disabled ones.
 */
export async function discoverAll(options?: {
  client?: string;
  workspace?: string;
}): Promise<McpServer[]> {
  const servers: McpServer[] = [];
  const config = await loadConfig();

  // Filter clients if specified
  const clients = options?.client
    ? ALL_CLIENTS.filter(c => c.name === options.client)
    : ALL_CLIENTS;

  // 1. Discover from global configs
  for (const client of clients) {
    try {
      const discovered = await client.discover();
      servers.push(...discovered);
    } catch (err) {
      // Silently skip clients that fail to discover
      // (e.g., config file is malformed)
    }
  }

  // 2. Discover from registered workspaces
  const workspaces = options?.workspace
    ? config.workspaces.filter(w => w.name === options.workspace || w.path === options.workspace)
    : config.workspaces;

  for (const ws of workspaces) {
    // Claude Code shared project configs
    if (!options?.client || options.client === 'claude-code') {
      try {
        const shared = await claudeCode.discoverSharedProject(ws.path);
        servers.push(...shared);
      } catch { /* skip */ }
    }

    // Cursor project configs
    if (!options?.client || options.client === 'cursor') {
      try {
        const cursorServers = await cursor.discoverProject(ws.path);
        servers.push(...cursorServers);
      } catch { /* skip */ }
    }

    // Antigravity project configs (.vscode/mcp.json)
    if (!options?.client || options.client === 'antigravity') {
      try {
        const agServers = await antigravity.discoverProject(ws.path);
        servers.push(...agServers);
      } catch { /* skip */ }
    }

    // VS Code project configs (.vscode/mcp.json)
    if (!options?.client || options.client === 'vscode') {
      try {
        const vscodeServers = await vscode.discoverProject(ws.path);
        servers.push(...vscodeServers);
      } catch { /* skip */ }
    }

    // OpenClaw workspace configs
    if (!options?.client || options.client === 'openclaw') {
      try {
        const openclawServers = await openClaw.discoverWorkspace(ws.path);
        servers.push(...openclawServers);
      } catch { /* skip */ }
    }
  }

  // 3. Merge with disabled servers from ~/.mcpff/disabled/
  const disabledServers = await discoverDisabled(options?.client);
  
  // Add disabled servers that aren't already in the active list
  for (const disabled of disabledServers) {
    const exists = servers.some(
      s => s.name === disabled.name && s.client === disabled.client && s.scope === disabled.scope
    );
    if (!exists) {
      servers.push(disabled);
    }
  }

  return servers;
}

/**
 * Discover disabled servers from ~/.mcpff/disabled/
 */
async function discoverDisabled(clientFilter?: string): Promise<McpServer[]> {
  const disabledDir = getDisabledDir();
  if (!(await fileExists(disabledDir))) return [];

  const servers: McpServer[] = [];

  try {
    const clientDirs = await readdir(disabledDir, { withFileTypes: true });
    for (const clientDir of clientDirs) {
      if (!clientDir.isDirectory()) continue;
      if (clientFilter && clientDir.name !== clientFilter) continue;

      const clientPath = join(disabledDir, clientDir.name);
      const scopeDirs = await readdir(clientPath, { withFileTypes: true });

      for (const scopeDir of scopeDirs) {
        if (!scopeDir.isDirectory()) continue;

        const scopePath = join(clientPath, scopeDir.name);
        const files = await readdir(scopePath, { withFileTypes: true });

        for (const file of files) {
          if (!file.name.endsWith('.json')) continue;

          const filePath = join(scopePath, file.name);
          const data = await readJsonFile<{
            config: McpServerConfig;
            originalConfigPath: string;
            scope: string;
          }>(filePath);

          if (data) {
            const serverName = file.name.replace(/\.json$/, '');
            servers.push({
              name: serverName,
              client: clientDir.name,
              scope: data.scope || scopeDir.name,
              config: data.config,
              enabled: false,
              configPath: data.originalConfigPath || '',
            });
          }
        }
      }
    }
  } catch {
    // If we can't read the disabled dir, just return empty
  }

  return servers;
}

/**
 * Find a specific server by name, optionally filtered by client and workspace.
 */
export async function findServers(
  serverName: string,
  options?: { client?: string; workspace?: string }
): Promise<McpServer[]> {
  const all = await discoverAll(options);
  return all.filter(s => s.name === serverName);
}
