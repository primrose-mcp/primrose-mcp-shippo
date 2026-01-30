/**
 * Manifest Tools
 *
 * MCP tools for Shippo manifest management (end-of-day forms).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all manifest-related tools
 */
export function registerManifestTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Manifests
  // ===========================================================================
  server.tool(
    'shippo_list_manifests',
    `List all manifests (end-of-day forms) from your Shippo account.

Manifests are used to close out shipments with carriers at the end of the day.

Args:
  - results: Number of manifests to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of manifests with status and transaction counts.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of manifests to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listManifests({ results, page });
        return formatResponse(result, format, 'manifests');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Manifest
  // ===========================================================================
  server.tool(
    'shippo_get_manifest',
    `Get a single manifest by ID.

Args:
  - id: The manifest object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The manifest with status, transactions, and document URLs.`,
    {
      id: z.string().describe('Manifest object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const manifest = await client.getManifest(id);
        return formatResponse(manifest, format, 'manifest');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Manifest
  // ===========================================================================
  server.tool(
    'shippo_create_manifest',
    `Create a manifest (end-of-day form) for a carrier.

Manifests close out all shipments for a carrier on a given date.
Required by some carriers before pickup.

Args:
  - carrier_account: Carrier account object ID (required)
  - shipment_date: Date for the manifest (ISO 8601, required)
  - address_from: Origin address object ID (required)
  - transactions: Array of transaction object IDs to include (required)
  - async: If true, manifest is created asynchronously

Returns:
  The created manifest with status and document URLs.`,
    {
      carrier_account: z.string().describe('Carrier account object ID'),
      shipment_date: z.string().describe('Manifest date (ISO 8601)'),
      address_from: z.string().describe('Origin address object ID'),
      transactions: z.array(z.string()).min(1).describe('Transaction IDs to include'),
      async: z.boolean().optional().describe('Create asynchronously'),
    },
    async ({ carrier_account, shipment_date, address_from, transactions, async: asyncCreate }) => {
      try {
        const manifest = await client.createManifest({
          carrier_account,
          shipment_date,
          address_from,
          transactions,
          async: asyncCreate,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Manifest created',
                  manifest_id: manifest.object_id,
                  status: manifest.status,
                  transactions_count: manifest.transactions.length,
                  documents: manifest.documents,
                  manifest,
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
