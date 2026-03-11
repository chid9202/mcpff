import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * Windsurf (Codeium) — stores MCP servers in ~/.codeium/windsurf/mcp_config.json
 *
 * Format:
 *   {
 *     "mcpServers": {
 *       "<name>": { "command": "...", "args": [...], "env": {...} }
 *     }
 *   }
 */

interface WindsurfConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export class WindsurfClient implements McpClient {
  name = 'windsurf';

  private get configPath(): string {
    return join(homedir(), '.codeium', 'windsurf', 'mcp_config.json');
  }

  getConfigPath(_scope: string): string {
    return this.configPath;
  }

  async readServers(_scope: string): Promise<Record<string, McpServerConfig>> {
    const config = await readJsonFile<WindsurfConfig>(this.configPath);
    return config?.mcpServers ?? {};
  }

  async writeServers(_scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const config = await readJsonFile<WindsurfConfig>(this.configPath) ?? {};
    config.mcpServers = servers;
    await writeJsonFile(this.configPath, config);
  }

  async discover(): Promise<McpServer[]> {
    if (!(await fileExists(this.configPath))) return [];

    const config = await readJsonFile<WindsurfConfig>(this.configPath);
    if (!config?.mcpServers) return [];

    return Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: 'user',
      config: serverConfig,
      enabled: true,
      configPath: this.configPath,
    }));
  }

  async reload(): Promise<void> {
    // Windsurf may require restart
  }
}
