import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * Gemini CLI — stores MCP servers in ~/.gemini/settings.json
 *
 * Format:
 *   {
 *     "mcpServers": {
 *       "<name>": { "command": "...", "args": [...], "env": {...} }
 *     }
 *   }
 */

interface GeminiConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export class GeminiClient implements McpClient {
  name = 'gemini';

  private get configPath(): string {
    return join(homedir(), '.gemini', 'settings.json');
  }

  getConfigPath(_scope: string): string {
    return this.configPath;
  }

  async readServers(_scope: string): Promise<Record<string, McpServerConfig>> {
    const config = await readJsonFile<GeminiConfig>(this.configPath);
    return config?.mcpServers ?? {};
  }

  async writeServers(_scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const config = await readJsonFile<GeminiConfig>(this.configPath) ?? {};
    config.mcpServers = servers;
    await writeJsonFile(this.configPath, config);
  }

  async discover(): Promise<McpServer[]> {
    if (!(await fileExists(this.configPath))) return [];

    const config = await readJsonFile<GeminiConfig>(this.configPath);
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
    // Gemini CLI picks up config changes on next run
  }
}
