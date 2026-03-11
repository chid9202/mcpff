/**
 * Raw MCP server configuration object as stored in config files.
 */
export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: unknown; // preserve any extra fields
}

/**
 * A discovered MCP server with its location and state.
 */
export interface McpServer {
  name: string;
  client: string;       // "claude-code", "cursor", etc.
  scope: string;        // "user", "global", "project: UpPhish", etc.
  config: McpServerConfig;
  enabled: boolean;
  configPath: string;   // actual file path this came from
}

/**
 * Interface that all client adapters must implement.
 */
export interface McpClient {
  /** Client identifier, e.g. "claude-code" */
  name: string;

  /** Discover all MCP servers for this client. */
  discover(): Promise<McpServer[]>;

  /** Get the config file path for a given scope. */
  getConfigPath(scope: string): string;

  /** Read all servers from a specific scope. */
  readServers(scope: string): Promise<Record<string, McpServerConfig>>;

  /** Write servers to a specific scope. */
  writeServers(scope: string, servers: Record<string, McpServerConfig>): Promise<void>;

  /** Optional: reload the client to pick up config changes. */
  reload?(): Promise<void>;
}
