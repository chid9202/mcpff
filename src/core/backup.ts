import { join } from 'node:path';
import { readdir, readFile, copyFile, stat } from 'node:fs/promises';
import { getBackupsDir, ensureDir, fileExists, atomicWriteFile } from '../utils/fs.js';

/**
 * Create a backup of the given config files.
 * Returns the backup directory path.
 */
export async function createBackup(configPaths: string[]): Promise<string> {
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '');
  const backupDir = join(getBackupsDir(), timestamp);
  await ensureDir(backupDir);

  for (const configPath of configPaths) {
    if (!(await fileExists(configPath))) continue;

    // Create a safe filename from the config path
    const safeName = configPath
      .replace(/^\//, '')
      .replace(/[/\\]/g, '--');

    await copyFile(configPath, join(backupDir, safeName));
  }

  return backupDir;
}

/**
 * Create a manual backup of all known config files.
 */
export async function createFullBackup(configPaths: string[]): Promise<string> {
  return createBackup(configPaths);
}

/**
 * List all available backups.
 */
export async function listBackups(): Promise<{ timestamp: string; fileCount: number; path: string }[]> {
  const backupsDir = getBackupsDir();
  if (!(await fileExists(backupsDir))) return [];

  const entries = await readdir(backupsDir, { withFileTypes: true });
  const backups: { timestamp: string; fileCount: number; path: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const backupPath = join(backupsDir, entry.name);
    const files = await readdir(backupPath);

    backups.push({
      timestamp: entry.name,
      fileCount: files.length,
      path: backupPath,
    });
  }

  // Sort newest first
  backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return backups;
}

/**
 * Restore config files from a backup.
 */
export async function restoreBackup(timestamp: string): Promise<{ restored: string[]; errors: string[] }> {
  const backupDir = join(getBackupsDir(), timestamp);
  if (!(await fileExists(backupDir))) {
    throw new Error(`Backup not found: ${timestamp}`);
  }

  const files = await readdir(backupDir);
  const restored: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    // Convert safe filename back to path
    const originalPath = '/' + file.replace(/--/g, '/');
    const backupPath = join(backupDir, file);

    try {
      const content = await readFile(backupPath, 'utf-8');
      await ensureDir(join(originalPath, '..'));
      await atomicWriteFile(originalPath, content);
      restored.push(originalPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${originalPath}: ${message}`);
    }
  }

  return { restored, errors };
}
