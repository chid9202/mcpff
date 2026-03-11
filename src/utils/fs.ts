import { writeFile, rename, mkdir, readFile, access, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';

/**
 * Atomically write a file by writing to a temp file first, then renaming.
 */
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.mcpff-tmp-${randomUUID()}`);
  try {
    await writeFile(tmpPath, data, 'utf-8');
    await rename(tmpPath, filePath);
  } catch (err) {
    // Clean up temp file on failure
    try { await unlink(tmpPath); } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Strip JSON comments (// and /* ... *​/) and trailing commas.
 * Handles comments inside strings correctly.
 */
function stripJsonComments(text: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let escape = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inString) {
      result += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    // Start of string
    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // Line comment
    if (ch === '/' && next === '/') {
      // Skip until end of line
      i += 2;
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2; // skip closing */
      continue;
    }

    result += ch;
    i++;
  }

  // Remove trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Safely read a JSON file. Returns null if file doesn't exist.
 * Supports JSONC (comments + trailing commas) for VS Code compatibility.
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(stripJsonComments(content)) as T;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Write a JSON file atomically with pretty formatting.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await atomicWriteFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the mcpff state directory.
 */
export function getMcpffDir(): string {
  return join(homedir(), '.mcpff');
}

/**
 * Get the disabled servers directory.
 */
export function getDisabledDir(): string {
  return join(getMcpffDir(), 'disabled');
}

/**
 * Get the backups directory.
 */
export function getBackupsDir(): string {
  return join(getMcpffDir(), 'backups');
}

/**
 * Sanitize a scope string for use as a directory name.
 * e.g. "/Users/daehanchi/Dev/UpPhish" → "--Users-daehanchi-Dev-UpPhish"
 */
export function sanitizeScope(scope: string): string {
  return scope.replace(/[/\\:]/g, '-').replace(/^-+/, '').replace(/-+$/, '') || 'default';
}

/**
 * Ensure a directory exists.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Expand ~ to home directory.
 */
export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return join(homedir(), p.slice(1));
  }
  return p;
}
