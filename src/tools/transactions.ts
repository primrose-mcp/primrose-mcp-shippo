/**
 * Transaction (Label) Tools
 *
 * MCP tools for Shippo shipping label transactions.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, ParcelCreateInput } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

const labelFileTypes = [
  'PNG',
  'PNG_2.3x7.5',
  'PDF',
  'PDF_2.3x7.5',
  'PDF_4x6',
  'PDF_4x8',
  'PDF_A4',
  'PDF_A5',
  'PDF_A6',
  'ZPLII',
] as const;

// Schemas for instant transaction
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

/**
 * Register all transaction-related tools
 */
export function registerTransactionTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Transactions
  // ===========================================================================
  server.tool(
    'shippo_list_transactions',
    `List all transactions (label purchases) from your Shippo account.

Returns a paginated list of label transactions.

Args:
  - results: Number of transactions to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of transactions with status, tracking number, and label URL.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of transactions to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listTransactions({ results, page });
        return formatResponse(result, format, 'transactions');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Transaction
  // ===========================================================================
  server.tool(
    'shippo_get_transaction',
    `Get a single transaction (label) by ID.

Args:
  - id: The transaction object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The transaction record with status, tracking number, and label URL.`,
    {
      id: z.string().describe('Transaction object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const transaction = await client.getTransaction(id);
        return formatResponse(transaction, format, 'transaction');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Transaction (Purchase Label)
  // ===========================================================================
  server.tool(
    'shippo_create_transaction',
    `Create a transaction to purchase a shipping label.

Purchases a shipping label based on a rate from a shipment.

Args:
  - rate: The rate object ID to purchase (required)
  - label_file_type: Label format (default: 'PDF_4x6')
    Options: PNG, PNG_2.3x7.5, PDF, PDF_2.3x7.5, PDF_4x6, PDF_4x8, PDF_A4, PDF_A5, PDF_A6, ZPLII
  - metadata: Custom metadata string
  - async: If true, label is created asynchronously (default: false)

Returns:
  The transaction with tracking number and label URL.`,
    {
      rate: z.string().describe('Rate object ID to purchase'),
      label_file_type: z.enum(labelFileTypes).default('PDF_4x6').describe('Label file format'),
      metadata: z.string().optional().describe('Custom metadata'),
      async: z.boolean().optional().describe('Create label asynchronously'),
    },
    async ({ rate, label_file_type, metadata, async: asyncCreate }) => {
      try {
        const transaction = await client.createTransaction({
          rate,
          label_file_type,
          metadata,
          async: asyncCreate,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Label purchased',
                  transaction_id: transaction.object_id,
                  status: transaction.status,
                  tracking_number: transaction.tracking_number,
                  tracking_url: transaction.tracking_url_provider,
                  label_url: transaction.label_url,
                  transaction,
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
  // Create Instant Transaction
  // ===========================================================================
  server.tool(
    'shippo_create_instant_transaction',
    `Create an instant transaction (one-call label purchase).

Creates a shipment and purchases a label in a single API call.
Use this when you already know which carrier and service level you want.

Args:
  - address_from: Sender address object OR address ID
  - address_to: Recipient address object OR address ID
  - parcels: Array of parcel objects OR parcel IDs
  - carrier_account: Carrier account object ID (required)
  - servicelevel_token: Service level token (e.g., 'usps_priority') (required)
  - label_file_type: Label format (default: 'PDF_4x6')
  - metadata: Custom metadata string

Returns:
  The transaction with tracking number and label URL.`,
    {
      address_from: z.union([addressSchema, z.string()]).describe('Sender address or address ID'),
      address_to: z.union([addressSchema, z.string()]).describe('Recipient address or address ID'),
      parcels: z.array(z.union([parcelSchema, z.string()])).min(1).describe('Parcels or parcel IDs'),
      carrier_account: z.string().describe('Carrier account object ID'),
      servicelevel_token: z.string().describe('Service level token (e.g., usps_priority)'),
      label_file_type: z.enum(labelFileTypes).default('PDF_4x6').describe('Label file format'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async (input) => {
      try {
        const transaction = await client.createInstantTransaction({
          shipment: {
            address_from: input.address_from as AddressCreateInput | string,
            address_to: input.address_to as AddressCreateInput | string,
            parcels: input.parcels as (ParcelCreateInput | string)[],
          },
          carrier_account: input.carrier_account,
          servicelevel_token: input.servicelevel_token,
          label_file_type: input.label_file_type,
          metadata: input.metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Label purchased',
                  transaction_id: transaction.object_id,
                  status: transaction.status,
                  tracking_number: transaction.tracking_number,
                  tracking_url: transaction.tracking_url_provider,
                  label_url: transaction.label_url,
                  transaction,
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
