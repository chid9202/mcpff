import { Command } from 'commander';
import chalk from 'chalk';
import { restoreBackup, listBackups } from '../core/backup.js';

export const restoreCommand = new Command('restore')
  .description('Restore config files from a backup')
  .argument('<timestamp>', 'Backup timestamp to restore (use `mcpff backup-list` to see available)')
  .action(async (timestamp: string) => {
    try {
      const { restored, errors } = await restoreBackup(timestamp);

      if (restored.length > 0) {
        console.log(chalk.green('\n  ✓ Restored:'));
        for (const path of restored) {
          console.log(chalk.green(`    ${path}`));
        }
      }

      if (errors.length > 0) {
        console.log(chalk.red('\n  ✗ Errors:'));
        for (const err of errors) {
          console.log(chalk.red(`    ${err}`));
        }
      }

      if (restored.length === 0 && errors.length === 0) {
        console.log(chalk.dim('\n  Backup was empty — nothing to restore.'));
      }

      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`\n  Error: ${message}\n`));

      // Show available backups as hint
      const backups = await listBackups();
      if (backups.length > 0) {
        console.log(chalk.dim('  Available backups:'));
        for (const b of backups.slice(0, 5)) {
          console.log(chalk.dim(`    ${b.timestamp}`));
        }
        console.log('');
      }

      process.exit(1);
    }
  });
