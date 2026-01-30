# Shippo MCP Server

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-blue)](https://primrose.dev/mcp/shippo)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

A Model Context Protocol (MCP) server for Shippo, enabling shipping label generation, rate comparison, and package tracking.

## Features

- **Addresses** - Address validation and management
- **Batches** - Bulk shipment processing
- **Carrier Accounts** - Carrier account management
- **Customs** - Customs declarations for international shipping
- **Live Rates** - Real-time shipping rate quotes
- **Manifests** - End-of-day manifest generation
- **Orders** - Order management and fulfillment
- **Parcels** - Parcel dimension and weight management
- **Parcel Templates** - Reusable parcel templates
- **Pickups** - Schedule carrier pickups
- **Rates** - Shipping rate retrieval
- **Refunds** - Label refund processing
- **Service Groups** - Custom service grouping
- **Shipments** - Shipment creation and management
- **Tracking** - Package tracking
- **Transactions** - Label purchase transactions

## Quick Start

### Recommended: Primrose SDK

The easiest way to use this MCP server is with the Primrose SDK:

```bash
npm install primrose-mcp
```

```typescript
import { PrimroseMCP } from 'primrose-mcp';

const client = new PrimroseMCP({
  server: 'shippo',
  credentials: {
    apiKey: 'shippo_test_your-api-key'
  }
});
```

### Manual Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   ```

## Configuration

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Shippo-API-Key` | Your Shippo API key (ShippoToken format) |

### Optional Headers

| Header | Description |
|--------|-------------|
| `X-Shippo-Base-URL` | Override the default Shippo API base URL |

## Available Tools

### Addresses
- `shippo_validate_address` - Validate an address
- `shippo_create_address` - Create a new address
- `shippo_list_addresses` - List saved addresses
- `shippo_get_address` - Get address details

### Shipments
- `shippo_create_shipment` - Create a shipment
- `shippo_list_shipments` - List shipments
- `shippo_get_shipment` - Get shipment details

### Rates
- `shippo_get_rates` - Get shipping rates for a shipment
- `shippo_get_live_rates` - Get real-time rate quotes

### Transactions (Labels)
- `shippo_create_label` - Purchase a shipping label
- `shippo_list_transactions` - List label transactions
- `shippo_get_transaction` - Get transaction details

### Tracking
- `shippo_track_shipment` - Track a package
- `shippo_register_tracking_webhook` - Register tracking webhook
- `shippo_get_tracking_status` - Get tracking status

### Batches
- `shippo_create_batch` - Create a batch of shipments
- `shippo_get_batch` - Get batch details
- `shippo_add_to_batch` - Add shipments to batch
- `shippo_purchase_batch` - Purchase all labels in batch

### Customs
- `shippo_create_customs_declaration` - Create customs declaration
- `shippo_create_customs_item` - Create customs item
- `shippo_list_customs_declarations` - List declarations

### Manifests
- `shippo_create_manifest` - Create end-of-day manifest
- `shippo_list_manifests` - List manifests
- `shippo_get_manifest` - Get manifest details

### Pickups
- `shippo_create_pickup` - Schedule a carrier pickup
- `shippo_list_pickups` - List scheduled pickups

### Refunds
- `shippo_create_refund` - Request label refund
- `shippo_list_refunds` - List refund requests
- `shippo_get_refund` - Get refund status

### Carrier Accounts
- `shippo_list_carrier_accounts` - List carrier accounts
- `shippo_create_carrier_account` - Add carrier account
- `shippo_update_carrier_account` - Update carrier settings

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Type checking
npm run typecheck

# Deploy to Cloudflare
npm run deploy
```

## Related Resources

- [Primrose SDK Documentation](https://primrose.dev/docs)
- [Shippo API Documentation](https://docs.goshippo.com/docs/api_concepts/apireference/)
- [Shippo Developer Portal](https://goshippo.com/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
