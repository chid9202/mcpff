import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * VS Code — stores MCP servers in settings.json or .vscode/mcp.json
 *
 * settings.json format:
 *   "mcp": {
 *     "servers": {
 *       "<name>": { "command": "...", "args": [...] }
 *     }
 *   }
 *
 * Project-level: .vscode/mcp.json
 *   { "servers": { "<name>": { ... } } }
 */

interface VscodeSettings {
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

export class VscodeClient implements McpClient {
  name = 'vscode';

  private get settingsDir(): string {
    const home = homedir();
    switch (platform()) {
      case 'darwin':
        return join(home, 'Library', 'Application Support', 'Code', 'User');
      case 'win32':
        return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Code', 'User');
      default: // linux
        return join(home, '.config', 'Code', 'User');
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
      const settings = await readJsonFile<VscodeSettings>(configPath);
      return settings?.mcp?.servers ?? {};
    }

    const mcpJson = await readJsonFile<VscodeMcpJson>(configPath);
    return mcpJson?.servers ?? {};
  }

  async writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const configPath = this.getConfigPath(scope);

    if (scope === 'user') {
      const settings = await readJsonFile<VscodeSettings>(configPath) ?? {};
      if (!settings.mcp) settings.mcp = {};
      settings.mcp.servers = servers;
      await writeJsonFile(configPath, settings);
      return;
    }

    const mcpJson = await readJsonFile<VscodeMcpJson>(configPath) ?? {};
    mcpJson.servers = servers;
    await writeJsonFile(configPath, mcpJson);
  }

  async discover(): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    if (await fileExists(this.settingsPath)) {
      const settings = await readJsonFile<VscodeSettings>(this.settingsPath);
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
    // VS Code may need reload window
  }
}
