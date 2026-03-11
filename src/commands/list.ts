import { Command } from 'commander';
import { discoverAll } from '../core/discovery.js';
import { displayServerTable } from '../utils/display.js';

export const listCommand = new Command('list')
  .description('List all MCP servers across all clients')
  .option('-c, --client <name>', 'Filter by client (e.g., claude-code, cursor)')
  .option('-w, --workspace <name>', 'Filter by registered workspace')
  .action(async (options) => {
    const servers = await discoverAll({
      client: options.client,
      workspace: options.workspace,
    });
    displayServerTable(servers);
  });
