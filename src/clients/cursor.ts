import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

interface CursorConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export class CursorClient implements McpClient {
  name = 'cursor';

  private get userConfigPath(): string {
    return join(homedir(), '.cursor', 'mcp.json');
  }

  getConfigPath(scope: string): string {
    if (scope === 'user') {
      return this.userConfigPath;
    }
    // Project-scope cursor config
    if (scope.startsWith('project: ')) {
      const projectPath = scope.replace('project: ', '');
      return join(projectPath, '.cursor', 'mcp.json');
    }
    return this.userConfigPath;
  }

  async readServers(scope: string): Promise<Record<string, McpServerConfig>> {
    const configPath = this.getConfigPath(scope);
    const config = await readJsonFile<CursorConfig>(configPath);
    return config?.mcpServers ?? {};
  }

  async writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const configPath = this.getConfigPath(scope);
    const config = await readJsonFile<CursorConfig>(configPath) ?? {};
    config.mcpServers = servers;
    await writeJsonFile(configPath, config);
  }

  async discover(): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    // User-level config
    if (await fileExists(this.userConfigPath)) {
      const config = await readJsonFile<CursorConfig>(this.userConfigPath);
      if (config?.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          servers.push({
            name,
            client: this.name,
            scope: 'user',
            config: serverConfig,
            enabled: true,
            configPath: this.userConfigPath,
          });
        }
      }
    }

    return servers;
  }

  /**
   * Discover project-level Cursor MCP configs from a workspace path.
   */
  async discoverProject(projectPath: string): Promise<McpServer[]> {
    const configPath = join(projectPath, '.cursor', 'mcp.json');
    if (!(await fileExists(configPath))) return [];

    const config = await readJsonFile<CursorConfig>(configPath);
    if (!config?.mcpServers) return [];

    const projectName = projectPath.split('/').pop() || projectPath;
    return Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: `project: ${projectName}`,
      config: serverConfig,
      enabled: true,
      configPath,
    }));
  }

  async reload(): Promise<void> {
    // Phase 2: Cursor likely requires restart
  }
}
