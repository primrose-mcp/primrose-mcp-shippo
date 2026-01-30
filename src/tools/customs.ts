/**
 * Customs Tools
 *
 * MCP tools for Shippo customs items and declarations (international shipping).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ShippoClient } from '../client.js';
import type {
  B13AFilingOption,
  ContentsType,
  CustomsItemCreateInput,
  ExporterIdentification,
  Incoterm,
  InvoicedCharges,
  NonDeliveryOption,
} from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

const contentsTypes = ['DOCUMENTS', 'GIFT', 'SAMPLE', 'MERCHANDISE', 'HUMANITARIAN_DONATION', 'RETURN_MERCHANDISE', 'OTHER'] as const;
const nonDeliveryOptions = ['ABANDON', 'RETURN'] as const;
const incoterms = ['DDP', 'DDU', 'CPT', 'CIP', 'DAP', 'DAT', 'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF'] as const;
const b13aFilingOptions = ['FILED_ELECTRONICALLY', 'SUMMARY_REPORTING', 'NOT_REQUIRED'] as const;

/**
 * Register all customs-related tools
 */
export function registerCustomsTools(server: McpServer, client: ShippoClient): void {
  // ===========================================================================
  // List Customs Items
  // ===========================================================================
  server.tool(
    'shippo_list_customs_items',
    `List all customs items from your Shippo account.

Customs items represent individual items in a customs declaration
for international shipments.

Args:
  - results: Number of items to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of customs items with description, quantity, value, and origin.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number of items to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listCustomsItems({ results, page });
        return formatResponse(result, format, 'customs_items');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Customs Item
  // ===========================================================================
  server.tool(
    'shippo_get_customs_item',
    `Get a single customs item by ID.

Args:
  - id: The customs item object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The customs item with description, quantity, value, and origin country.`,
    {
      id: z.string().describe('Customs item object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const item = await client.getCustomsItem(id);
        return formatResponse(item, format, 'customs_item');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Customs Item
  // ===========================================================================
  server.tool(
    'shippo_create_customs_item',
    `Create a new customs item for international shipping.

Customs items describe individual products being shipped internationally.

Args:
  - description: Item description (required)
  - quantity: Number of units (required)
  - net_weight: Net weight per unit (required)
  - mass_unit: Weight unit - 'g', 'oz', 'lb', 'kg' (default: 'lb')
  - value_amount: Value per unit (required)
  - value_currency: ISO currency code (required, e.g., 'USD')
  - origin_country: ISO country code where item was manufactured (required)
  - tariff_number: HS tariff code (optional)
  - sku_code: SKU code (optional)
  - eccn_ear99: Export control classification (optional)
  - metadata: Custom metadata

Returns:
  The created customs item with object_id.`,
    {
      description: z.string().describe('Item description'),
      quantity: z.number().int().positive().describe('Number of units'),
      net_weight: z.number().positive().describe('Net weight per unit'),
      mass_unit: z.enum(['g', 'oz', 'lb', 'kg']).default('lb').describe('Weight unit'),
      value_amount: z.number().positive().describe('Value per unit'),
      value_currency: z.string().length(3).describe('ISO currency code'),
      origin_country: z.string().length(2).describe('Country of manufacture (ISO)'),
      tariff_number: z.string().optional().describe('HS tariff code'),
      sku_code: z.string().optional().describe('SKU code'),
      eccn_ear99: z.string().optional().describe('Export control classification'),
      metadata: z.string().optional().describe('Custom metadata'),
    },
    async (input) => {
      try {
        const item = await client.createCustomsItem(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Customs item created', item },
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
  // List Customs Declarations
  // ===========================================================================
  server.tool(
    'shippo_list_customs_declarations',
    `List all customs declarations from your Shippo account.

Customs declarations are required for international shipments.

Args:
  - results: Number of declarations to return (default: 20)
  - page: Page number (1-indexed)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of customs declarations.`,
    {
      results: z.number().int().min(1).max(100).default(20).describe('Number to return'),
      page: z.number().int().min(1).optional().describe('Page number'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ results, page, format }) => {
      try {
        const result = await client.listCustomsDeclarations({ results, page });
        return formatResponse(result, format, 'customs_declarations');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Customs Declaration
  // ===========================================================================
  server.tool(
    'shippo_get_customs_declaration',
    `Get a single customs declaration by ID.

Args:
  - id: The customs declaration object ID
  - format: Response format ('json' or 'markdown')

Returns:
  The customs declaration with all details.`,
    {
      id: z.string().describe('Customs declaration object ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ id, format }) => {
      try {
        const declaration = await client.getCustomsDeclaration(id);
        return formatResponse(declaration, format, 'customs_declaration');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Customs Declaration
  // ===========================================================================
  server.tool(
    'shippo_create_customs_declaration',
    `Create a customs declaration for international shipping.

Required for all international shipments. Must include customs items.

Args:
  - certify: Certify the declaration is accurate (required, must be true)
  - certify_signer: Name of person certifying (required)
  - contents_type: Type of contents (required)
    Options: DOCUMENTS, GIFT, SAMPLE, MERCHANDISE, HUMANITARIAN_DONATION, RETURN_MERCHANDISE, OTHER
  - non_delivery_option: What to do if undeliverable (required)
    Options: ABANDON, RETURN
  - items: Array of customs item objects OR existing item IDs (required)
  - contents_explanation: Explanation if contents_type is OTHER
  - exporter_reference: Exporter reference number
  - importer_reference: Importer reference number
  - invoice: Invoice number
  - commercial_invoice: Whether this is a commercial shipment
  - license: Export license number
  - certificate: Certificate number
  - notes: Additional notes
  - eel_pfc: EEL/PFC code for US exports
  - aes_itn: AES ITN for US exports
  - incoterm: Incoterm for duties/taxes
    Options: DDP, DDU, CPT, CIP, DAP, DAT, EXW, FCA, FAS, FOB, CFR, CIF
  - b13a_filing_option: B13A filing option for Canada
  - b13a_number: B13A number
  - metadata: Custom metadata

Returns:
  The created customs declaration with object_id.`,
    {
      certify: z.literal(true).describe('Certify declaration accuracy'),
      certify_signer: z.string().describe('Name of person certifying'),
      contents_type: z.enum(contentsTypes).describe('Type of contents'),
      non_delivery_option: z.enum(nonDeliveryOptions).describe('Non-delivery handling'),
      items: z.array(
        z.union([
          z.object({
            description: z.string(),
            quantity: z.number().int().positive(),
            net_weight: z.number().positive(),
            mass_unit: z.enum(['g', 'oz', 'lb', 'kg']).default('lb'),
            value_amount: z.number().positive(),
            value_currency: z.string().length(3),
            origin_country: z.string().length(2),
            tariff_number: z.string().optional(),
          }),
          z.string(),
        ])
      ).min(1).describe('Customs items or item IDs'),
      contents_explanation: z.string().optional().describe('Explanation if type is OTHER'),
      exporter_reference: z.string().optional(),
      importer_reference: z.string().optional(),
      invoice: z.string().optional(),
      commercial_invoice: z.boolean().optional(),
      license: z.string().optional(),
      certificate: z.string().optional(),
      notes: z.string().optional(),
      eel_pfc: z.string().optional(),
      aes_itn: z.string().optional(),
      incoterm: z.enum(incoterms).optional(),
      b13a_filing_option: z.enum(b13aFilingOptions).optional(),
      b13a_number: z.string().optional(),
      invoiced_charges: z.object({
        total_shipping: z.string().optional(),
        total_taxes: z.string().optional(),
        total_duties: z.string().optional(),
        other_fees: z.string().optional(),
        currency: z.string().optional(),
      }).optional(),
      exporter_identification: z.object({
        eori_number: z.string().optional(),
        tax_id: z.object({
          number: z.string(),
          type: z.enum(['EIN', 'VAT', 'IOSS', 'ARN']),
        }).optional(),
      }).optional(),
      metadata: z.string().optional(),
    },
    async (input) => {
      try {
        const declaration = await client.createCustomsDeclaration({
          certify: input.certify,
          certify_signer: input.certify_signer,
          contents_type: input.contents_type as ContentsType,
          non_delivery_option: input.non_delivery_option as NonDeliveryOption,
          items: input.items as (CustomsItemCreateInput | string)[],
          contents_explanation: input.contents_explanation,
          exporter_reference: input.exporter_reference,
          importer_reference: input.importer_reference,
          invoice: input.invoice,
          commercial_invoice: input.commercial_invoice,
          license: input.license,
          certificate: input.certificate,
          notes: input.notes,
          eel_pfc: input.eel_pfc,
          aes_itn: input.aes_itn,
          incoterm: input.incoterm as Incoterm | undefined,
          b13a_filing_option: input.b13a_filing_option as B13AFilingOption | undefined,
          b13a_number: input.b13a_number,
          invoiced_charges: input.invoiced_charges as InvoicedCharges | undefined,
          exporter_identification: input.exporter_identification as ExporterIdentification | undefined,
          metadata: input.metadata,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Customs declaration created', declaration },
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
