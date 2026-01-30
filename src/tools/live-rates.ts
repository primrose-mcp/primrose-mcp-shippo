/**
 * Live Rates Tools
 *
 * MCP tools for Shippo live rates (rates at checkout).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, LineItemInput, ParcelCreateInput } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

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

const lineItemSchema = z.object({
  title: z.string(),
  variant_title: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().positive(),
  total_price: z.string().optional(),
  currency: z.string().optional(),
  weight: z.string().optional(),
  weight_unit: z.enum(['g', 'oz', 'lb', 'kg']).optional(),
  manufacture_country: z.string().optional(),
});

/**
 * Register all live rate tools
 */
export function registerLiveRateTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Create Live Rate
  // ===========================================================================
  server.tool(
    'shippo_create_live_rate',
    `Get live shipping rates for checkout.

Returns real-time shipping rates based on service groups you've configured.
Use this to show shipping options to customers at checkout.

Args:
  - address_from: Sender address object OR address ID (required)
  - address_to: Recipient address object OR address ID (required)
  - line_items: Array of line items being shipped (required)
  - parcel: Parcel dimensions object OR parcel ID (optional - uses default template if not provided)

Each line_item should include:
  - title: Product title (required)
  - quantity: Quantity (required)
  - weight: Item weight (optional)
  - weight_unit: Weight unit (optional)

Returns:
  Array of available rates with carrier, service, price, and estimated days.`,
    {
      address_from: z.union([addressSchema, z.string()]).describe('Sender address or ID'),
      address_to: z.union([addressSchema, z.string()]).describe('Recipient address or ID'),
      line_items: z.array(lineItemSchema).min(1).describe('Items being shipped'),
      parcel: z.union([parcelSchema, z.string()]).optional().describe('Parcel dimensions or ID'),
    },
    async (input) => {
      try {
        const rates = await client.createLiveRate({
          address_from: input.address_from as AddressCreateInput | string,
          address_to: input.address_to as AddressCreateInput | string,
          line_items: input.line_items as LineItemInput[],
          parcel: input.parcel as ParcelCreateInput | string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  rates_count: rates.length,
                  rates,
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
  // Get Default Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_get_default_parcel_template',
    `Get the default parcel template for live rates.

The default template is used when no parcel is specified in live rate requests.

Args:
  - format: Response format ('json' or 'markdown')

Returns:
  The default parcel template, or null if not set.`,
    {
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ format }) => {
      try {
        const template = await client.getDefaultParcelTemplate();
        if (!template) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { message: 'No default parcel template set' },
                  null,
                  2
                ),
              },
            ],
          };
        }
        return formatResponse(template, format, 'default_parcel_template');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Default Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_update_default_parcel_template',
    `Set the default parcel template for live rates.

Args:
  - object_id: User parcel template object ID to use as default (required)

Returns:
  The updated default parcel template.`,
    {
      object_id: z.string().describe('User parcel template object ID'),
    },
    async ({ object_id }) => {
      try {
        const template = await client.updateDefaultParcelTemplate({ object_id });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Default parcel template updated',
                  template,
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
  // Delete Default Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_delete_default_parcel_template',
    `Clear the default parcel template for live rates.

After clearing, live rate requests will require a parcel to be specified.

Returns:
  Confirmation of deletion.`,
    {},
    async () => {
      try {
        await client.deleteDefaultParcelTemplate();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Default parcel template cleared',
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
