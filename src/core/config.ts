import { join } from 'node:path';
import { getMcpffDir, readJsonFile, writeJsonFile, ensureDir } from '../utils/fs.js';

export interface WorkspaceEntry {
  name: string;
  path: string;
  clients?: string[];
}

export interface McpffConfig {
  version: number;
  workspaces: WorkspaceEntry[];
  autoBackup: boolean;
}

const DEFAULT_CONFIG: McpffConfig = {
  version: 1,
  workspaces: [],
  autoBackup: true,
};

function getConfigPath(): string {
  return join(getMcpffDir(), 'config.json');
}

/**
 * Load mcpff's own configuration.
 */
export async function loadConfig(): Promise<McpffConfig> {
  const config = await readJsonFile<McpffConfig>(getConfigPath());
  if (!config) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Save mcpff's own configuration.
 */
export async function saveConfig(config: McpffConfig): Promise<void> {
  await ensureDir(getMcpffDir());
  await writeJsonFile(getConfigPath(), config);
}

/**
 * Add a workspace to the config.
 */
export async function addWorkspace(path: string, name?: string): Promise<WorkspaceEntry> {
  const config = await loadConfig();
  const wsName = name || path.split('/').pop() || 'workspace';

  // Check if already registered
  const existing = config.workspaces.find(w => w.path === path);
  if (existing) {
    throw new Error(`Workspace already registered: ${existing.name} (${existing.path})`);
  }

  const entry: WorkspaceEntry = { name: wsName, path };
  config.workspaces.push(entry);
  await saveConfig(config);
  return entry;
}

/**
 * Remove a workspace from the config.
 */
export async function removeWorkspace(nameOrPath: string): Promise<WorkspaceEntry | null> {
  const config = await loadConfig();
  const idx = config.workspaces.findIndex(
    w => w.name === nameOrPath || w.path === nameOrPath
  );

  if (idx === -1) return null;

  const [removed] = config.workspaces.splice(idx, 1);
  await saveConfig(config);
  return removed;
}

/**
 * List all registered workspaces.
 */
export async function listWorkspaces(): Promise<WorkspaceEntry[]> {
  const config = await loadConfig();
  return config.workspaces;
}
