#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listCommand } from './commands/list.js';
import { onCommand } from './commands/on.js';
import { offCommand } from './commands/off.js';
import { flipCommand } from './commands/flip.js';
import { workspaceCommand } from './commands/workspace.js';
import { statusCommand } from './commands/status.js';
import { backupCommand, backupListCommand } from './commands/backup.js';
import { restoreCommand } from './commands/restore.js';
import { pathsCommand } from './commands/paths.js';
import { runInteractive } from './commands/interactive.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('mcpff')
  .description('MCP Flip-Flop — Toggle MCP server configs on/off across AI clients')
  .version(pkg.version);

program.addCommand(listCommand);
program.addCommand(onCommand);
program.addCommand(offCommand);
program.addCommand(flipCommand);
program.addCommand(workspaceCommand);
program.addCommand(statusCommand);
program.addCommand(backupCommand);
program.addCommand(backupListCommand);
program.addCommand(restoreCommand);
program.addCommand(pathsCommand);

// Default to interactive mode if no command given (TTY), else list
program.action(async () => {
  if (process.stdin.isTTY) {
    await runInteractive();
  } else {
    await listCommand.parseAsync([], { from: 'user' });
  }
});

program.parse();
