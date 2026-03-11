import { Command } from 'commander';
import chalk from 'chalk';
import { findServers, discoverAll } from '../core/discovery.js';
import { enableServer } from '../core/toggle.js';
import { displayToggleResults } from '../utils/display.js';
import type { McpServer } from '../clients/base.js';

export const onCommand = new Command('on')
  .description('Enable a disabled MCP server')
  .argument('[server]', 'Server name to enable')
  .option('-c, --client <name>', 'Filter by client')
  .option('-w, --workspace <name>', 'Filter by workspace')
  .option('--all', 'Enable all disabled servers')
  .action(async (serverName: string | undefined, options) => {
    if (!serverName && !options.all) {
      console.error(chalk.red('\n  Error: Specify a server name or use --all\n'));
      process.exit(1);
    }

    let targets: McpServer[];

    if (options.all) {
      // Enable all disabled servers
      const all = await discoverAll({ client: options.client, workspace: options.workspace });
      targets = all.filter(s => !s.enabled);
    } else {
      targets = await findServers(serverName!, { client: options.client, workspace: options.workspace });
    }

    if (targets.length === 0) {
      if (options.all) {
        console.log(chalk.dim('\n  No disabled servers found.\n'));
      } else {
        console.error(chalk.red(`\n  Error: Server '${serverName}' not found.\n`));
        console.log(chalk.dim('  Run `mcpff list` to see all servers.\n'));
      }
      process.exit(1);
    }

    const results: { server: McpServer; success: boolean; error?: string }[] = [];
    const skipped: { server: McpServer; reason: string }[] = [];

    for (const server of targets) {
      if (server.enabled) {
        skipped.push({ server, reason: 'already enabled' });
        continue;
      }
      const result = await enableServer(server);
      results.push({ server, ...result });
    }

    displayToggleResults('on', results, skipped);
  });
