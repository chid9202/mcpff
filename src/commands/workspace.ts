import { Command } from 'commander';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { addWorkspace, removeWorkspace, listWorkspaces } from '../core/config.js';
import { displayWorkspaces } from '../utils/display.js';
import { fileExists } from '../utils/fs.js';

export const workspaceCommand = new Command('workspace')
  .description('Manage registered workspaces');

workspaceCommand
  .command('add <path>')
  .description('Register a workspace for MCP server discovery')
  .option('-n, --name <alias>', 'Alias for the workspace')
  .action(async (path: string, options) => {
    const resolvedPath = resolve(path);

    // Verify path exists
    if (!(await fileExists(resolvedPath))) {
      console.error(chalk.red(`\n  Error: Path does not exist: ${resolvedPath}\n`));
      process.exit(1);
    }

    try {
      const entry = await addWorkspace(resolvedPath, options.name);
      console.log(chalk.green(`\n  ✓ Registered workspace: ${chalk.bold(entry.name)} (${entry.path})\n`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n  Error: ${message}\n`));
      process.exit(1);
    }
  });

workspaceCommand
  .command('list')
  .description('List registered workspaces')
  .action(async () => {
    const workspaces = await listWorkspaces();
    displayWorkspaces(workspaces);
  });

workspaceCommand
  .command('remove <name-or-path>')
  .description('Remove a registered workspace')
  .action(async (nameOrPath: string) => {
    const resolvedPath = resolve(nameOrPath);
    const removed = await removeWorkspace(nameOrPath) || await removeWorkspace(resolvedPath);

    if (!removed) {
      console.error(chalk.red(`\n  Error: Workspace not found: ${nameOrPath}\n`));
      process.exit(1);
    }

    console.log(chalk.green(`\n  ✓ Removed workspace: ${chalk.bold(removed.name)} (${removed.path})\n`));
  });
