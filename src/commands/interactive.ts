import chalk from 'chalk';
import { discoverAll } from '../core/discovery.js';
import { toggleServer } from '../core/toggle.js';
import type { McpServer } from '../clients/base.js';

/**
 * Render the interactive server list to the terminal.
 */
function render(servers: McpServer[], cursor: number, message?: string): void {
  // Clear screen and move to top
  process.stdout.write('\x1B[2J\x1B[H');

  console.log('');
  console.log(chalk.bold('  mcpff') + chalk.dim(' — interactive mode'));
  console.log(chalk.dim('  ↑/↓ navigate · space toggle · q quit'));
  console.log('');

  if (servers.length === 0) {
    console.log(chalk.dim('  No MCP servers found.'));
    console.log(chalk.dim('  Make sure you have servers configured in Claude Code, Cursor, etc.'));
    console.log('');
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
  console.log(
    chalk.bold('     ' +
      pad('CLIENT', clientWidth + 2) +
      pad('SCOPE', scopeWidth + 2) +
      pad('SERVER', nameWidth + 2) +
      'STATUS'
    )
  );
  console.log(chalk.dim('     ' + '─'.repeat(clientWidth + scopeWidth + nameWidth + 16)));

  // Rows
  for (let i = 0; i < sorted.length; i++) {
    const server = sorted[i];
    const isSelected = i === cursor;

    const statusIcon = server.enabled
      ? chalk.green('●') + ' ' + chalk.green('ON')
      : chalk.dim('○') + ' ' + chalk.dim('OFF');

    const pointer = isSelected ? chalk.cyan(' ❯ ') : '   ';

    const clientStr = isSelected
      ? chalk.cyan.bold(pad(server.client, clientWidth + 2))
      : chalk.cyan(pad(server.client, clientWidth + 2));
    const scopeStr = isSelected
      ? chalk.yellow.bold(pad(server.scope, scopeWidth + 2))
      : chalk.yellow(pad(server.scope, scopeWidth + 2));
    const nameStr = isSelected
      ? chalk.white.bold(pad(server.name, nameWidth + 2))
      : server.enabled
        ? chalk.white(pad(server.name, nameWidth + 2))
        : chalk.dim(pad(server.name, nameWidth + 2));

    console.log(pointer + ' ' + clientStr + scopeStr + nameStr + statusIcon);
  }

  // Summary
  const total = sorted.length;
  const active = sorted.filter(s => s.enabled).length;
  const disabled = total - active;

  console.log('');
  console.log(
    chalk.dim('     ') +
    chalk.white(`${total} servers`) +
    chalk.dim(' · ') +
    chalk.green(`${active} on`) +
    chalk.dim(' · ') +
    (disabled > 0 ? chalk.yellow(`${disabled} off`) : chalk.dim(`${disabled} off`))
  );

  // Status message
  if (message) {
    console.log('');
    console.log('  ' + message);
  }

  console.log('');
}

/**
 * Sort servers consistently (same order as render).
 */
function sortServers(servers: McpServer[]): McpServer[] {
  return [...servers].sort((a, b) => {
    if (a.client !== b.client) return a.client.localeCompare(b.client);
    if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
    return a.name.localeCompare(b.name);
  });
}

/**
 * Launch the interactive TUI.
 */
export async function runInteractive(): Promise<void> {
  let servers = sortServers(await discoverAll());
  let cursor = 0;
  let message: string | undefined;

  if (servers.length === 0) {
    render([], 0);
    return;
  }

  render(servers, cursor, message);

  // Enter raw mode for keypress handling
  if (!process.stdin.isTTY) {
    // Not a TTY — fall back to list
    console.log(chalk.dim('  Not a TTY, falling back to list view.'));
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  const cleanup = () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    // Show cursor in case it was hidden
    process.stdout.write('\x1B[?25h');
  };

  process.stdin.on('data', async (key: string) => {
    // Ctrl+C
    if (key === '\x03') {
      cleanup();
      process.exit(0);
    }

    // q or Esc
    if (key === 'q' || key === '\x1B' && key.length === 1) {
      cleanup();
      console.log('');
      process.exit(0);
    }

    // Up arrow
    if (key === '\x1B[A' || key === 'k') {
      cursor = Math.max(0, cursor - 1);
      message = undefined;
      render(servers, cursor, message);
      return;
    }

    // Down arrow
    if (key === '\x1B[B' || key === 'j') {
      cursor = Math.min(servers.length - 1, cursor + 1);
      message = undefined;
      render(servers, cursor, message);
      return;
    }

    // Space or Enter — toggle
    if (key === ' ' || key === '\r') {
      const server = servers[cursor];
      const result = await toggleServer(server);

      if (result.success) {
        const newState = result.newState ? chalk.green('ON') : chalk.dim('OFF');
        message = chalk.green('✓') + ` ${server.name} → ${newState}`;
        // Re-discover to get fresh state
        servers = sortServers(await discoverAll());
        // Keep cursor in bounds
        cursor = Math.min(cursor, servers.length - 1);
      } else {
        message = chalk.red('✗') + ` ${result.error || 'Toggle failed'}`;
      }

      render(servers, cursor, message);
      return;
    }
  });
}
