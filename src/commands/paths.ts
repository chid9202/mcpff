import { Command } from 'commander';
import chalk from 'chalk';
import { ALL_CLIENTS } from '../core/discovery.js';
import { fileExists } from '../utils/fs.js';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';

interface ConfigPathInfo {
  client: string;
  scope: string;
  path: string;
  exists: boolean;
}

async function getAllPaths(): Promise<ConfigPathInfo[]> {
  const paths: ConfigPathInfo[] = [];
  const home = homedir();
  const os = platform();

  // Claude Code
  paths.push({
    client: 'claude-code',
    scope: 'user',
    path: join(home, '.claude.json'),
    exists: await fileExists(join(home, '.claude.json')),
  });
  paths.push({
    client: 'claude-code',
    scope: 'user (mcp)',
    path: join(home, '.claude', 'mcp.json'),
    exists: await fileExists(join(home, '.claude', 'mcp.json')),
  });

  // Claude Desktop
  const claudeDesktopPath = os === 'darwin'
    ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : os === 'win32'
      ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
      : join(home, '.config', 'Claude', 'claude_desktop_config.json');
  paths.push({
    client: 'claude-desktop',
    scope: 'global',
    path: claudeDesktopPath,
    exists: await fileExists(claudeDesktopPath),
  });

  // Cursor
  paths.push({
    client: 'cursor',
    scope: 'user',
    path: join(home, '.cursor', 'mcp.json'),
    exists: await fileExists(join(home, '.cursor', 'mcp.json')),
  });

  // Codex
  paths.push({
    client: 'codex',
    scope: 'user',
    path: join(home, '.codex', 'config.toml'),
    exists: await fileExists(join(home, '.codex', 'config.toml')),
  });

  // VS Code
  const vscodeDir = os === 'darwin'
    ? join(home, 'Library', 'Application Support', 'Code', 'User')
    : os === 'win32'
      ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Code', 'User')
      : join(home, '.config', 'Code', 'User');
  paths.push({
    client: 'vscode',
    scope: 'user (mcp.json)',
    path: join(vscodeDir, 'mcp.json'),
    exists: await fileExists(join(vscodeDir, 'mcp.json')),
  });
  paths.push({
    client: 'vscode',
    scope: 'user (settings)',
    path: join(vscodeDir, 'settings.json'),
    exists: await fileExists(join(vscodeDir, 'settings.json')),
  });

  // Antigravity
  const agDir = os === 'darwin'
    ? join(home, 'Library', 'Application Support', 'Antigravity', 'User')
    : os === 'win32'
      ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Antigravity', 'User')
      : join(home, '.config', 'Antigravity', 'User');
  paths.push({
    client: 'antigravity',
    scope: 'user (mcp.json)',
    path: join(agDir, 'mcp.json'),
    exists: await fileExists(join(agDir, 'mcp.json')),
  });
  paths.push({
    client: 'antigravity',
    scope: 'user (settings)',
    path: join(agDir, 'settings.json'),
    exists: await fileExists(join(agDir, 'settings.json')),
  });

  // Windsurf
  paths.push({
    client: 'windsurf',
    scope: 'user',
    path: join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    exists: await fileExists(join(home, '.codeium', 'windsurf', 'mcp_config.json')),
  });

  // OpenClaw
  const openclawConfig = join(home, '.openclaw', 'openclaw.json');
  paths.push({
    client: 'openclaw',
    scope: 'config',
    path: openclawConfig,
    exists: await fileExists(openclawConfig),
  });

  // Gemini CLI
  paths.push({
    client: 'gemini',
    scope: 'n/a',
    path: '(uses extensions system — not a flat config file)',
    exists: false,
  });

  // Registered workspaces
  const config = await loadConfig();
  for (const ws of config.workspaces) {
    const cursorProject = join(ws.path, '.cursor', 'mcp.json');
    const vscodeProject = join(ws.path, '.vscode', 'mcp.json');
    const mcpJson = join(ws.path, '.mcp.json');

    paths.push({
      client: 'cursor',
      scope: `project: ${ws.name}`,
      path: cursorProject,
      exists: await fileExists(cursorProject),
    });
    paths.push({
      client: 'vscode',
      scope: `project: ${ws.name}`,
      path: vscodeProject,
      exists: await fileExists(vscodeProject),
    });
    paths.push({
      client: 'claude-code',
      scope: `project: ${ws.name}`,
      path: mcpJson,
      exists: await fileExists(mcpJson),
    });
  }

  return paths;
}

export const pathsCommand = new Command('paths')
  .description('Show all config file paths mcpff checks')
  .action(async () => {
    const paths = await getAllPaths();

    const clientWidth = Math.max(8, ...paths.map(p => p.client.length));
    const scopeWidth = Math.max(6, ...paths.map(p => p.scope.length));

    const pad = (str: string, width: number) => str.padEnd(width);

    console.log('');
    console.log(chalk.bold('  mcpff — config paths'));
    console.log(chalk.dim('  Showing all paths mcpff checks for MCP server configs'));
    console.log('');

    console.log(
      chalk.bold('  ' +
        pad('CLIENT', clientWidth + 2) +
        pad('SCOPE', scopeWidth + 2) +
        'PATH'
      )
    );
    console.log(chalk.dim('  ' + '─'.repeat(clientWidth + scopeWidth + 60)));

    for (const p of paths) {
      const icon = p.exists ? chalk.green('✓') : chalk.dim('·');
      const clientStr = chalk.cyan(pad(p.client, clientWidth + 2));
      const scopeStr = chalk.yellow(pad(p.scope, scopeWidth + 2));
      const pathStr = p.exists ? chalk.white(p.path) : chalk.dim(p.path);

      console.log(`  ${icon} ${clientStr}${scopeStr}${pathStr}`);
    }

    const found = paths.filter(p => p.exists).length;
    const total = paths.length;

    console.log('');
    console.log(
      chalk.dim('  ') +
      chalk.green(`${found} found`) +
      chalk.dim(` / ${total} checked`)
    );
    console.log('');
  });
