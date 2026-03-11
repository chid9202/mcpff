import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { parse, stringify } from 'smol-toml';
import { fileExists, atomicWriteFile } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * Codex CLI (OpenAI) — stores MCP servers in ~/.codex/config.toml
 *
 * Format:
 *   [mcp_servers.<name>]
 *   command = "npx"
 *   args = ["-y", "some-server"]
 *
 *   [mcp_servers.<name>.env]
 *   API_KEY = "..."
 */

interface CodexTomlConfig {
  mcp_servers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export class CodexClient implements McpClient {
  name = 'codex';

  private get configPath(): string {
    return join(homedir(), '.codex', 'config.toml');
  }

  getConfigPath(_scope: string): string {
    return this.configPath;
  }

  private async readToml(): Promise<CodexTomlConfig> {
    if (!(await fileExists(this.configPath))) return {};
    const content = await readFile(this.configPath, 'utf-8');
    return parse(content) as CodexTomlConfig;
  }

  private async writeToml(config: CodexTomlConfig): Promise<void> {
    await atomicWriteFile(this.configPath, stringify(config) + '\n');
  }

  async readServers(_scope: string): Promise<Record<string, McpServerConfig>> {
    const config = await this.readToml();
    if (!config.mcp_servers) return {};

    const servers: Record<string, McpServerConfig> = {};
    for (const [name, serverConfig] of Object.entries(config.mcp_servers)) {
      servers[name] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
      };
    }
    return servers;
  }

  async writeServers(_scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const config = await this.readToml();

    // Convert McpServerConfig back to Codex TOML format
    const mcpServers: CodexTomlConfig['mcp_servers'] = {};
    for (const [name, serverConfig] of Object.entries(servers)) {
      mcpServers[name] = {
        command: serverConfig.command,
        ...(serverConfig.args && { args: serverConfig.args }),
        ...(serverConfig.env && { env: serverConfig.env }),
      };
    }

    config.mcp_servers = mcpServers;
    await this.writeToml(config);
  }

  async discover(): Promise<McpServer[]> {
    const config = await this.readToml();
    if (!config.mcp_servers) return [];

    return Object.entries(config.mcp_servers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: 'user',
      config: {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
      },
      enabled: true,
      configPath: this.configPath,
    }));
  }

  async reload(): Promise<void> {
    // Codex CLI picks up config changes on next run
  }
}
