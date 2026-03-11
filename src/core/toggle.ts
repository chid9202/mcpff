import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { getDisabledDir, sanitizeScope, ensureDir, readJsonFile, writeJsonFile, fileExists } from '../utils/fs.js';
import { getClient } from './discovery.js';
import { createBackup } from './backup.js';
import type { McpServer, McpServerConfig } from '../clients/base.js';

interface DisabledServerData {
  config: McpServerConfig;
  originalConfigPath: string;
  scope: string;
  disabledAt: string;
}

/**
 * Get the path to the disabled shadow file for a server.
 */
function getDisabledPath(server: McpServer): string {
  return join(
    getDisabledDir(),
    server.client,
    sanitizeScope(server.scope),
    `${server.name}.json`
  );
}

/**
 * Disable a server: remove from config, save to shadow file.
 */
export async function disableServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
  if (!server.enabled) {
    return { success: false, error: 'Server is already disabled' };
  }

  const client = getClient(server.client);
  if (!client) {
    return { success: false, error: `Unknown client: ${server.client}` };
  }

  try {
    // 1. Back up the config file
    await createBackup([server.configPath]);

    // 2. Read current servers from config
    const servers = await client.readServers(server.scope);

    // 3. Verify server exists in config
    if (!(server.name in servers)) {
      return { success: false, error: `Server '${server.name}' not found in config` };
    }

    // 4. Save to shadow file
    const disabledPath = getDisabledPath(server);
    await ensureDir(join(disabledPath, '..'));
    const shadowData: DisabledServerData = {
      config: servers[server.name],
      originalConfigPath: server.configPath,
      scope: server.scope,
      disabledAt: new Date().toISOString(),
    };
    await writeJsonFile(disabledPath, shadowData);

    // 5. Remove from config and write back
    delete servers[server.name];
    await client.writeServers(server.scope, servers);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Enable a server: read from shadow file, re-insert into config.
 */
export async function enableServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
  if (server.enabled) {
    return { success: false, error: 'Server is already enabled' };
  }

  const client = getClient(server.client);
  if (!client) {
    return { success: false, error: `Unknown client: ${server.client}` };
  }

  try {
    // 1. Read shadow file
    const disabledPath = getDisabledPath(server);
    if (!(await fileExists(disabledPath))) {
      return { success: false, error: 'Shadow file not found — cannot restore server config' };
    }

    const shadowData = await readJsonFile<DisabledServerData>(disabledPath);
    if (!shadowData) {
      return { success: false, error: 'Failed to read shadow file' };
    }

    // 2. Back up the config file
    const configPath = shadowData.originalConfigPath || client.getConfigPath(server.scope);
    await createBackup([configPath]);

    // 3. Read current servers from config
    const servers = await client.readServers(server.scope);

    // 4. Re-insert server
    servers[server.name] = shadowData.config;

    // 5. Write back to config
    await client.writeServers(server.scope, servers);

    // 6. Remove shadow file
    await unlink(disabledPath);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Toggle a server's state (flip).
 */
export async function toggleServer(server: McpServer): Promise<{ success: boolean; newState: boolean; error?: string }> {
  if (server.enabled) {
    const result = await disableServer(server);
    return { ...result, newState: false };
  } else {
    const result = await enableServer(server);
    return { ...result, newState: true };
  }
}
