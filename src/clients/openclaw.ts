import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

interface McpPorterConfig {
  mcpServers?: Record<string, McpServerConfig>;
  imports?: unknown[];
  [key: string]: unknown;
}

interface OpenClawAgentEntry {
  id: string;
  name?: string;
  workspace?: string;
  [key: string]: unknown;
}

interface OpenClawMainConfig {
  agents?: {
    defaults?: {
      workspace?: string;
      [key: string]: unknown;
    };
    list?: OpenClawAgentEntry[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class OpenClawClient implements McpClient {
  name = 'openclaw';

  private get openclawConfigPath(): string {
    return join(homedir(), '.openclaw', 'openclaw.json');
  }

  getConfigPath(scope: string): string {
    // scope is the workspace path
    if (scope.startsWith('workspace: ')) {
      const wsPath = scope.replace('workspace: ', '');
      return join(wsPath, 'config', 'mcporter.json');
    }
    return scope;
  }

  async readServers(scope: string): Promise<Record<string, McpServerConfig>> {
    const configPath = this.getConfigPath(scope);
    const config = await readJsonFile<McpPorterConfig>(configPath);
    return config?.mcpServers ?? {};
  }

  async writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    const configPath = this.getConfigPath(scope);
    const config = await readJsonFile<McpPorterConfig>(configPath) ?? {};
    config.mcpServers = servers;
    await writeJsonFile(configPath, config);
  }

  /**
   * Auto-discover MCP servers from all OpenClaw agent workspaces.
   * Reads ~/.openclaw/openclaw.json to find agent workspace paths,
   * then checks each for config/mcporter.json.
   */
  async discover(): Promise<McpServer[]> {
    const mainConfig = await readJsonFile<OpenClawMainConfig>(this.openclawConfigPath);
    if (!mainConfig?.agents) return [];

    const servers: McpServer[] = [];
    const workspacePaths = new Set<string>();

    // Collect all unique workspace paths
    const defaultWorkspace = mainConfig.agents.defaults?.workspace;
    if (defaultWorkspace) {
      workspacePaths.add(defaultWorkspace);
    }

    for (const agent of mainConfig.agents.list ?? []) {
      if (agent.workspace) {
        workspacePaths.add(agent.workspace);
      } else if (defaultWorkspace) {
        // Agents without explicit workspace use the default
        workspacePaths.add(defaultWorkspace);
      }
    }

    // Discover from each unique workspace
    for (const wsPath of workspacePaths) {
      try {
        const found = await this.discoverWorkspace(wsPath);
        servers.push(...found);
      } catch { /* skip */ }
    }

    return servers;
  }

  /**
   * Discover MCP servers from a workspace's mcporter.json.
   */
  async discoverWorkspace(workspacePath: string): Promise<McpServer[]> {
    const configPath = join(workspacePath, 'config', 'mcporter.json');
    if (!(await fileExists(configPath))) return [];

    const config = await readJsonFile<McpPorterConfig>(configPath);
    if (!config?.mcpServers) return [];

    const wsName = workspacePath.split('/').pop() || workspacePath;
    return Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: `workspace: ${wsName}`,
      config: serverConfig,
      enabled: true,
      configPath,
    }));
  }

  async reload(): Promise<void> {
    // Reload not supported — user restarts manually
  }
}
