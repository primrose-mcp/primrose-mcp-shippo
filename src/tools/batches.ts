/**
 * Batch Tools
 *
 * MCP tools for Shippo batch shipment processing.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, BatchShipmentInput, ParcelCreateInput } from '../types/entities.js';
import { formatBatchAsMarkdown, formatError } from '../utils/formatters.js';

// Schemas for batch shipments
const addressSchema = z.object({
  name: z.string(),
  street1: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string().length(2),
  company: z.string().optional(),
  street2: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const parcelSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  distance_unit: z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']).default('in'),
  weight: z.number().positive(),
  mass_unit: z.enum(['g', 'oz', 'lb', 'kg']).default('lb'),
});

const batchShipmentSchema = z.object({
  shipment: z.object({
    address_from: z.union([addressSchema, z.string()]),
    address_to: z.union([addressSchema, z.string()]),
    parcels: z.array(z.union([parcelSchema, z.string()])).min(1),
  }),
  carrier_account: z.string().optional(),
  servicelevel_token: z.string().optional(),
  metadata: z.string().optional(),
});

/**
 * Register all batch-related tools
 */
export function registerBatchTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Get Batch
  // ===========================================================================
  server.tool(
    'shippo_get_batch',
    `Get a batch by ID.

Args:
  - id: The batch object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The batch with status, shipments, and label URLs.`,
    {
      id: z.string().describe('Batch object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const batch = await client.getBatch(id);

        if (format === 'markdown') {
          return {
            content: [{ type: 'text', text: formatBatchAsMarkdown(batch) }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(batch, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Batch
  // ===========================================================================
  server.tool(
    'shippo_create_batch',
    `Create a batch for processing multiple shipments at once.

Batches allow you to create multiple shipping labels efficiently.

Args:
  - default_carrier_account: Default carrier account ID for all shipments
  - default_servicelevel_token: Default service level token (e.g., 'usps_priority')
  - label_file_type: Label format (default: 'PDF_4x6')
  - batch_shipments: Array of shipment objects (see below)
  - metadata: Custom metadata

Each batch_shipment should include:
  - shipment: { address_from, address_to, parcels }
  - carrier_account: Override default carrier (optional)
  - servicelevel_token: Override default service (optional)
  - metadata: Per-shipment metadata (optional)

Returns:
  The created batch with status. Poll until status is VALID.`,
    {
      default_carrier_account: z.string().describe('Default carrier account ID'),
      default_servicelevel_token: z.string().describe('Default service level token'),
      label_file_type: z.enum(['PNG', 'PNG_2.3x7.5', 'PDF', 'PDF_4x6', 'PDF_4x8', 'PDF_A4', 'ZPLII']).default('PDF_4x6'),
      batch_shipments: z.array(batchShipmentSchema).min(1).max(100).describe('Shipments to include'),
      metadata: z.string().optional(),
    },
    async (input) => {
      try {
        const batch = await client.createBatch({
          default_carrier_account: input.default_carrier_account,
          default_servicelevel_token: input.default_servicelevel_token,
          label_file_type: input.label_file_type,
          batch_shipments: input.batch_shipments.map((bs) => ({
            shipment: {
              address_from: bs.shipment.address_from as AddressCreateInput | string,
              address_to: bs.shipment.address_to as AddressCreateInput | string,
              parcels: bs.shipment.parcels as (ParcelCreateInput | string)[],
            },
            carrier_account: bs.carrier_account,
            servicelevel_token: bs.servicelevel_token,
            metadata: bs.metadata,
          })) as BatchShipmentInput[],
          metadata: input.metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Batch created',
                  batch_id: batch.object_id,
                  status: batch.status,
                  shipments_count: batch.batch_shipments.count,
                  batch,
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
  // Add Shipments to Batch
  // ===========================================================================
  server.tool(
    'shippo_add_shipments_to_batch',
    `Add shipments to an existing batch.

Can only add to batches with status VALIDATING or VALID.

Args:
  - batch_id: The batch object ID (required)
  - shipments: Array of shipment objects to add

Returns:
  The updated batch.`,
    {
      batch_id: z.string().describe('Batch object ID'),
      shipments: z.array(batchShipmentSchema).min(1).max(100).describe('Shipments to add'),
    },
    async ({ batch_id, shipments }) => {
      try {
        const batch = await client.addShipmentsToBatch(batch_id, {
          shipments: shipments.map((bs) => ({
            shipment: {
              address_from: bs.shipment.address_from as AddressCreateInput | string,
              address_to: bs.shipment.address_to as AddressCreateInput | string,
              parcels: bs.shipment.parcels as (ParcelCreateInput | string)[],
            },
            carrier_account: bs.carrier_account,
            servicelevel_token: bs.servicelevel_token,
            metadata: bs.metadata,
          })) as BatchShipmentInput[],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Shipments added to batch',
                  batch_id: batch.object_id,
                  status: batch.status,
                  shipments_count: batch.batch_shipments.count,
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
  // Remove Shipments from Batch
  // ===========================================================================
  server.tool(
    'shippo_remove_shipments_from_batch',
    `Remove shipments from an existing batch.

Can only remove from batches with status VALIDATING or VALID.

Args:
  - batch_id: The batch object ID (required)
  - shipment_ids: Array of batch shipment object IDs to remove

Returns:
  The updated batch.`,
    {
      batch_id: z.string().describe('Batch object ID'),
      shipment_ids: z.array(z.string()).min(1).describe('Batch shipment IDs to remove'),
    },
    async ({ batch_id, shipment_ids }) => {
      try {
        const batch = await client.removeShipmentsFromBatch(batch_id, {
          shipment_ids,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Shipments removed from batch',
                  batch_id: batch.object_id,
                  status: batch.status,
                  shipments_count: batch.batch_shipments.count,
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
  // Purchase Batch
  // ===========================================================================
  server.tool(
    'shippo_purchase_batch',
    `Purchase all labels in a batch.

Purchases shipping labels for all valid shipments in the batch.
Batch must have status VALID before purchasing.

Args:
  - batch_id: The batch object ID (required)

Returns:
  The batch with status PURCHASING. Poll until PURCHASED for label URLs.`,
    {
      batch_id: z.string().describe('Batch object ID'),
    },
    async ({ batch_id }) => {
      try {
        const batch = await client.purchaseBatch(batch_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Batch purchase initiated',
                  batch_id: batch.object_id,
                  status: batch.status,
                  label_url: batch.label_url,
                  batch,
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
