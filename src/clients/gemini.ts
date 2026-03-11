import type { McpClient, McpServer, McpServerConfig } from './base.js';

/**
 * Gemini CLI — uses an extensions system for MCP, not a simple config file.
 *
 * Gemini CLI manages MCP servers through its extensions framework
 * (gemini extensions install/list). There is no single JSON/TOML config
 * file that maps MCP server names to commands like other clients.
 *
 * This client is a placeholder — Gemini CLI MCP discovery is not yet
 * supported. If/when Gemini CLI exposes a flat config file for MCP
 * servers, this adapter can be implemented.
 */
export class GeminiClient implements McpClient {
  name = 'gemini';

  getConfigPath(_scope: string): string {
    return '';
  }

  async readServers(_scope: string): Promise<Record<string, McpServerConfig>> {
    return {};
  }

  async writeServers(_scope: string, _servers: Record<string, McpServerConfig>): Promise<void> {
    // Not supported — Gemini CLI uses extensions, not a flat config
  }

  async discover(): Promise<McpServer[]> {
    // Gemini CLI uses an extensions system for MCP.
    // No flat config file to discover from.
    return [];
  }

  async reload(): Promise<void> {
    // N/A
  }
}
