/**
 * Shipment Tools
 *
 * MCP tools for Shippo shipment management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, ParcelCreateInput, ShipmentExtra } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

// Schemas for nested objects
const addressSchema = z.object({
  name: z.string(),
  street1: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string().length(2),
  company: z.string().optional(),
  street2: z.string().optional(),
  street3: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_residential: z.boolean().optional(),
});

const parcelSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  distance_unit: z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']).default('in'),
  weight: z.number().positive(),
  mass_unit: z.enum(['g', 'oz', 'lb', 'kg']).default('lb'),
  template: z.string().optional(),
});

/**
 * Register all shipment-related tools
 */
export function registerShipmentTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Shipments
  // ===========================================================================
  server.tool(
    'shippo_list_shipments',
    `List all shipments from your Shippo account with pagination.

Returns a paginated list of shipments with addresses and rates.

Args:
  - results: Number of shipments to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of shipments with status, addresses, and available rates.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of shipments to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listShipments({ results, page });
        return formatResponse(result, format, 'shipments');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Shipment
  // ===========================================================================
  server.tool(
    'shippo_get_shipment',
    `Get a single shipment by ID.

Args:
  - id: The shipment object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The shipment record with addresses, parcels, and available rates.`,
    {
      id: z.string().describe('Shipment object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const shipment = await client.getShipment(id);
        return formatResponse(shipment, format, 'shipment');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Shipment
  // ===========================================================================
  server.tool(
    'shippo_create_shipment',
    `Create a new shipment in Shippo to get shipping rates.

A shipment represents a package being sent from one address to another.
Creating a shipment will automatically fetch available rates from carriers.

Args:
  - address_from: Sender address object OR existing address ID
  - address_to: Recipient address object OR existing address ID
  - parcels: Array of parcel objects OR existing parcel IDs
  - address_return: Return address object OR ID (optional)
  - shipment_date: Date shipment will be tendered to carrier (optional)
  - customs_declaration: Customs declaration ID for international (optional)
  - carrier_accounts: Array of carrier account IDs to get rates from (optional)
  - extra: Extra shipment options (signature, insurance, etc.)
  - metadata: Custom metadata string
  - async: If true, rates are fetched asynchronously (default: false)

Returns:
  The created shipment with available rates from carriers.`,
    {
      address_from: z.union([addressSchema, z.string()]).describe('Sender address or address ID'),
      address_to: z.union([addressSchema, z.string()]).describe('Recipient address or address ID'),
      parcels: z.array(z.union([parcelSchema, z.string()])).min(1).describe('Parcels or parcel IDs'),
      address_return: z.union([addressSchema, z.string()]).optional().describe('Return address or ID'),
      shipment_date: z.string().optional().describe('Shipment date (ISO 8601)'),
      customs_declaration: z.string().optional().describe('Customs declaration ID'),
      carrier_accounts: z.array(z.string()).optional().describe('Carrier account IDs'),
      extra: z.object({
        signature_confirmation: z.enum(['STANDARD', 'ADULT', 'CERTIFIED', 'INDIRECT', 'CARRIER_CONFIRMATION']).optional(),
        authority_to_leave: z.boolean().optional(),
        saturday_delivery: z.boolean().optional(),
        is_return: z.boolean().optional(),
        reference_1: z.string().optional(),
        reference_2: z.string().optional(),
        insurance: z.object({
          amount: z.string(),
          currency: z.string(),
          content: z.string(),
        }).optional(),
        cod: z.object({
          amount: z.string(),
          currency: z.string(),
          payment_method: z.enum(['SECURED_FUNDS', 'CASH', 'ANY']),
        }).optional(),
      }).optional().describe('Extra shipment options'),
      metadata: z.string().optional().describe('Custom metadata'),
      async: z.boolean().optional().describe('Fetch rates asynchronously'),
    },
    async (input) => {
      try {
        const shipment = await client.createShipment({
          address_from: input.address_from as AddressCreateInput | string,
          address_to: input.address_to as AddressCreateInput | string,
          parcels: input.parcels as (ParcelCreateInput | string)[],
          address_return: input.address_return as AddressCreateInput | string | undefined,
          shipment_date: input.shipment_date,
          customs_declaration: input.customs_declaration,
          carrier_accounts: input.carrier_accounts,
          extra: input.extra as ShipmentExtra | undefined,
          metadata: input.metadata,
          async: input.async,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Shipment created',
                  shipment_id: shipment.object_id,
                  status: shipment.status,
                  rates_count: shipment.rates.length,
                  shipment,
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
