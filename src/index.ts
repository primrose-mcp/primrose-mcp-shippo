/**
 * Shippo MCP Server - Main Entry Point
 *
 * This file sets up the MCP server using Cloudflare's Agents SDK.
 * It supports both stateless (McpServer) and stateful (McpAgent) modes.
 *
 * MULTI-TENANT ARCHITECTURE:
 * Tenant credentials (API keys) are parsed from request headers,
 * allowing a single server deployment to serve multiple customers.
 *
 * Required Headers:
 * - X-Shippo-API-Key: Shippo API key for authentication
 *
 * Optional Headers:
 * - X-Shippo-Base-URL: Override the default Shippo API base URL
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createShippoClient } from './client.js';
import {
  registerAddressTools,
  registerBatchTools,
  registerCarrierAccountTools,
  registerCustomsTools,
  registerLiveRateTools,
  registerManifestTools,
  registerOrderTools,
  registerParcelTemplateTools,
  registerParcelTools,
  registerPickupTools,
  registerRateTools,
  registerRefundTools,
  registerServiceGroupTools,
  registerShipmentTools,
  registerTrackingTools,
  registerTransactionTools,
} from './tools/index.js';
import {
  type Env,
  type TenantCredentials,
  parseTenantCredentials,
  validateCredentials,
} from './types/env.js';

// =============================================================================
// MCP Server Configuration
// =============================================================================

const SERVER_NAME = 'primrose-mcp-shippo';
const SERVER_VERSION = '1.0.0';

// =============================================================================
// MCP Agent (Stateful - uses Durable Objects)
// =============================================================================

/**
 * McpAgent provides stateful MCP sessions backed by Durable Objects.
 *
 * NOTE: For multi-tenant deployments, use the stateless mode (Option 2) instead.
 * The stateful McpAgent is better suited for single-tenant deployments where
 * credentials can be stored as wrangler secrets.
 *
 * @deprecated For multi-tenant support, use stateless mode with per-request credentials
 */
export class ShippoMcpAgent extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    throw new Error(
      'Stateful mode (McpAgent) is not supported for multi-tenant deployments. ' +
        'Use the stateless /mcp endpoint with X-Shippo-API-Key header instead.'
    );
  }
}

// =============================================================================
// Stateless MCP Server (Recommended - no Durable Objects needed)
// =============================================================================

/**
 * Creates a stateless MCP server instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides credentials via headers, allowing
 * a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
function createStatelessServer(credentials: TenantCredentials): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Create client with tenant-specific credentials
  const client = createShippoClient(credentials);

  // Register all Shippo tools
  registerAddressTools(server, client);
  registerParcelTools(server, client);
  registerShipmentTools(server, client);
  registerRateTools(server, client);
  registerTransactionTools(server, client);
  registerTrackingTools(server, client);
  registerRefundTools(server, client);
  registerCarrierAccountTools(server, client);
  registerCustomsTools(server, client);
  registerManifestTools(server, client);
  registerBatchTools(server, client);
  registerPickupTools(server, client);
  registerOrderTools(server, client);
  registerServiceGroupTools(server, client);
  registerParcelTemplateTools(server, client);
  registerLiveRateTools(server, client);

  // Test connection tool
  server.tool('shippo_test_connection', 'Test the connection to the Shippo API', {}, async () => {
    try {
      const result = await client.testConnection();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * Main fetch handler for the Worker
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', server: SERVER_NAME }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ==========================================================================
    // Stateless MCP with Streamable HTTP (Recommended for multi-tenant)
    // ==========================================================================
    if (url.pathname === '/mcp' && request.method === 'POST') {
      // Parse tenant credentials from request headers
      const credentials = parseTenantCredentials(request);

      // Validate credentials are present
      try {
        validateCredentials(credentials);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: error instanceof Error ? error.message : 'Invalid credentials',
            required_headers: ['X-Shippo-API-Key'],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Create server with tenant-specific credentials
      const server = createStatelessServer(credentials);

      // Import and use createMcpHandler for streamable HTTP
      const { createMcpHandler } = await import('agents/mcp');
      const handler = createMcpHandler(server);
      return handler(request, env, ctx);
    }

    // SSE endpoint for legacy clients
    if (url.pathname === '/sse') {
      return new Response('SSE endpoint requires Durable Objects. Enable in wrangler.jsonc.', {
        status: 501,
      });
    }

    // Default response with API documentation
    return new Response(
      JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Multi-tenant Shippo Shipping MCP Server',
        endpoints: {
          mcp: '/mcp (POST) - Streamable HTTP MCP endpoint',
          health: '/health - Health check',
        },
        authentication: {
          description: 'Pass tenant credentials via request headers',
          required_headers: {
            'X-Shippo-API-Key': 'Your Shippo API key',
          },
          optional_headers: {
            'X-Shippo-Base-URL': 'Override the default Shippo API base URL',
          },
        },
        tools: [
          // Addresses
          'shippo_list_addresses',
          'shippo_get_address',
          'shippo_create_address',
          'shippo_validate_address',
          // Parcels
          'shippo_list_parcels',
          'shippo_get_parcel',
          'shippo_create_parcel',
          // Shipments
          'shippo_list_shipments',
          'shippo_get_shipment',
          'shippo_create_shipment',
          // Rates
          'shippo_get_rate',
          'shippo_list_shipment_rates',
          // Transactions (Labels)
          'shippo_list_transactions',
          'shippo_get_transaction',
          'shippo_create_transaction',
          'shippo_create_instant_transaction',
          // Tracking
          'shippo_get_tracking_status',
          'shippo_register_tracking_webhook',
          // Refunds
          'shippo_create_refund',
          'shippo_get_refund',
          // Carrier Accounts
          'shippo_list_carrier_accounts',
          'shippo_get_carrier_account',
          'shippo_create_carrier_account',
          'shippo_update_carrier_account',
          // Customs
          'shippo_list_customs_items',
          'shippo_get_customs_item',
          'shippo_create_customs_item',
          'shippo_list_customs_declarations',
          'shippo_get_customs_declaration',
          'shippo_create_customs_declaration',
          // Manifests
          'shippo_list_manifests',
          'shippo_get_manifest',
          'shippo_create_manifest',
          // Batches
          'shippo_get_batch',
          'shippo_create_batch',
          'shippo_add_shipments_to_batch',
          'shippo_remove_shipments_from_batch',
          'shippo_purchase_batch',
          // Pickups
          'shippo_create_pickup',
          // Orders
          'shippo_list_orders',
          'shippo_get_order',
          'shippo_create_order',
          // Service Groups
          'shippo_list_service_groups',
          'shippo_create_service_group',
          'shippo_update_service_group',
          'shippo_delete_service_group',
          // Parcel Templates
          'shippo_list_carrier_parcel_templates',
          'shippo_get_carrier_parcel_template',
          'shippo_list_user_parcel_templates',
          'shippo_get_user_parcel_template',
          'shippo_create_user_parcel_template',
          'shippo_delete_user_parcel_template',
          // Live Rates
          'shippo_create_live_rate',
          'shippo_get_default_parcel_template',
          'shippo_update_default_parcel_template',
          'shippo_delete_default_parcel_template',
          // Connection
          'shippo_test_connection',
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
