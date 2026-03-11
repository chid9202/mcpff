import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * Antigravity (VS Code fork) — stores MCP servers in settings.json or .vscode/mcp.json
 *
 * settings.json format (VS Code native MCP):
 *   "mcp": {
 *     "servers": {
 *       "<name>": { "command": "...", "args": [...] }
 *     }
 *   }
 *
 * Project-level: .vscode/mcp.json
 *   { "servers": { "<name>": { "command": "...", "args": [...] } } }
 */

interface AntigravitySettings {
  mcp?: {
    servers?: Record<string, McpServerConfig>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface VscodeMcpJson {
  servers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export class AntigravityClient implements McpClient {
  name = 'antigravity';

  private get settingsDir(): string {
    const home = homedir();
    switch (platform()) {
      case 'darwin':
        return join(home, 'Library', 'Application Support', 'Antigravity', 'User');
      case 'win32':
        return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Antigravity', 'User');
      default: // linux
        return join(home, '.config', 'Antigravity', 'User');
    }
  }

  private get settingsPath(): string {
    return join(this.settingsDir, 'settings.json');
  }

  getConfigPath(scope: string): string {
    if (scope === 'user') {
      return this.settingsPath;
    }
    if (scope.startsWith('project: ')) {
      const projectPath = scope.replace('project: ', '');
      return join(projectPath, '.vscode', 'mcp.json');
    }
    return this.settingsPath;
  }

  async readServers(scope: string): Promise<Record<string, McpServerConfig>> {
    const configPath = this.getConfigPath(scope);

    if (scope === 'user') {
      const settings = await readJsonFile<AntigravitySettings>(configPath);
      return settings?.mcp?.servers ?? {};
    }

    // Project scope: .vscode/mcp.json
    const mcpJson = await readJsonFile<VscodeMcpJson>(configPath);
    return mcpJson?.servers ?? {};
  }

  async writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const configPath = this.getConfigPath(scope);

    if (scope === 'user') {
      const settings = await readJsonFile<AntigravitySettings>(configPath) ?? {};
      if (!settings.mcp) settings.mcp = {};
      settings.mcp.servers = servers;
      await writeJsonFile(configPath, settings);
      return;
    }

    // Project scope: .vscode/mcp.json
    const mcpJson = await readJsonFile<VscodeMcpJson>(configPath) ?? {};
    mcpJson.servers = servers;
    await writeJsonFile(configPath, mcpJson);
  }

  async discover(): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    // User-level settings.json
    if (await fileExists(this.settingsPath)) {
      const settings = await readJsonFile<AntigravitySettings>(this.settingsPath);
      if (settings?.mcp?.servers) {
        for (const [name, serverConfig] of Object.entries(settings.mcp.servers)) {
          servers.push({
            name,
            client: this.name,
            scope: 'user',
            config: serverConfig,
            enabled: true,
            configPath: this.settingsPath,
          });
        }
      }
    }

    return servers;
  }

  /**
   * Discover project-level MCP configs from .vscode/mcp.json
   */
  async discoverProject(projectPath: string): Promise<McpServer[]> {
    const configPath = join(projectPath, '.vscode', 'mcp.json');
    if (!(await fileExists(configPath))) return [];

    const mcpJson = await readJsonFile<VscodeMcpJson>(configPath);
    if (!mcpJson?.servers) return [];

    const projectName = projectPath.split('/').pop() || projectPath;
    return Object.entries(mcpJson.servers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: `project: ${projectName}`,
      config: serverConfig,
      enabled: true,
      configPath,
    }));
  }

  async reload(): Promise<void> {
    // Antigravity (VS Code) may need reload window
  }
}
