import chalk from 'chalk';
import type { McpServer } from '../clients/base.js';

/**
 * Display a formatted table of MCP servers.
 */
export function displayServerTable(servers: McpServer[]): void {
  if (servers.length === 0) {
    console.log(chalk.dim('\n  No MCP servers found.\n'));
    console.log(chalk.dim('  Tip: Make sure you have MCP servers configured in Claude Code, Cursor, or other supported clients.'));
    console.log(chalk.dim('  Run `mcpff workspace add <path>` to register project workspaces.\n'));
    return;
  }

  // Sort: by client, then scope, then name
  const sorted = [...servers].sort((a, b) => {
    if (a.client !== b.client) return a.client.localeCompare(b.client);
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.name.localeCompare(b.name);
  });

  // Column widths
  const clientWidth = Math.max(8, ...sorted.map(s => s.client.length));
  const scopeWidth = Math.max(6, ...sorted.map(s => s.scope.length));
  const nameWidth = Math.max(8, ...sorted.map(s => s.name.length));

  const pad = (str: string, width: number) => str.padEnd(width);

  // Header
  console.log('');
  console.log(
    chalk.bold('  ' +
      pad('CLIENT', clientWidth + 2) +
      pad('SCOPE', scopeWidth + 2) +
      pad('SERVER', nameWidth + 2) +
      'STATUS'
    )
  );
  console.log(chalk.dim('  ' + '─'.repeat(clientWidth + scopeWidth + nameWidth + 16)));

  // Rows
  for (const server of sorted) {
    const statusIcon = server.enabled
      ? chalk.green('●') + ' ' + chalk.green('ON')
      : chalk.dim('○') + ' ' + chalk.dim('OFF');

    const clientStr = chalk.cyan(pad(server.client, clientWidth + 2));
    const scopeStr = chalk.yellow(pad(server.scope, scopeWidth + 2));
    const nameStr = server.enabled
      ? chalk.white(pad(server.name, nameWidth + 2))
      : chalk.dim(pad(server.name, nameWidth + 2));

    console.log('  ' + clientStr + scopeStr + nameStr + statusIcon);
  }

  // Summary
  const total = sorted.length;
  const active = sorted.filter(s => s.enabled).length;
  const disabled = total - active;

  console.log('');
  console.log(
    chalk.dim('  ') +
    chalk.white(`${total} servers total`) +
    chalk.dim(' · ') +
    chalk.green(`${active} active`) +
    chalk.dim(' · ') +
    (disabled > 0 ? chalk.yellow(`${disabled} disabled`) : chalk.dim(`${disabled} disabled`))
  );
  console.log('');
}

/**
 * Display toggle results.
 */
export function displayToggleResults(
  action: 'on' | 'off',
  results: { server: McpServer; success: boolean; error?: string }[],
  skipped: { server: McpServer; reason: string }[],
  backupPath?: string,
): void {
  const verb = action === 'off' ? 'Disabled' : 'Enabled';
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  if (successes.length > 0) {
    console.log('');
    console.log(chalk.bold(`  ${verb}:`));
    for (const r of successes) {
      console.log(chalk.green(`    ✓ ${r.server.client} → ${r.server.scope} → ${r.server.name}`));
    }
  }

  if (failures.length > 0) {
    console.log('');
    console.log(chalk.bold.red('  Failed:'));
    for (const r of failures) {
      console.log(chalk.red(`    ✗ ${r.server.client} → ${r.server.scope}: ${r.error}`));
    }
  }

  if (backupPath) {
    console.log('');
    console.log(chalk.dim(`  Backed up to ${backupPath}`));
  }

  if (skipped.length > 0) {
    console.log('');
    console.log(chalk.dim(`  Skipped (already ${action === 'off' ? 'off' : 'on'}):`));
    for (const s of skipped) {
      console.log(chalk.dim(`    · ${s.server.client} → ${s.server.scope} → ${s.server.name}`));
    }
  }

  console.log('');
}

/**
 * Display status summary.
 */
export function displayStatus(servers: McpServer[]): void {
  const total = servers.length;
  const active = servers.filter(s => s.enabled).length;
  const disabled = total - active;

  const clients = new Set(servers.map(s => s.client));
  const scopes = new Set(servers.map(s => `${s.client}:${s.scope}`));

  console.log('');
  console.log(chalk.bold('  mcpff status'));
  console.log(chalk.dim('  ' + '─'.repeat(40)));
  console.log(`  Servers:  ${chalk.white(String(total))} total`);
  console.log(`  Active:   ${chalk.green(String(active))}`);
  console.log(`  Disabled: ${disabled > 0 ? chalk.yellow(String(disabled)) : chalk.dim('0')}`);
  console.log(`  Clients:  ${chalk.cyan(String(clients.size))} (${[...clients].join(', ')})`);
  console.log(`  Scopes:   ${chalk.yellow(String(scopes.size))}`);
  console.log('');
}

/**
 * Display workspace list.
 */
export function displayWorkspaces(workspaces: { name: string; path: string; clients?: string[] }[]): void {
  if (workspaces.length === 0) {
    console.log(chalk.dim('\n  No workspaces registered.\n'));
    console.log(chalk.dim('  Run `mcpff workspace add <path>` to register a workspace.\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold('  Registered Workspaces'));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  for (const ws of workspaces) {
    console.log(`  ${chalk.cyan(ws.name)}  ${chalk.dim(ws.path)}`);
    if (ws.clients && ws.clients.length > 0) {
      console.log(chalk.dim(`    clients: ${ws.clients.join(', ')}`));
    }
  }
  console.log('');
}

/**
 * Display backup list.
 */
export function displayBackups(backups: { timestamp: string; fileCount: number }[]): void {
  if (backups.length === 0) {
    console.log(chalk.dim('\n  No backups found.\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold('  Available Backups'));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  for (const b of backups) {
    console.log(`  ${chalk.cyan(b.timestamp)}  ${chalk.dim(`(${b.fileCount} files)`)}`);
  }
  console.log('');
}
