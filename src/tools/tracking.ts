/**
 * Tracking Tools
 *
 * MCP tools for Shippo shipment tracking.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatTrackingAsMarkdown } from '../utils/formatters.js';

/**
 * Register all tracking-related tools
 */
export function registerTrackingTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Get Tracking Status
  // ===========================================================================
  server.tool(
    'shippo_get_tracking_status',
    `Get the tracking status of a shipment.

Retrieves the current tracking status and history for a shipment
using the carrier name and tracking number.

Args:
  - carrier: Carrier name/token (e.g., 'usps', 'ups', 'fedex')
  - tracking_number: The tracking number
  - format: Response format ('json' or 'markdown')

Returns:
  Tracking status including current status, location, ETA, and tracking history.`,
    {
      carrier: z.string().describe('Carrier name/token (e.g., usps, ups, fedex)'),
      tracking_number: z.string().describe('Tracking number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ carrier, tracking_number, format }) => {
      try {
        const tracking = await client.getTrackingStatus(carrier, tracking_number);

        if (format === 'markdown') {
          return {
            content: [{ type: 'text', text: formatTrackingAsMarkdown(tracking) }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(tracking, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Register Tracking Webhook
  // ===========================================================================
  server.tool(
    'shippo_register_tracking_webhook',
    `Register a webhook to receive tracking updates for a shipment.

Sets up tracking notifications for a shipment. Shippo will send
webhook events as the shipment status changes.

Note: You must have webhooks configured in your Shippo dashboard.

Args:
  - carrier: Carrier name/token (e.g., 'usps', 'ups', 'fedex')
  - tracking_number: The tracking number to track
  - metadata: Custom metadata string (optional)

Returns:
  Initial tracking status for the registered shipment.`,
    {
      carrier: z.string().describe('Carrier name/token (e.g., usps, ups, fedex)'),
      tracking_number: z.string().describe('Tracking number'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async ({ carrier, tracking_number, metadata }) => {
      try {
        const tracking = await client.registerTrackingWebhook({
          carrier,
          tracking_number,
          metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Tracking webhook registered',
                  carrier,
                  tracking_number,
                  current_status: tracking.tracking_status?.status,
                  tracking,
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
