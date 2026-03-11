import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

interface ClaudeDesktopConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

export class ClaudeDesktopClient implements McpClient {
  name = 'claude-desktop';

  private get configPath(): string {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }

  getConfigPath(_scope: string): string {
    return this.configPath;
  }

  async readServers(_scope: string): Promise<Record<string, McpServerConfig>> {
    const config = await readJsonFile<ClaudeDesktopConfig>(this.configPath);
    return config?.mcpServers ?? {};
  }

  async writeServers(_scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const config = await readJsonFile<ClaudeDesktopConfig>(this.configPath) ?? {};
    config.mcpServers = servers;
    await writeJsonFile(this.configPath, config);
  }

  async discover(): Promise<McpServer[]> {
    if (!(await fileExists(this.configPath))) return [];

    const config = await readJsonFile<ClaudeDesktopConfig>(this.configPath);
    if (!config?.mcpServers) return [];

    return Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: 'global',
      config: serverConfig,
      enabled: true,
      configPath: this.configPath,
    }));
  }

  async reload(): Promise<void> {
    // Phase 2: Claude Desktop may auto-reload on file change
  }
}
