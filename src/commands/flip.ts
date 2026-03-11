import { Command } from 'commander';
import chalk from 'chalk';
import { findServers } from '../core/discovery.js';
import { toggleServer } from '../core/toggle.js';

export const flipCommand = new Command('flip')
  .description('Toggle a server\'s state (on → off, off → on)')
  .argument('<server>', 'Server name to toggle')
  .option('-c, --client <name>', 'Filter by client')
  .option('-w, --workspace <name>', 'Filter by workspace')
  .action(async (serverName: string, options) => {
    const targets = await findServers(serverName, {
      client: options.client,
      workspace: options.workspace,
    });

    if (targets.length === 0) {
      console.error(chalk.red(`\n  Error: Server '${serverName}' not found.\n`));
      console.log(chalk.dim('  Run `mcpff list` to see all servers.\n'));
      process.exit(1);
    }

    console.log('');
    for (const server of targets) {
      const result = await toggleServer(server);
      if (result.success) {
        const newStateStr = result.newState
          ? chalk.green('● ON')
          : chalk.dim('○ OFF');
        console.log(`  ${chalk.green('✓')} ${server.client} → ${server.scope} → ${server.name}  ${newStateStr}`);
      } else {
        console.log(`  ${chalk.red('✗')} ${server.client} → ${server.scope} → ${server.name}: ${chalk.red(result.error || 'Unknown error')}`);
      }
    }
    console.log('');
  });
