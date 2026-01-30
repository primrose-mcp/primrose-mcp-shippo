/**
 * Parcel Template Tools
 *
 * MCP tools for Shippo carrier and user parcel templates.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all parcel template tools
 */
export function registerParcelTemplateTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Carrier Parcel Templates
  // ===========================================================================
  server.tool(
    'shippo_list_carrier_parcel_templates',
    `List carrier-provided parcel templates.

Carrier templates are predefined box sizes (e.g., USPS Flat Rate boxes).
Using templates can simplify parcel creation.

Args:
  - carrier: Filter by carrier (e.g., 'usps', 'ups', 'fedex')
  - include: Include specific carriers (comma-separated)
  - results: Number of templates to return (default: 20)
  - page: Page number
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of carrier parcel templates.`,
    {
      carrier: z.string().optional().describe('Filter by carrier'),
      include: z.string().optional().describe('Include carriers (comma-separated)'),
      results: z.number().int().min(1).max(100).default(20),
      page: z.number().int().min(1).optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ carrier, include, results, page, format }) => {
      try {
        const result = await client.listCarrierParcelTemplates({
          carrier,
          include,
          results,
          page,
        });
        return formatResponse(result, format, 'carrier_parcel_templates');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Carrier Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_get_carrier_parcel_template',
    `Get a single carrier parcel template by token.

Args:
  - token: The template token (e.g., 'USPS_FlatRatePaddedEnvelope')
  - format: Response format ('json' or 'markdown')

Returns:
  The template with dimensions and carrier information.`,
    {
      token: z.string().describe('Carrier parcel template token'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ token, format }) => {
      try {
        const template = await client.getCarrierParcelTemplate(token);
        return formatResponse(template, format, 'carrier_parcel_template');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // List User Parcel Templates
  // ===========================================================================
  server.tool(
    'shippo_list_user_parcel_templates',
    `List your custom parcel templates.

User templates are your own saved parcel dimensions for quick reuse.

Args:
  - results: Number of templates to return (default: 20)
  - page: Page number
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of your parcel templates.`,
    {
      results: z.number().int().min(1).max(100).default(20),
      page: z.number().int().min(1).optional(),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listUserParcelTemplates({ results, page });
        return formatResponse(result, format, 'user_parcel_templates');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get User Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_get_user_parcel_template',
    `Get a single user parcel template by ID.

Args:
  - id: The user parcel template object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The template with name and dimensions.`,
    {
      id: z.string().describe('User parcel template object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const template = await client.getUserParcelTemplate(id);
        return formatResponse(template, format, 'user_parcel_template');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create User Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_create_user_parcel_template',
    `Create a custom parcel template.

Save frequently used parcel dimensions for quick reuse.

Args:
  - name: Template name (required)
  - length: Length (required)
  - width: Width (required)
  - height: Height (required)
  - distance_unit: Unit - 'cm', 'in', 'ft', 'mm', 'm', 'yd' (default: 'in')
  - weight: Default weight (optional)
  - weight_unit: Weight unit - 'g', 'oz', 'lb', 'kg' (optional)
  - template: Base template token to reference (optional)

Returns:
  The created user parcel template.`,
    {
      name: z.string().describe('Template name'),
      length: z.number().positive().describe('Length'),
      width: z.number().positive().describe('Width'),
      height: z.number().positive().describe('Height'),
      distance_unit: z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']).default('in'),
      weight: z.number().positive().optional().describe('Default weight'),
      weight_unit: z.enum(['g', 'oz', 'lb', 'kg']).optional(),
      template: z.string().optional().describe('Base carrier template token'),
    },
    async (input) => {
      try {
        const template = await client.createUserParcelTemplate(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'User parcel template created',
                  template_id: template.object_id,
                  name: template.name,
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
  // Delete User Parcel Template
  // ===========================================================================
  server.tool(
    'shippo_delete_user_parcel_template',
    `Delete a user parcel template.

Args:
  - id: User parcel template object ID (required)

Returns:
  Confirmation of deletion.`,
    {
      id: z.string().describe('User parcel template object ID'),
    },
    async ({ id }) => {
      try {
        await client.deleteUserParcelTemplate(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `User parcel template ${id} deleted`,
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
