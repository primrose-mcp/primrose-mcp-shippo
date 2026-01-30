/**
 * Parcel Tools
 *
 * MCP tools for Shippo parcel management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all parcel-related tools
 */
export function registerParcelTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Parcels
  // ===========================================================================
  server.tool(
    'shippo_list_parcels',
    `List all parcels from your Shippo account with pagination.

Returns a paginated list of saved parcels.

Args:
  - results: Number of parcels to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of parcels with dimensions and weight.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of parcels to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listParcels({ results, page });
        return formatResponse(result, format, 'parcels');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Parcel
  // ===========================================================================
  server.tool(
    'shippo_get_parcel',
    `Get a single parcel by ID.

Args:
  - id: The parcel object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The parcel record with dimensions and weight.`,
    {
      id: z.string().describe('Parcel object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const parcel = await client.getParcel(id);
        return formatResponse(parcel, format, 'parcel');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Parcel
  // ===========================================================================
  server.tool(
    'shippo_create_parcel',
    `Create a new parcel in Shippo.

Args:
  - length: Parcel length (required)
  - width: Parcel width (required)
  - height: Parcel height (required)
  - distance_unit: Unit for dimensions - 'cm', 'in', 'ft', 'mm', 'm', 'yd' (default: 'in')
  - weight: Parcel weight (required)
  - mass_unit: Unit for weight - 'g', 'oz', 'lb', 'kg' (default: 'lb')
  - template: Carrier parcel template token (optional)
  - metadata: Custom metadata string

Returns:
  The created parcel record with object_id for future reference.`,
    {
      length: z.number().positive().describe('Parcel length'),
      width: z.number().positive().describe('Parcel width'),
      height: z.number().positive().describe('Parcel height'),
      distance_unit: z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']).default('in').describe('Distance unit'),
      weight: z.number().positive().describe('Parcel weight'),
      mass_unit: z.enum(['g', 'oz', 'lb', 'kg']).default('lb').describe('Mass unit'),
      template: z.string().optional().describe('Carrier parcel template token'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async (input) => {
      try {
        const parcel = await client.createParcel(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Parcel created', parcel }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
