/**
 * Refund Tools
 *
 * MCP tools for Shippo label refunds.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatRefundAsMarkdown } from '../utils/formatters.js';

/**
 * Register all refund-related tools
 */
export function registerRefundTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // Create Refund
  // ===========================================================================
  server.tool(
    'shippo_create_refund',
    `Request a refund for an unused shipping label.

Creates a refund request for a transaction (label purchase).
Not all carriers support refunds; check carrier policies.

Args:
  - transaction: The transaction object ID to refund (required)
  - async: If true, refund is processed asynchronously (default: false)

Returns:
  The refund object with status (QUEUED, PENDING, SUCCESS, or ERROR).`,
    {
      transaction: z.string().describe('Transaction object ID to refund'),
      async: z.boolean().optional().describe('Process refund asynchronously'),
    },
    async ({ transaction, async: asyncRefund }) => {
      try {
        const refund = await client.createRefund({
          transaction,
          async: asyncRefund,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Refund requested',
                  refund_id: refund.object_id,
                  status: refund.status,
                  refund,
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
  // Get Refund
  // ===========================================================================
  server.tool(
    'shippo_get_refund',
    `Get the status of a refund request.

Args:
  - id: The refund object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The refund object with current status.`,
    {
      id: z.string().describe('Refund object ID'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ id, format }) => {
      try {
        const refund = await client.getRefund(id);

        if (format === 'markdown') {
          return {
            content: [{ type: 'text', text: formatRefundAsMarkdown(refund) }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(refund, null, 2) }],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
