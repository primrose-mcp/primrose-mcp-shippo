/**
 * Carrier Account Tools
 *
 * MCP tools for Shippo carrier account management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all carrier account tools
 */
export function registerCarrierAccountTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Carrier Accounts
  // ===========================================================================
  server.tool(
    'shippo_list_carrier_accounts',
    `List all carrier accounts connected to your Shippo account.

Returns a paginated list of carrier accounts including Shippo's
pre-configured accounts and your own connected carrier accounts.

Args:
  - results: Number of accounts to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of carrier accounts with carrier name, account ID, and status.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of accounts to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listCarrierAccounts({ results, page });
        return formatResponse(result, format, 'carrier_accounts');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Carrier Account
  // ===========================================================================
  server.tool(
    'shippo_get_carrier_account',
    `Get a single carrier account by ID.

Args:
  - id: The carrier account object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The carrier account with carrier name, credentials, and status.`,
    {
      id: z.string().describe('Carrier account object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const account = await client.getCarrierAccount(id);
        return formatResponse(account, format, 'carrier_account');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Carrier Account
  // ===========================================================================
  server.tool(
    'shippo_create_carrier_account',
    `Connect a new carrier account to Shippo.

Connects your own carrier account (e.g., your UPS or FedEx account)
to Shippo to get negotiated rates.

Args:
  - carrier: Carrier name/token (e.g., 'ups', 'fedex', 'dhl_express')
  - account_id: Your account ID with the carrier
  - parameters: Carrier-specific authentication parameters (JSON object)
  - active: Whether the account should be active (default: true)
  - metadata: Custom metadata string

Returns:
  The created carrier account.`,
    {
      carrier: z.string().describe('Carrier name/token'),
      account_id: z.string().describe('Your account ID with the carrier'),
      parameters: z.record(z.string(), z.unknown()).optional().describe('Carrier-specific parameters'),
      active: z.boolean().default(true).describe('Whether account is active'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async ({ carrier, account_id, parameters, active, metadata }) => {
      try {
        const account = await client.createCarrierAccount({
          carrier,
          account_id,
          parameters,
          active,
          metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Carrier account created',
                  account_id: account.object_id,
                  carrier: account.carrier,
                  active: account.active,
                  account,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Carrier Account
  // ===========================================================================
  server.tool(
    'shippo_update_carrier_account',
    `Update an existing carrier account.

Args:
  - id: The carrier account object ID (required)
  - account_id: New account ID with the carrier
  - parameters: New carrier-specific parameters
  - active: Enable or disable the account
  - metadata: New custom metadata

Returns:
  The updated carrier account.`,
    {
      id: z.string().describe('Carrier account object ID'),
      account_id: z.string().optional().describe('New account ID'),
      parameters: z.record(z.string(), z.unknown()).optional().describe('New carrier-specific parameters'),
      active: z.boolean().optional().describe('Enable or disable account'),
      metadata: z.string().optional().describe('New custom metadata'),
    },
    async ({ id, ...input }) => {
      try {
        const account = await client.updateCarrierAccount(id, input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Carrier account updated',
                  account,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
