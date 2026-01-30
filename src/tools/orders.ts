/**
 * Order Tools
 *
 * MCP tools for Shippo order management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type { AddressCreateInput, LineItemInput, OrderStatus } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

const orderStatuses = ['UNKNOWN', 'AWAITPAY', 'PAID', 'REFUNDED', 'CANCELLED', 'PARTIALLY_FULFILLED', 'SHIPPED'] as const;

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
 * Register all order-related tools
 */
export function registerOrderTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Orders
  // ===========================================================================
  server.tool(
    'shippo_list_orders',
    `List all orders from your Shippo account.

Orders represent e-commerce orders that need to be shipped.

Args:
  - results: Number of orders to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of orders with order number, status, and line items.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of orders to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listOrders({ results, page });
        return formatResponse(result, format, 'orders');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Order
  // ===========================================================================
  server.tool(
    'shippo_get_order',
    `Get a single order by ID.

Args:
  - id: The order object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The order with addresses, line items, and fulfillment status.`,
    {
      id: z.string().describe('Order object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const order = await client.getOrder(id);
        return formatResponse(order, format, 'order');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Order
  // ===========================================================================
  server.tool(
    'shippo_create_order',
    `Create a new order in Shippo.

Orders represent e-commerce orders that need fulfillment.

Args:
  - to_address: Recipient address object OR address ID (required)
  - from_address: Sender address object OR address ID (optional)
  - line_items: Array of line items (required)
  - placed_at: Order placement date/time (ISO 8601, required)
  - order_number: Your order number (optional)
  - order_status: Order status (optional)
    Options: UNKNOWN, AWAITPAY, PAID, REFUNDED, CANCELLED, PARTIALLY_FULFILLED, SHIPPED
  - shipping_cost: Shipping cost charged to customer
  - shipping_cost_currency: Currency for shipping cost
  - shipping_method: Shipping method name
  - subtotal_price: Order subtotal
  - total_price: Order total
  - total_tax: Total tax amount
  - currency: Default currency for prices
  - weight: Total order weight
  - weight_unit: Weight unit
  - notes: Order notes

Each line_item should include:
  - title: Product title (required)
  - quantity: Quantity (required)
  - variant_title: Variant (optional)
  - sku: SKU code (optional)
  - total_price: Line total (optional)
  - currency: Currency (optional)
  - weight: Item weight (optional)
  - weight_unit: Weight unit (optional)
  - manufacture_country: Country of origin (optional)

Returns:
  The created order with object_id.`,
    {
      to_address: z.union([addressSchema, z.string()]).describe('Recipient address or ID'),
      from_address: z.union([addressSchema, z.string()]).optional().describe('Sender address or ID'),
      line_items: z.array(lineItemSchema).min(1).describe('Order line items'),
      placed_at: z.string().describe('Order date (ISO 8601)'),
      order_number: z.string().optional().describe('Your order number'),
      order_status: z.enum(orderStatuses).optional().describe('Order status'),
      shipping_cost: z.string().optional(),
      shipping_cost_currency: z.string().optional(),
      shipping_method: z.string().optional(),
      subtotal_price: z.string().optional(),
      total_price: z.string().optional(),
      total_tax: z.string().optional(),
      currency: z.string().optional(),
      weight: z.string().optional(),
      weight_unit: z.enum(['g', 'oz', 'lb', 'kg']).optional(),
      notes: z.string().optional(),
    },
    async (input) => {
      try {
        const order = await client.createOrder({
          to_address: input.to_address as AddressCreateInput | string,
          from_address: input.from_address as AddressCreateInput | string | undefined,
          line_items: input.line_items as LineItemInput[],
          placed_at: input.placed_at,
          order_number: input.order_number,
          order_status: input.order_status as OrderStatus | undefined,
          shipping_cost: input.shipping_cost,
          shipping_cost_currency: input.shipping_cost_currency,
          shipping_method: input.shipping_method,
          subtotal_price: input.subtotal_price,
          total_price: input.total_price,
          total_tax: input.total_tax,
          currency: input.currency,
          weight: input.weight,
          weight_unit: input.weight_unit,
          notes: input.notes,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Order created',
                  order_id: order.object_id,
                  order_number: order.order_number,
                  status: order.order_status,
                  order,
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
