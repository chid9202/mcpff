import { Command } from 'commander';
import { discoverAll } from '../core/discovery.js';
import { displayStatus } from '../utils/display.js';

export const statusCommand = new Command('status')
  .description('Show summary of MCP server status across all clients')
  .action(async () => {
    const servers = await discoverAll();
    displayStatus(servers);
  });
