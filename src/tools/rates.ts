/**
 * Rate Tools
 *
 * MCP tools for Shippo shipping rates.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all rate-related tools
 */
export function registerRateTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Get Rate
  // ===========================================================================
  server.tool(
    'shippo_get_rate',
    `Get a single rate by ID.

Args:
  - id: The rate object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The rate record with carrier, service level, price, and estimated delivery.`,
    {
      id: z.string().describe('Rate object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const rate = await client.getRate(id);
        return formatResponse(rate, format, 'rate');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // List Shipment Rates
  // ===========================================================================
  server.tool(
    'shippo_list_shipment_rates',
    `List all rates for a shipment.

Gets available shipping rates for an existing shipment.
Optionally filter by currency.

Args:
  - shipment_id: The shipment object ID (required)
  - currency: ISO currency code to filter rates (e.g., 'USD')
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of rates with carrier, service, price, and estimated days.`,
    {
      shipment_id: z.string().describe('Shipment object ID'),
      currency: z.string().optional().describe('ISO currency code (e.g., USD)'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ shipment_id, currency, format }) => {
      try {
        const result = await client.listShipmentRates(shipment_id, currency);
        return formatResponse(result, format, 'rates');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
