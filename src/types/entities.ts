/**
 * Shippo Entity Types
 *
 * Type definitions for Shippo shipping API entities.
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  /** Number of items to return (default: 20) */
  results?: number;
  /** Page number (1-indexed) */
  page?: number;
  /** Allow additional properties for extensibility */
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  /** Total count of items */
  count: number;
  /** URL for next page */
  next?: string;
  /** URL for previous page */
  previous?: string;
  /** Array of results */
  results: T[];
}

// =============================================================================
// Address
// =============================================================================

export interface ShippoAddress {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  is_complete: boolean;
  validation_results?: AddressValidationResult;
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  is_residential?: boolean;
  metadata?: string;
  test?: boolean;
}

export interface AddressValidationResult {
  is_valid: boolean;
  messages: ValidationMessage[];
}

export interface ValidationMessage {
  code: string;
  text: string;
  type: 'error' | 'warning';
}

export interface AddressCreateInput {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  is_residential?: boolean;
  validate?: boolean;
  metadata?: string;
}

// =============================================================================
// Parcel
// =============================================================================

export interface ShippoParcel {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  object_state: 'VALID';
  template?: string;
  length: string;
  width: string;
  height: string;
  distance_unit: DistanceUnit;
  weight: string;
  mass_unit: MassUnit;
  metadata?: string;
  test?: boolean;
}

export type DistanceUnit = 'cm' | 'in' | 'ft' | 'mm' | 'm' | 'yd';
export type MassUnit = 'g' | 'oz' | 'lb' | 'kg';

export interface ParcelCreateInput {
  length: number;
  width: number;
  height: number;
  distance_unit: DistanceUnit;
  weight: number;
  mass_unit: MassUnit;
  template?: string;
  metadata?: string;
}

// =============================================================================
// Shipment
// =============================================================================

export interface ShippoShipment {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  object_state: 'VALID' | 'INVALID';
  status: 'WAITING' | 'QUEUED' | 'SUCCESS' | 'ERROR';
  address_from: ShippoAddress;
  address_to: ShippoAddress;
  address_return?: ShippoAddress;
  parcels: ShippoParcel[];
  shipment_date?: string;
  extra?: ShipmentExtra;
  customs_declaration?: string;
  rates: ShippoRate[];
  carrier_accounts?: string[];
  messages: ShipmentMessage[];
  metadata?: string;
  test?: boolean;
}

export interface ShipmentExtra {
  signature_confirmation?: 'STANDARD' | 'ADULT' | 'CERTIFIED' | 'INDIRECT' | 'CARRIER_CONFIRMATION';
  authority_to_leave?: boolean;
  saturday_delivery?: boolean;
  dry_ice?: {
    contains_dry_ice: boolean;
    weight?: string;
  };
  insurance?: {
    amount: string;
    currency: string;
    content: string;
  };
  is_return?: boolean;
  reference_1?: string;
  reference_2?: string;
  billing?: {
    type: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY' | 'THIRD_PARTY_CONSIGNEE';
    account?: string;
    zip?: string;
    country?: string;
  };
  cod?: {
    amount: string;
    currency: string;
    payment_method: 'SECURED_FUNDS' | 'CASH' | 'ANY';
  };
}

export interface ShipmentMessage {
  source: string;
  code: string;
  text: string;
}

export interface ShipmentCreateInput {
  address_from: AddressCreateInput | string;
  address_to: AddressCreateInput | string;
  parcels: (ParcelCreateInput | string)[];
  address_return?: AddressCreateInput | string;
  shipment_date?: string;
  extra?: ShipmentExtra;
  customs_declaration?: string;
  carrier_accounts?: string[];
  metadata?: string;
  async?: boolean;
}

// =============================================================================
// Rate
// =============================================================================

export interface ShippoRate {
  object_id: string;
  object_created: string;
  object_owner: string;
  shipment: string;
  attributes: string[];
  amount: string;
  currency: string;
  amount_local: string;
  currency_local: string;
  provider: string;
  provider_image_75: string;
  provider_image_200: string;
  servicelevel: ServiceLevel;
  estimated_days: number;
  arrives_by?: string;
  duration_terms?: string;
  messages: RateMessage[];
  carrier_account: string;
  zone?: string;
  test?: boolean;
}

export interface ServiceLevel {
  name: string;
  token: string;
  terms?: string;
  extended_token?: string;
  parent_servicelevel?: ServiceLevel;
}

export interface RateMessage {
  source: string;
  code: string;
  text: string;
}

// =============================================================================
// Transaction (Label)
// =============================================================================

export interface ShippoTransaction {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  object_state: 'VALID' | 'INVALID';
  status: 'QUEUED' | 'WAITING' | 'SUCCESS' | 'ERROR' | 'REFUNDED' | 'REFUNDPENDING' | 'REFUNDREJECTED';
  rate: string;
  tracking_number: string;
  tracking_status: 'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE';
  tracking_url_provider: string;
  label_url: string;
  commercial_invoice_url?: string;
  eta?: string;
  messages: TransactionMessage[];
  qr_code_url?: string;
  metadata?: string;
  test?: boolean;
}

export interface TransactionMessage {
  source: string;
  code: string;
  text: string;
}

export interface TransactionCreateInput {
  rate: string;
  label_file_type?: 'PNG' | 'PNG_2.3x7.5' | 'PDF' | 'PDF_2.3x7.5' | 'PDF_4x6' | 'PDF_4x8' | 'PDF_A4' | 'PDF_A5' | 'PDF_A6' | 'ZPLII';
  metadata?: string;
  async?: boolean;
}

export interface InstantTransactionCreateInput {
  shipment: ShipmentCreateInput;
  carrier_account: string;
  servicelevel_token: string;
  label_file_type?: string;
  metadata?: string;
}

// =============================================================================
// Tracking
// =============================================================================

export interface TrackingStatus {
  carrier: string;
  tracking_number: string;
  address_from?: TrackingAddress;
  address_to?: TrackingAddress;
  transaction?: string;
  eta?: string;
  original_eta?: string;
  servicelevel?: ServiceLevel;
  metadata?: string;
  tracking_status: TrackingEvent;
  tracking_history: TrackingEvent[];
}

export interface TrackingAddress {
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface TrackingEvent {
  object_id: string;
  object_created: string;
  status: 'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE';
  status_details: string;
  status_date: string;
  location?: TrackingAddress;
  substatus?: {
    code: string;
    text: string;
  };
}

export interface TrackingWebhookInput {
  carrier: string;
  tracking_number: string;
  metadata?: string;
}

// =============================================================================
// Refund
// =============================================================================

export interface ShippoRefund {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  status: 'QUEUED' | 'PENDING' | 'SUCCESS' | 'ERROR';
  transaction: string;
  test?: boolean;
}

export interface RefundCreateInput {
  transaction: string;
  async?: boolean;
}

// =============================================================================
// Carrier Account
// =============================================================================

export interface CarrierAccount {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  carrier: string;
  account_id: string;
  parameters?: Record<string, unknown>;
  active: boolean;
  test?: boolean;
  is_shippo_account?: boolean;
  metadata?: string;
}

export interface CarrierAccountCreateInput {
  carrier: string;
  account_id: string;
  parameters?: Record<string, unknown>;
  active?: boolean;
  metadata?: string;
}

export interface CarrierAccountUpdateInput {
  account_id?: string;
  parameters?: Record<string, unknown>;
  active?: boolean;
  metadata?: string;
}

// =============================================================================
// Customs Item
// =============================================================================

export interface CustomsItem {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  object_state: 'VALID' | 'INVALID';
  description: string;
  quantity: number;
  net_weight: string;
  mass_unit: MassUnit;
  value_amount: string;
  value_currency: string;
  origin_country: string;
  tariff_number?: string;
  sku_code?: string;
  eccn_ear99?: string;
  metadata?: string;
  test?: boolean;
}

export interface CustomsItemCreateInput {
  description: string;
  quantity: number;
  net_weight: number;
  mass_unit: MassUnit;
  value_amount: number;
  value_currency: string;
  origin_country: string;
  tariff_number?: string;
  sku_code?: string;
  eccn_ear99?: string;
  metadata?: string;
}

// =============================================================================
// Customs Declaration
// =============================================================================

export interface CustomsDeclaration {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  object_state: 'VALID' | 'INVALID';
  certify: boolean;
  certify_signer: string;
  contents_type: ContentsType;
  contents_explanation?: string;
  exporter_reference?: string;
  importer_reference?: string;
  invoice?: string;
  commercial_invoice?: boolean;
  license?: string;
  certificate?: string;
  notes?: string;
  eel_pfc?: string;
  aes_itn?: string;
  non_delivery_option: NonDeliveryOption;
  incoterm?: Incoterm;
  b13a_filing_option?: B13AFilingOption;
  b13a_number?: string;
  invoiced_charges?: InvoicedCharges;
  exporter_identification?: ExporterIdentification;
  items: string[];
  metadata?: string;
  test?: boolean;
}

export type ContentsType = 'DOCUMENTS' | 'GIFT' | 'SAMPLE' | 'MERCHANDISE' | 'HUMANITARIAN_DONATION' | 'RETURN_MERCHANDISE' | 'OTHER';
export type NonDeliveryOption = 'ABANDON' | 'RETURN';
export type Incoterm = 'DDP' | 'DDU' | 'CPT' | 'CIP' | 'DAP' | 'DAT' | 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF';
export type B13AFilingOption = 'FILED_ELECTRONICALLY' | 'SUMMARY_REPORTING' | 'NOT_REQUIRED';

export interface InvoicedCharges {
  total_shipping?: string;
  total_taxes?: string;
  total_duties?: string;
  other_fees?: string;
  currency?: string;
}

export interface ExporterIdentification {
  eori_number?: string;
  tax_id?: {
    number: string;
    type: 'EIN' | 'VAT' | 'IOSS' | 'ARN';
  };
}

export interface CustomsDeclarationCreateInput {
  certify: boolean;
  certify_signer: string;
  contents_type: ContentsType;
  contents_explanation?: string;
  exporter_reference?: string;
  importer_reference?: string;
  invoice?: string;
  commercial_invoice?: boolean;
  license?: string;
  certificate?: string;
  notes?: string;
  eel_pfc?: string;
  aes_itn?: string;
  non_delivery_option: NonDeliveryOption;
  incoterm?: Incoterm;
  b13a_filing_option?: B13AFilingOption;
  b13a_number?: string;
  invoiced_charges?: InvoicedCharges;
  exporter_identification?: ExporterIdentification;
  items: (CustomsItemCreateInput | string)[];
  metadata?: string;
}

// =============================================================================
// Manifest
// =============================================================================

export interface Manifest {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  status: 'QUEUED' | 'SUCCESS' | 'ERROR';
  carrier_account: string;
  shipment_date: string;
  address_from: string;
  transactions: string[];
  documents: string[];
  errors: ManifestError[];
  test?: boolean;
}

export interface ManifestError {
  source: string;
  code: string;
  text: string;
}

export interface ManifestCreateInput {
  carrier_account: string;
  shipment_date: string;
  address_from: string;
  transactions: string[];
  async?: boolean;
}

// =============================================================================
// Batch
// =============================================================================

export interface Batch {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  status: 'VALIDATING' | 'VALID' | 'INVALID' | 'PURCHASING' | 'PURCHASED';
  default_carrier_account: string;
  default_servicelevel_token: string;
  label_file_type?: string;
  metadata?: string;
  batch_shipments: {
    count: number;
    results: BatchShipment[];
    next?: string;
    previous?: string;
  };
  label_url?: string[];
  test?: boolean;
}

export interface BatchShipment {
  object_id: string;
  status: 'VALID' | 'INVALID' | 'INCOMPLETE' | 'TRANSACTION_FAILED';
  carrier_account?: string;
  servicelevel_token?: string;
  shipment: string;
  transaction?: string;
  messages: BatchShipmentMessage[];
  metadata?: string;
}

export interface BatchShipmentMessage {
  source: string;
  code: string;
  text: string;
}

export interface BatchCreateInput {
  default_carrier_account: string;
  default_servicelevel_token: string;
  label_file_type?: string;
  metadata?: string;
  batch_shipments: BatchShipmentInput[];
}

export interface BatchShipmentInput {
  shipment: ShipmentCreateInput;
  carrier_account?: string;
  servicelevel_token?: string;
  metadata?: string;
}

export interface BatchAddShipmentsInput {
  shipments: BatchShipmentInput[];
}

export interface BatchRemoveShipmentsInput {
  shipment_ids: string[];
}

// =============================================================================
// Pickup
// =============================================================================

export interface Pickup {
  object_id: string;
  object_created: string;
  object_updated: string;
  carrier_account: string;
  location: PickupLocation;
  transactions: string[];
  requested_start_time: string;
  requested_end_time: string;
  confirmed_start_time?: string;
  confirmed_end_time?: string;
  cancel_by_time?: string;
  status: 'PENDING' | 'CONFIRMED' | 'ERROR' | 'CANCELLED';
  confirmation_code?: string;
  timezone: string;
  messages: PickupMessage[];
  metadata?: string;
  test?: boolean;
}

export interface PickupLocation {
  building_location_type: 'Front Door' | 'Back Door' | 'Side Door' | 'Knock on Door' | 'Ring Bell' | 'Mail Room' | 'Office' | 'Reception' | 'In/At Mailbox' | 'Security Deck' | 'Shipping/Receiving' | 'Other';
  building_type?: 'apartment' | 'building' | 'department' | 'floor' | 'room' | 'suite';
  instructions?: string;
  address: AddressCreateInput | string;
}

export interface PickupMessage {
  source: string;
  code: string;
  text: string;
}

export interface PickupCreateInput {
  carrier_account: string;
  location: PickupLocation;
  transactions: string[];
  requested_start_time: string;
  requested_end_time: string;
  is_test?: boolean;
  metadata?: string;
}

// =============================================================================
// Order
// =============================================================================

export interface ShippoOrder {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  order_number: string;
  order_status: OrderStatus;
  to_address: ShippoAddress;
  from_address?: ShippoAddress;
  line_items: LineItem[];
  placed_at: string;
  shipping_cost?: string;
  shipping_cost_currency?: string;
  shipping_method?: string;
  shop_app?: string;
  subtotal_price?: string;
  total_price?: string;
  total_tax?: string;
  currency?: string;
  weight?: string;
  weight_unit?: MassUnit;
  notes?: string;
  transactions: string[];
  test?: boolean;
}

export type OrderStatus = 'UNKNOWN' | 'AWAITPAY' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'PARTIALLY_FULFILLED' | 'SHIPPED';

export interface LineItem {
  object_id: string;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  total_price?: string;
  currency?: string;
  weight?: string;
  weight_unit?: MassUnit;
  manufacture_country?: string;
}

export interface OrderCreateInput {
  to_address: AddressCreateInput | string;
  from_address?: AddressCreateInput | string;
  line_items: LineItemInput[];
  order_number?: string;
  order_status?: OrderStatus;
  placed_at: string;
  shipping_cost?: string;
  shipping_cost_currency?: string;
  shipping_method?: string;
  subtotal_price?: string;
  total_price?: string;
  total_tax?: string;
  currency?: string;
  weight?: string;
  weight_unit?: MassUnit;
  notes?: string;
}

export interface LineItemInput {
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  total_price?: string;
  currency?: string;
  weight?: string;
  weight_unit?: MassUnit;
  manufacture_country?: string;
}

// =============================================================================
// Service Groups
// =============================================================================

export interface ServiceGroup {
  object_id: string;
  name: string;
  description?: string;
  flat_rate?: string;
  flat_rate_currency?: string;
  free_shipping_threshold_min?: string;
  free_shipping_threshold_currency?: string;
  rate_adjustment?: number;
  type: 'LIVE_RATE' | 'FLAT_RATE' | 'FREE_SHIPPING';
  is_active: boolean;
  service_levels: ServiceGroupServiceLevel[];
}

export interface ServiceGroupServiceLevel {
  account_object_id: string;
  servicelevel_token: string;
}

export interface ServiceGroupCreateInput {
  name: string;
  description?: string;
  flat_rate?: string;
  flat_rate_currency?: string;
  free_shipping_threshold_min?: string;
  free_shipping_threshold_currency?: string;
  rate_adjustment?: number;
  type: 'LIVE_RATE' | 'FLAT_RATE' | 'FREE_SHIPPING';
  is_active?: boolean;
  service_levels: ServiceGroupServiceLevel[];
}

export interface ServiceGroupUpdateInput {
  name?: string;
  description?: string;
  flat_rate?: string;
  flat_rate_currency?: string;
  free_shipping_threshold_min?: string;
  free_shipping_threshold_currency?: string;
  rate_adjustment?: number;
  type?: 'LIVE_RATE' | 'FLAT_RATE' | 'FREE_SHIPPING';
  is_active?: boolean;
  service_levels?: ServiceGroupServiceLevel[];
}

// =============================================================================
// Parcel Templates
// =============================================================================

export interface CarrierParcelTemplate {
  token: string;
  carrier: string;
  name: string;
  length: string;
  width: string;
  height: string;
  distance_unit: DistanceUnit;
  is_variable_dimensions: boolean;
}

export interface UserParcelTemplate {
  object_id: string;
  object_created: string;
  object_updated: string;
  object_owner: string;
  template?: string;
  name: string;
  length: string;
  width: string;
  height: string;
  distance_unit: DistanceUnit;
  weight?: string;
  weight_unit?: MassUnit;
}

export interface UserParcelTemplateCreateInput {
  template?: string;
  name: string;
  length: number;
  width: number;
  height: number;
  distance_unit: DistanceUnit;
  weight?: number;
  weight_unit?: MassUnit;
}

// =============================================================================
// Live Rates
// =============================================================================

export interface LiveRate {
  title: string;
  amount: string;
  amount_local: string;
  currency: string;
  currency_local: string;
  estimated_days: number;
  arrives_by?: string;
}

export interface LiveRateCreateInput {
  address_from: AddressCreateInput | string;
  address_to: AddressCreateInput | string;
  line_items: LineItemInput[];
  parcel?: ParcelCreateInput | string;
}

export interface DefaultParcelTemplate {
  object_id: string;
  template?: string;
  name: string;
  length: string;
  width: string;
  height: string;
  distance_unit: DistanceUnit;
  weight?: string;
  weight_unit?: MassUnit;
}

export interface DefaultParcelTemplateUpdateInput {
  object_id: string;
}

// =============================================================================
// Response Format
// =============================================================================

export type ResponseFormat = 'json' | 'markdown';
