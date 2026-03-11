import { Command } from 'commander';
import chalk from 'chalk';
import { discoverAll } from '../core/discovery.js';
import { createFullBackup, listBackups } from '../core/backup.js';
import { displayBackups } from '../utils/display.js';

export const backupCommand = new Command('backup')
  .description('Create a manual backup of all config files')
  .action(async () => {
    const servers = await discoverAll();

    // Collect unique config paths
    const configPaths = [...new Set(servers.filter(s => s.enabled).map(s => s.configPath).filter(Boolean))];

    if (configPaths.length === 0) {
      console.log(chalk.dim('\n  No config files found to back up.\n'));
      return;
    }

    const backupDir = await createFullBackup(configPaths);
    console.log(chalk.green(`\n  ✓ Backup created: ${chalk.dim(backupDir)}`));
    console.log(chalk.dim(`    ${configPaths.length} config files backed up.\n`));
  });

export const backupListCommand = new Command('backup-list')
  .description('List available backups')
  .action(async () => {
    const backups = await listBackups();
    displayBackups(backups);
  });
