/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  Batch,
  CarrierAccount,
  CarrierParcelTemplate,
  CustomsDeclaration,
  CustomsItem,
  Manifest,
  PaginatedResponse,
  Pickup,
  ResponseFormat,
  ServiceGroup,
  ShippoAddress,
  ShippoOrder,
  ShippoParcel,
  ShippoRate,
  ShippoRefund,
  ShippoShipment,
  ShippoTransaction,
  TrackingStatus,
  UserParcelTemplate,
} from '../types/entities.js';
import { ShippoApiError, formatErrorForLogging } from './errors.js';

/**
 * MCP tool response type
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof ShippoApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (isPaginatedResponse(data)) {
    return formatPaginatedAsMarkdown(data, entityType);
  }

  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Type guard for paginated response
 */
function isPaginatedResponse(data: unknown): data is PaginatedResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as PaginatedResponse<unknown>).results)
  );
}

/**
 * Format paginated response as Markdown
 */
function formatPaginatedAsMarkdown(data: PaginatedResponse<unknown>, entityType: string): string {
  const lines: string[] = [];

  lines.push(`## ${capitalize(entityType)}`);
  lines.push('');
  lines.push(`**Total:** ${data.count} | **Showing:** ${data.results.length}`);

  if (data.next) {
    lines.push(`**Next page available**`);
  }
  lines.push('');

  if (data.results.length === 0) {
    lines.push('_No items found._');
    return lines.join('\n');
  }

  // Format items based on entity type
  switch (entityType) {
    case 'addresses':
      lines.push(formatAddressesTable(data.results as ShippoAddress[]));
      break;
    case 'parcels':
      lines.push(formatParcelsTable(data.results as ShippoParcel[]));
      break;
    case 'shipments':
      lines.push(formatShipmentsTable(data.results as ShippoShipment[]));
      break;
    case 'rates':
      lines.push(formatRatesTable(data.results as ShippoRate[]));
      break;
    case 'transactions':
      lines.push(formatTransactionsTable(data.results as ShippoTransaction[]));
      break;
    case 'carrier_accounts':
      lines.push(formatCarrierAccountsTable(data.results as CarrierAccount[]));
      break;
    case 'customs_items':
      lines.push(formatCustomsItemsTable(data.results as CustomsItem[]));
      break;
    case 'customs_declarations':
      lines.push(formatCustomsDeclarationsTable(data.results as CustomsDeclaration[]));
      break;
    case 'manifests':
      lines.push(formatManifestsTable(data.results as Manifest[]));
      break;
    case 'orders':
      lines.push(formatOrdersTable(data.results as ShippoOrder[]));
      break;
    case 'service_groups':
      lines.push(formatServiceGroupsTable(data.results as ServiceGroup[]));
      break;
    case 'carrier_parcel_templates':
      lines.push(formatCarrierParcelTemplatesTable(data.results as CarrierParcelTemplate[]));
      break;
    case 'user_parcel_templates':
      lines.push(formatUserParcelTemplatesTable(data.results as UserParcelTemplate[]));
      break;
    default:
      lines.push(formatGenericTable(data.results));
  }

  return lines.join('\n');
}

/**
 * Format addresses as Markdown table
 */
function formatAddressesTable(addresses: ShippoAddress[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Address | City | State | ZIP | Country |');
  lines.push('|---|---|---|---|---|---|---|');

  for (const addr of addresses) {
    lines.push(
      `| ${addr.object_id} | ${addr.name} | ${addr.street1} | ${addr.city} | ${addr.state} | ${addr.zip} | ${addr.country} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format parcels as Markdown table
 */
function formatParcelsTable(parcels: ShippoParcel[]): string {
  const lines: string[] = [];
  lines.push('| ID | Dimensions (LxWxH) | Weight | Template |');
  lines.push('|---|---|---|---|');

  for (const parcel of parcels) {
    const dims = `${parcel.length}x${parcel.width}x${parcel.height} ${parcel.distance_unit}`;
    const weight = `${parcel.weight} ${parcel.mass_unit}`;
    lines.push(`| ${parcel.object_id} | ${dims} | ${weight} | ${parcel.template || '-'} |`);
  }

  return lines.join('\n');
}

/**
 * Format shipments as Markdown table
 */
function formatShipmentsTable(shipments: ShippoShipment[]): string {
  const lines: string[] = [];
  lines.push('| ID | Status | From | To | Parcels | Rates |');
  lines.push('|---|---|---|---|---|---|');

  for (const shipment of shipments) {
    const from = `${shipment.address_from.city}, ${shipment.address_from.state}`;
    const to = `${shipment.address_to.city}, ${shipment.address_to.state}`;
    lines.push(
      `| ${shipment.object_id} | ${shipment.status} | ${from} | ${to} | ${shipment.parcels.length} | ${shipment.rates.length} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format rates as Markdown table
 */
function formatRatesTable(rates: ShippoRate[]): string {
  const lines: string[] = [];
  lines.push('| ID | Provider | Service | Amount | Est. Days |');
  lines.push('|---|---|---|---|---|');

  for (const rate of rates) {
    lines.push(
      `| ${rate.object_id} | ${rate.provider} | ${rate.servicelevel.name} | ${rate.currency} ${rate.amount} | ${rate.estimated_days || '-'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format transactions as Markdown table
 */
function formatTransactionsTable(transactions: ShippoTransaction[]): string {
  const lines: string[] = [];
  lines.push('| ID | Status | Tracking # | Tracking Status |');
  lines.push('|---|---|---|---|');

  for (const tx of transactions) {
    lines.push(
      `| ${tx.object_id} | ${tx.status} | ${tx.tracking_number || '-'} | ${tx.tracking_status} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format carrier accounts as Markdown table
 */
function formatCarrierAccountsTable(accounts: CarrierAccount[]): string {
  const lines: string[] = [];
  lines.push('| ID | Carrier | Account ID | Active |');
  lines.push('|---|---|---|---|');

  for (const acc of accounts) {
    lines.push(
      `| ${acc.object_id} | ${acc.carrier} | ${acc.account_id} | ${acc.active ? 'Yes' : 'No'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format customs items as Markdown table
 */
function formatCustomsItemsTable(items: CustomsItem[]): string {
  const lines: string[] = [];
  lines.push('| ID | Description | Qty | Value | Origin |');
  lines.push('|---|---|---|---|---|');

  for (const item of items) {
    lines.push(
      `| ${item.object_id} | ${item.description} | ${item.quantity} | ${item.value_currency} ${item.value_amount} | ${item.origin_country} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format customs declarations as Markdown table
 */
function formatCustomsDeclarationsTable(declarations: CustomsDeclaration[]): string {
  const lines: string[] = [];
  lines.push('| ID | Contents Type | Items | Certify |');
  lines.push('|---|---|---|---|');

  for (const decl of declarations) {
    lines.push(
      `| ${decl.object_id} | ${decl.contents_type} | ${decl.items.length} | ${decl.certify ? 'Yes' : 'No'} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format manifests as Markdown table
 */
function formatManifestsTable(manifests: Manifest[]): string {
  const lines: string[] = [];
  lines.push('| ID | Status | Shipment Date | Transactions |');
  lines.push('|---|---|---|---|');

  for (const manifest of manifests) {
    lines.push(
      `| ${manifest.object_id} | ${manifest.status} | ${manifest.shipment_date} | ${manifest.transactions.length} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format orders as Markdown table
 */
function formatOrdersTable(orders: ShippoOrder[]): string {
  const lines: string[] = [];
  lines.push('| ID | Order # | Status | Total | Items |');
  lines.push('|---|---|---|---|---|');

  for (const order of orders) {
    lines.push(
      `| ${order.object_id} | ${order.order_number} | ${order.order_status} | ${order.currency || ''} ${order.total_price || '-'} | ${order.line_items.length} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format service groups as Markdown table
 */
function formatServiceGroupsTable(groups: ServiceGroup[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Type | Active | Services |');
  lines.push('|---|---|---|---|---|');

  for (const group of groups) {
    lines.push(
      `| ${group.object_id} | ${group.name} | ${group.type} | ${group.is_active ? 'Yes' : 'No'} | ${group.service_levels.length} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format carrier parcel templates as Markdown table
 */
function formatCarrierParcelTemplatesTable(templates: CarrierParcelTemplate[]): string {
  const lines: string[] = [];
  lines.push('| Token | Carrier | Name | Dimensions |');
  lines.push('|---|---|---|---|');

  for (const template of templates) {
    const dims = `${template.length}x${template.width}x${template.height} ${template.distance_unit}`;
    lines.push(`| ${template.token} | ${template.carrier} | ${template.name} | ${dims} |`);
  }

  return lines.join('\n');
}

/**
 * Format user parcel templates as Markdown table
 */
function formatUserParcelTemplatesTable(templates: UserParcelTemplate[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Dimensions | Weight |');
  lines.push('|---|---|---|---|');

  for (const template of templates) {
    const dims = `${template.length}x${template.width}x${template.height} ${template.distance_unit}`;
    const weight = template.weight ? `${template.weight} ${template.weight_unit}` : '-';
    lines.push(`| ${template.object_id} | ${template.name} | ${dims} | ${weight} |`);
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-'));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  if (entityType === 'rates') {
    return formatRatesTable(data as ShippoRate[]);
  }
  if (entityType === 'tracking_history') {
    return formatTrackingHistoryAsMarkdown(data as TrackingStatus[]);
  }
  return formatGenericTable(data);
}

/**
 * Format tracking history as Markdown
 */
function formatTrackingHistoryAsMarkdown(events: TrackingStatus[]): string {
  const lines: string[] = [];

  for (const event of events) {
    lines.push(`### ${event.tracking_status?.status || 'Unknown'}`);
    lines.push(`**Date:** ${event.tracking_status?.status_date || '-'}`);
    lines.push(`**Details:** ${event.tracking_status?.status_details || '-'}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format tracking status as Markdown
 */
export function formatTrackingAsMarkdown(tracking: TrackingStatus): string {
  const lines: string[] = [];

  lines.push(`## Tracking: ${tracking.tracking_number}`);
  lines.push('');
  lines.push(`**Carrier:** ${tracking.carrier}`);
  lines.push(`**Current Status:** ${tracking.tracking_status?.status || 'Unknown'}`);
  lines.push(`**Status Details:** ${tracking.tracking_status?.status_details || '-'}`);

  if (tracking.eta) {
    lines.push(`**ETA:** ${tracking.eta}`);
  }

  if (tracking.address_to) {
    lines.push(`**Destination:** ${tracking.address_to.city}, ${tracking.address_to.state} ${tracking.address_to.zip}`);
  }

  if (tracking.tracking_history && tracking.tracking_history.length > 0) {
    lines.push('');
    lines.push('### Tracking History');
    lines.push('');
    lines.push('| Date | Status | Details | Location |');
    lines.push('|---|---|---|---|');

    for (const event of tracking.tracking_history) {
      const location = event.location
        ? `${event.location.city}, ${event.location.state}`
        : '-';
      lines.push(
        `| ${event.status_date} | ${event.status} | ${event.status_details} | ${location} |`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Format refund as Markdown
 */
export function formatRefundAsMarkdown(refund: ShippoRefund): string {
  const lines: string[] = [];

  lines.push(`## Refund: ${refund.object_id}`);
  lines.push('');
  lines.push(`**Status:** ${refund.status}`);
  lines.push(`**Transaction:** ${refund.transaction}`);
  lines.push(`**Created:** ${refund.object_created}`);

  return lines.join('\n');
}

/**
 * Format batch as Markdown
 */
export function formatBatchAsMarkdown(batch: Batch): string {
  const lines: string[] = [];

  lines.push(`## Batch: ${batch.object_id}`);
  lines.push('');
  lines.push(`**Status:** ${batch.status}`);
  lines.push(`**Default Carrier:** ${batch.default_carrier_account}`);
  lines.push(`**Default Service:** ${batch.default_servicelevel_token}`);
  lines.push(`**Shipments:** ${batch.batch_shipments.count}`);

  if (batch.label_url && batch.label_url.length > 0) {
    lines.push('');
    lines.push('### Labels');
    for (const url of batch.label_url) {
      lines.push(`- ${url}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format pickup as Markdown
 */
export function formatPickupAsMarkdown(pickup: Pickup): string {
  const lines: string[] = [];

  lines.push(`## Pickup: ${pickup.object_id}`);
  lines.push('');
  lines.push(`**Status:** ${pickup.status}`);
  lines.push(`**Carrier:** ${pickup.carrier_account}`);
  lines.push(`**Requested:** ${pickup.requested_start_time} - ${pickup.requested_end_time}`);

  if (pickup.confirmed_start_time) {
    lines.push(`**Confirmed:** ${pickup.confirmed_start_time} - ${pickup.confirmed_end_time}`);
  }

  if (pickup.confirmation_code) {
    lines.push(`**Confirmation Code:** ${pickup.confirmation_code}`);
  }

  return lines.join('\n');
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (snake_case to Title Case)
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
