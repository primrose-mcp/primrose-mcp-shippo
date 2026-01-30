/**
 * Address Tools
 *
 * MCP tools for Shippo address management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all address-related tools
 */
export function registerAddressTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Addresses
  // ===========================================================================
  server.tool(
    'shippo_list_addresses',
    `List all addresses from your Shippo account with pagination.

Returns a paginated list of saved addresses.

Args:
  - results: Number of addresses to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of addresses with name, street, city, state, zip, and country.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of addresses to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listAddresses({ results, page });
        return formatResponse(result, format, 'addresses');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Address
  // ===========================================================================
  server.tool(
    'shippo_get_address',
    `Get a single address by ID.

Args:
  - id: The address object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The address record with all available fields including validation results.`,
    {
      id: z.string().describe('Address object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const address = await client.getAddress(id);
        return formatResponse(address, format, 'address');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Address
  // ===========================================================================
  server.tool(
    'shippo_create_address',
    `Create a new address in Shippo.

Args:
  - name: Recipient name (required)
  - street1: Street address line 1 (required)
  - city: City (required)
  - state: State/province code (required)
  - zip: Postal/ZIP code (required)
  - country: ISO 2-letter country code (required)
  - company: Company name
  - street2: Street address line 2
  - street3: Street address line 3
  - phone: Phone number
  - email: Email address
  - is_residential: Whether address is residential
  - validate: Whether to validate the address on creation
  - metadata: Custom metadata string

Returns:
  The created address record with object_id for future reference.`,
    {
      name: z.string().describe('Recipient name'),
      street1: z.string().describe('Street address line 1'),
      city: z.string().describe('City'),
      state: z.string().describe('State/province code'),
      zip: z.string().describe('Postal/ZIP code'),
      country: z.string().length(2).describe('ISO 2-letter country code'),
      company: z.string().optional().describe('Company name'),
      street2: z.string().optional().describe('Street address line 2'),
      street3: z.string().optional().describe('Street address line 3'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().email().optional().describe('Email address'),
      is_residential: z.boolean().optional().describe('Whether address is residential'),
      validate: z.boolean().optional().describe('Validate address on creation'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async (input) => {
      try {
        const address = await client.createAddress(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Address created', address }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Validate Address
  // ===========================================================================
  server.tool(
    'shippo_validate_address',
    `Validate an existing address by ID.

Validates the address and returns validation results including any errors or suggestions.

Args:
  - id: The address object ID to validate

Returns:
  The address with validation_results containing is_valid status and any messages.`,
    {
      id: z.string().describe('Address object ID to validate'),
    },
    async ({ id }) => {
      try {
        const address = await client.validateAddress(id);
        const isValid = address.validation_results?.is_valid ?? false;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  is_valid: isValid,
                  validation_results: address.validation_results,
                  address,
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
