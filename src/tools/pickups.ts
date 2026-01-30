/**
 * Pickup Tools
 *
 * MCP tools for Shippo pickup scheduling.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, PickupLocation } from '../types/entities.js';
import { formatError } from '../utils/formatters.js';

const buildingLocationTypes = [
  'Front Door',
  'Back Door',
  'Side Door',
  'Knock on Door',
  'Ring Bell',
  'Mail Room',
  'Office',
  'Reception',
  'In/At Mailbox',
  'Security Deck',
  'Shipping/Receiving',
  'Other',
] as const;

const buildingTypes = ['apartment', 'building', 'department', 'floor', 'room', 'suite'] as const;

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

/**
 * Register all pickup-related tools
 */
export function registerPickupTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Create Pickup
  // ===========================================================================
  server.tool(
    'shippo_create_pickup',
    `Schedule a pickup with a carrier.

Schedules a carrier pickup for one or more shipments.

Args:
  - carrier_account: Carrier account object ID (required)
  - transactions: Array of transaction (label) IDs to pick up (required)
  - requested_start_time: Earliest pickup time (ISO 8601, required)
  - requested_end_time: Latest pickup time (ISO 8601, required)
  - location: Pickup location details (required)
    - building_location_type: Where to find packages (required)
      Options: Front Door, Back Door, Side Door, Knock on Door, Ring Bell,
               Mail Room, Office, Reception, In/At Mailbox, Security Deck,
               Shipping/Receiving, Other
    - address: Pickup address object OR address ID (required)
    - building_type: Type of building (optional)
    - instructions: Special instructions (optional)
  - is_test: Whether this is a test pickup
  - metadata: Custom metadata

Returns:
  The created pickup with confirmation code and scheduled times.`,
    {
      carrier_account: z.string().describe('Carrier account object ID'),
      transactions: z.array(z.string()).min(1).describe('Transaction IDs to pick up'),
      requested_start_time: z.string().describe('Earliest pickup time (ISO 8601)'),
      requested_end_time: z.string().describe('Latest pickup time (ISO 8601)'),
      location: z.object({
        building_location_type: z.enum(buildingLocationTypes).describe('Package location'),
        address: z.union([addressSchema, z.string()]).describe('Pickup address or ID'),
        building_type: z.enum(buildingTypes).optional().describe('Building type'),
        instructions: z.string().optional().describe('Special instructions'),
      }).describe('Pickup location details'),
      is_test: z.boolean().optional().describe('Test pickup'),
      metadata: z.string().optional(),
    },
    async ({ carrier_account, transactions, requested_start_time, requested_end_time, location, is_test, metadata }) => {
      try {
        const pickup = await client.createPickup({
          carrier_account,
          transactions,
          requested_start_time,
          requested_end_time,
          location: {
            building_location_type: location.building_location_type,
            address: location.address as AddressCreateInput | string,
            building_type: location.building_type,
            instructions: location.instructions,
          } as PickupLocation,
          is_test,
          metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Pickup scheduled',
                  pickup_id: pickup.object_id,
                  status: pickup.status,
                  confirmation_code: pickup.confirmation_code,
                  confirmed_start: pickup.confirmed_start_time,
                  confirmed_end: pickup.confirmed_end_time,
                  pickup,
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
  // Get Pickup (via formatted display)
  // ===========================================================================
  // Note: Shippo API doesn't have a GET /pickups/{id} endpoint
  // Pickups are returned from create and stored by the user
}
