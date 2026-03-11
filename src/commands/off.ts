import { Command } from 'commander';
import chalk from 'chalk';
import { findServers, discoverAll } from '../core/discovery.js';
import { disableServer } from '../core/toggle.js';
import { displayToggleResults } from '../utils/display.js';
import type { McpServer } from '../clients/base.js';

export const offCommand = new Command('off')
  .description('Disable an MCP server (preserves config)')
  .argument('[server]', 'Server name to disable')
  .option('-c, --client <name>', 'Filter by client')
  .option('-w, --workspace <name>', 'Filter by workspace')
  .option('--all', 'Disable all servers')
  .option('--except <servers>', 'Comma-separated list of servers to keep enabled (use with --all)')
  .option('--dry-run', 'Show what would change without making modifications')
  .action(async (serverName: string | undefined, options) => {
    if (!serverName && !options.all) {
      console.error(chalk.red('\n  Error: Specify a server name or use --all\n'));
      process.exit(1);
    }

    let targets: McpServer[];
    const exceptList = options.except ? (options.except as string).split(',').map((s: string) => s.trim()) : [];

    if (options.all) {
      // Disable all servers (except ones in --except list)
      const all = await discoverAll({ client: options.client, workspace: options.workspace });
      targets = all.filter(s => s.enabled && !exceptList.includes(s.name));
    } else {
      targets = await findServers(serverName!, { client: options.client, workspace: options.workspace });
    }

    if (targets.length === 0) {
      if (options.all) {
        console.log(chalk.dim('\n  No enabled servers found to disable.\n'));
      } else {
        console.error(chalk.red(`\n  Error: Server '${serverName}' not found.\n`));
        console.log(chalk.dim('  Run `mcpff list` to see all servers.\n'));
      }
      process.exit(1);
    }

    if (options.dryRun) {
      console.log(chalk.bold('\n  Dry run — no changes will be made:\n'));
      for (const server of targets) {
        if (!server.enabled) {
          console.log(chalk.dim(`    · ${server.client} → ${server.scope} → ${server.name} (already off)`));
        } else {
          console.log(chalk.yellow(`    ○ Would disable: ${server.client} → ${server.scope} → ${server.name}`));
        }
      }
      console.log('');
      return;
    }

    const results: { server: McpServer; success: boolean; error?: string }[] = [];
    const skipped: { server: McpServer; reason: string }[] = [];

    for (const server of targets) {
      if (!server.enabled) {
        skipped.push({ server, reason: 'already disabled' });
        continue;
      }
      const result = await disableServer(server);
      results.push({ server, ...result });
    }

    displayToggleResults('off', results, skipped);
  });
