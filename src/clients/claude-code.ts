import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import type { McpClient, McpServer, McpServerConfig } from './base.js';

interface ClaudeUserConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

interface ClaudeSettingsConfig {
  projects?: Record<string, {
    mcpServers?: Record<string, McpServerConfig>;
    allowedTools?: string[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export class ClaudeCodeClient implements McpClient {
  name = 'claude-code';

  private get userConfigPath(): string {
    return join(homedir(), '.claude', 'mcp.json');
  }

  private get settingsConfigPath(): string {
    return join(homedir(), '.claude.json');
  }

  getConfigPath(scope: string): string {
    if (scope === 'user') {
      return this.userConfigPath;
    }
    if (scope.startsWith('project: ')) {
      // Per-project in ~/.claude.json
      return this.settingsConfigPath;
    }
    if (scope.startsWith('shared: ')) {
      // Shared project .mcp.json
      const projectPath = scope.replace('shared: ', '');
      return join(projectPath, '.mcp.json');
    }
    return this.userConfigPath;
  }

  async readServers(scope: string): Promise<Record<string, McpServerConfig>> {
    if (scope === 'user') {
      const config = await readJsonFile<ClaudeUserConfig>(this.userConfigPath);
      return config?.mcpServers ?? {};
    }

    if (scope.startsWith('project: ')) {
      const projectPath = scope.replace('project: ', '');
      const config = await readJsonFile<ClaudeSettingsConfig>(this.settingsConfigPath);
      return config?.projects?.[projectPath]?.mcpServers ?? {};
    }

    if (scope.startsWith('shared: ')) {
      const projectPath = scope.replace('shared: ', '');
      const mcpJsonPath = join(projectPath, '.mcp.json');
      const config = await readJsonFile<ClaudeUserConfig>(mcpJsonPath);
      return config?.mcpServers ?? {};
    }

    return {};
  }

  async writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void> {
    if (scope === 'user') {
      const config = await readJsonFile<ClaudeUserConfig>(this.userConfigPath) ?? {};
      config.mcpServers = servers;
      await writeJsonFile(this.userConfigPath, config);
      return;
    }

    if (scope.startsWith('project: ')) {
      const projectPath = scope.replace('project: ', '');
      const config = await readJsonFile<ClaudeSettingsConfig>(this.settingsConfigPath) ?? {};
      if (!config.projects) config.projects = {};
      if (!config.projects[projectPath]) config.projects[projectPath] = {};
      config.projects[projectPath].mcpServers = servers;
      await writeJsonFile(this.settingsConfigPath, config);
      return;
    }

    if (scope.startsWith('shared: ')) {
      const projectPath = scope.replace('shared: ', '');
      const mcpJsonPath = join(projectPath, '.mcp.json');
      const config = await readJsonFile<ClaudeUserConfig>(mcpJsonPath) ?? {};
      config.mcpServers = servers;
      await writeJsonFile(mcpJsonPath, config);
      return;
    }
  }

  async discover(): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    // 1. User-level servers from ~/.claude/mcp.json
    if (await fileExists(this.userConfigPath)) {
      const config = await readJsonFile<ClaudeUserConfig>(this.userConfigPath);
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

    // 2. Per-project servers from ~/.claude.json → projects
    if (await fileExists(this.settingsConfigPath)) {
      const config = await readJsonFile<ClaudeSettingsConfig>(this.settingsConfigPath);
      if (config?.projects) {
        for (const [projectPath, projectConfig] of Object.entries(config.projects)) {
          if (projectConfig?.mcpServers) {
            // Extract a short project name from the path
            const projectName = projectPath.split('/').pop() || projectPath;
            for (const [name, serverConfig] of Object.entries(projectConfig.mcpServers)) {
              servers.push({
                name,
                client: this.name,
                scope: `project: ${projectName}`,
                config: serverConfig,
                enabled: true,
                configPath: this.settingsConfigPath,
              });
            }
          }
        }
      }
    }

    return servers;
  }

  /**
   * Discover shared project servers (.mcp.json) from registered workspace paths.
   */
  async discoverSharedProject(projectPath: string): Promise<McpServer[]> {
    const mcpJsonPath = join(projectPath, '.mcp.json');
    if (!(await fileExists(mcpJsonPath))) return [];

    const config = await readJsonFile<ClaudeUserConfig>(mcpJsonPath);
    if (!config?.mcpServers) return [];

    const projectName = projectPath.split('/').pop() || projectPath;
    return Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      client: this.name,
      scope: `shared: ${projectName}`,
      config: serverConfig,
      enabled: true,
      configPath: mcpJsonPath,
    }));
  }

  async reload(): Promise<void> {
    // Reload not supported — user restarts manually
  }
}
