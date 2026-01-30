/**
 * Service Group Tools
 *
 * MCP tools for Shippo service group management (live rates configuration).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { ServiceGroupServiceLevel } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

const serviceGroupTypes = ['LIVE_RATE', 'FLAT_RATE', 'FREE_SHIPPING'] as const;

const serviceLevelSchema = z.object({
  account_object_id: z.string(),
  servicelevel_token: z.string(),
});

/**
 * Register all service group tools
 */
export function registerServiceGroupTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Service Groups
  // ===========================================================================
  server.tool(
    'shippo_list_service_groups',
    `List all service groups for live rates.

Service groups define which carrier services to offer at checkout.

Args:
  - format: Response format ('json' or 'markdown')

Returns:
  Array of service groups with name, type, and service levels.`,
    {
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format }) => {
      try {
        const groups = await client.listServiceGroups();
        return formatResponse({ count: groups.length, results: groups }, format, 'service_groups');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Service Group
  // ===========================================================================
  server.tool(
    'shippo_create_service_group',
    `Create a new service group for live rates.

Service groups control which shipping options appear at checkout.

Args:
  - name: Service group name (required)
  - description: Description (optional)
  - type: Group type (required)
    - LIVE_RATE: Show actual carrier rates
    - FLAT_RATE: Charge a flat rate
    - FREE_SHIPPING: Free shipping above threshold
  - service_levels: Array of service levels to include (required)
  - flat_rate: Flat rate amount (for FLAT_RATE type)
  - flat_rate_currency: Currency for flat rate
  - free_shipping_threshold_min: Minimum order for free shipping (for FREE_SHIPPING type)
  - free_shipping_threshold_currency: Currency for threshold
  - rate_adjustment: Percentage adjustment to rates (-100 to 100)
  - is_active: Whether group is active (default: true)

Each service_level should include:
  - account_object_id: Carrier account ID
  - servicelevel_token: Service level token

Returns:
  The created service group.`,
    {
      name: z.string().describe('Service group name'),
      description: z.string().optional(),
      type: z.enum(serviceGroupTypes).describe('Group type'),
      service_levels: z.array(serviceLevelSchema).min(1).describe('Service levels to include'),
      flat_rate: z.string().optional().describe('Flat rate amount'),
      flat_rate_currency: z.string().optional().describe('Flat rate currency'),
      free_shipping_threshold_min: z.string().optional().describe('Free shipping threshold'),
      free_shipping_threshold_currency: z.string().optional(),
      rate_adjustment: z.number().min(-100).max(100).optional().describe('Rate adjustment %'),
      is_active: z.boolean().default(true).describe('Whether active'),
    },
    async (input) => {
      try {
        const group = await client.createServiceGroup({
          name: input.name,
          description: input.description,
          type: input.type,
          service_levels: input.service_levels as ServiceGroupServiceLevel[],
          flat_rate: input.flat_rate,
          flat_rate_currency: input.flat_rate_currency,
          free_shipping_threshold_min: input.free_shipping_threshold_min,
          free_shipping_threshold_currency: input.free_shipping_threshold_currency,
          rate_adjustment: input.rate_adjustment,
          is_active: input.is_active,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Service group created',
                  group_id: group.object_id,
                  name: group.name,
                  type: group.type,
                  group,
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
  // Update Service Group
  // ===========================================================================
  server.tool(
    'shippo_update_service_group',
    `Update an existing service group.

Args:
  - name: New name (optional)
  - description: New description (optional)
  - type: New type (optional)
  - service_levels: New service levels (optional)
  - flat_rate: New flat rate (optional)
  - flat_rate_currency: New currency (optional)
  - free_shipping_threshold_min: New threshold (optional)
  - free_shipping_threshold_currency: New threshold currency (optional)
  - rate_adjustment: New rate adjustment (optional)
  - is_active: New active status (optional)

Returns:
  The updated service group.`,
    {
      name: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(serviceGroupTypes).optional(),
      service_levels: z.array(serviceLevelSchema).optional(),
      flat_rate: z.string().optional(),
      flat_rate_currency: z.string().optional(),
      free_shipping_threshold_min: z.string().optional(),
      free_shipping_threshold_currency: z.string().optional(),
      rate_adjustment: z.number().min(-100).max(100).optional(),
      is_active: z.boolean().optional(),
    },
    async (input) => {
      try {
        const group = await client.updateServiceGroup({
          name: input.name,
          description: input.description,
          type: input.type,
          service_levels: input.service_levels as ServiceGroupServiceLevel[] | undefined,
          flat_rate: input.flat_rate,
          flat_rate_currency: input.flat_rate_currency,
          free_shipping_threshold_min: input.free_shipping_threshold_min,
          free_shipping_threshold_currency: input.free_shipping_threshold_currency,
          rate_adjustment: input.rate_adjustment,
          is_active: input.is_active,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Service group updated',
                  group,
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
  // Delete Service Group
  // ===========================================================================
  server.tool(
    'shippo_delete_service_group',
    `Delete a service group.

Args:
  - id: Service group object ID (required)

Returns:
  Confirmation of deletion.`,
    {
      id: z.string().describe('Service group object ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteServiceGroup(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Service group ${id} deleted`,
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
