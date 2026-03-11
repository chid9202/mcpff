#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { onCommand } from './commands/on.js';
import { offCommand } from './commands/off.js';
import { flipCommand } from './commands/flip.js';
import { workspaceCommand } from './commands/workspace.js';
import { statusCommand } from './commands/status.js';
import { backupCommand, backupListCommand } from './commands/backup.js';
import { restoreCommand } from './commands/restore.js';
import { runInteractive } from './commands/interactive.js';

const program = new Command();

program
  .name('mcpff')
  .description('MCP Flip-Flop — Toggle MCP server configs on/off across AI clients')
  .version('0.1.0');

program.addCommand(listCommand);
program.addCommand(onCommand);
program.addCommand(offCommand);
program.addCommand(flipCommand);
program.addCommand(workspaceCommand);
program.addCommand(statusCommand);
program.addCommand(backupCommand);
program.addCommand(backupListCommand);
program.addCommand(restoreCommand);

// Default to interactive mode if no command given (TTY), else list
program.action(async () => {
  if (process.stdin.isTTY) {
    await runInteractive();
  } else {
    await listCommand.parseAsync([], { from: 'user' });
  }
});

program.parse();
