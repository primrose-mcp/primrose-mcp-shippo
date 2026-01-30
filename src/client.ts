/**
 * Shippo API Client
 *
 * This file handles all HTTP communication with the Shippo API.
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different API keys.
 */

import type {
  AddressCreateInput,
  Batch,
  BatchAddShipmentsInput,
  BatchCreateInput,
  BatchRemoveShipmentsInput,
  CarrierAccount,
  CarrierAccountCreateInput,
  CarrierAccountUpdateInput,
  CarrierParcelTemplate,
  CustomsDeclaration,
  CustomsDeclarationCreateInput,
  CustomsItem,
  CustomsItemCreateInput,
  DefaultParcelTemplate,
  DefaultParcelTemplateUpdateInput,
  InstantTransactionCreateInput,
  LiveRate,
  LiveRateCreateInput,
  Manifest,
  ManifestCreateInput,
  PaginatedResponse,
  PaginationParams,
  ParcelCreateInput,
  Pickup,
  PickupCreateInput,
  RefundCreateInput,
  ServiceGroup,
  ServiceGroupCreateInput,
  ServiceGroupUpdateInput,
  ShipmentCreateInput,
  ShippoAddress,
  ShippoOrder,
  ShippoParcel,
  ShippoRate,
  ShippoRefund,
  ShippoShipment,
  ShippoTransaction,
  OrderCreateInput,
  TrackingStatus,
  TrackingWebhookInput,
  TransactionCreateInput,
  UserParcelTemplate,
  UserParcelTemplateCreateInput,
} from './types/entities.js';
import type { TenantCredentials } from './types/env.js';
import { AuthenticationError, RateLimitError, ShippoApiError } from './utils/errors.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = 'https://api.goshippo.com';

// =============================================================================
// Shippo Client Interface
// =============================================================================

export interface ShippoClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // Addresses
  listAddresses(params?: PaginationParams): Promise<PaginatedResponse<ShippoAddress>>;
  getAddress(id: string): Promise<ShippoAddress>;
  createAddress(input: AddressCreateInput): Promise<ShippoAddress>;
  validateAddress(id: string): Promise<ShippoAddress>;

  // Parcels
  listParcels(params?: PaginationParams): Promise<PaginatedResponse<ShippoParcel>>;
  getParcel(id: string): Promise<ShippoParcel>;
  createParcel(input: ParcelCreateInput): Promise<ShippoParcel>;

  // Shipments
  listShipments(params?: PaginationParams): Promise<PaginatedResponse<ShippoShipment>>;
  getShipment(id: string): Promise<ShippoShipment>;
  createShipment(input: ShipmentCreateInput): Promise<ShippoShipment>;

  // Rates
  getRate(id: string): Promise<ShippoRate>;
  listShipmentRates(shipmentId: string, currency?: string): Promise<PaginatedResponse<ShippoRate>>;

  // Transactions (Labels)
  listTransactions(params?: PaginationParams): Promise<PaginatedResponse<ShippoTransaction>>;
  getTransaction(id: string): Promise<ShippoTransaction>;
  createTransaction(input: TransactionCreateInput): Promise<ShippoTransaction>;
  createInstantTransaction(input: InstantTransactionCreateInput): Promise<ShippoTransaction>;

  // Tracking
  getTrackingStatus(carrier: string, trackingNumber: string): Promise<TrackingStatus>;
  registerTrackingWebhook(input: TrackingWebhookInput): Promise<TrackingStatus>;

  // Refunds
  createRefund(input: RefundCreateInput): Promise<ShippoRefund>;
  getRefund(id: string): Promise<ShippoRefund>;

  // Carrier Accounts
  listCarrierAccounts(params?: PaginationParams): Promise<PaginatedResponse<CarrierAccount>>;
  getCarrierAccount(id: string): Promise<CarrierAccount>;
  createCarrierAccount(input: CarrierAccountCreateInput): Promise<CarrierAccount>;
  updateCarrierAccount(id: string, input: CarrierAccountUpdateInput): Promise<CarrierAccount>;

  // Customs Items
  listCustomsItems(params?: PaginationParams): Promise<PaginatedResponse<CustomsItem>>;
  getCustomsItem(id: string): Promise<CustomsItem>;
  createCustomsItem(input: CustomsItemCreateInput): Promise<CustomsItem>;

  // Customs Declarations
  listCustomsDeclarations(params?: PaginationParams): Promise<PaginatedResponse<CustomsDeclaration>>;
  getCustomsDeclaration(id: string): Promise<CustomsDeclaration>;
  createCustomsDeclaration(input: CustomsDeclarationCreateInput): Promise<CustomsDeclaration>;

  // Manifests
  listManifests(params?: PaginationParams): Promise<PaginatedResponse<Manifest>>;
  getManifest(id: string): Promise<Manifest>;
  createManifest(input: ManifestCreateInput): Promise<Manifest>;

  // Batches
  getBatch(id: string): Promise<Batch>;
  createBatch(input: BatchCreateInput): Promise<Batch>;
  addShipmentsToBatch(batchId: string, input: BatchAddShipmentsInput): Promise<Batch>;
  removeShipmentsFromBatch(batchId: string, input: BatchRemoveShipmentsInput): Promise<Batch>;
  purchaseBatch(batchId: string): Promise<Batch>;

  // Pickups
  createPickup(input: PickupCreateInput): Promise<Pickup>;

  // Orders
  listOrders(params?: PaginationParams): Promise<PaginatedResponse<ShippoOrder>>;
  getOrder(id: string): Promise<ShippoOrder>;
  createOrder(input: OrderCreateInput): Promise<ShippoOrder>;

  // Service Groups
  listServiceGroups(): Promise<ServiceGroup[]>;
  createServiceGroup(input: ServiceGroupCreateInput): Promise<ServiceGroup>;
  updateServiceGroup(input: ServiceGroupUpdateInput): Promise<ServiceGroup>;
  deleteServiceGroup(id: string): Promise<void>;

  // Carrier Parcel Templates
  listCarrierParcelTemplates(params?: PaginationParams & { carrier?: string; include?: string }): Promise<PaginatedResponse<CarrierParcelTemplate>>;
  getCarrierParcelTemplate(token: string): Promise<CarrierParcelTemplate>;

  // User Parcel Templates
  listUserParcelTemplates(params?: PaginationParams): Promise<PaginatedResponse<UserParcelTemplate>>;
  getUserParcelTemplate(id: string): Promise<UserParcelTemplate>;
  createUserParcelTemplate(input: UserParcelTemplateCreateInput): Promise<UserParcelTemplate>;
  deleteUserParcelTemplate(id: string): Promise<void>;

  // Live Rates
  createLiveRate(input: LiveRateCreateInput): Promise<LiveRate[]>;
  getDefaultParcelTemplate(): Promise<DefaultParcelTemplate | null>;
  updateDefaultParcelTemplate(input: DefaultParcelTemplateUpdateInput): Promise<DefaultParcelTemplate>;
  deleteDefaultParcelTemplate(): Promise<void>;
}

// =============================================================================
// Shippo Client Implementation
// =============================================================================

class ShippoClientImpl implements ShippoClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || API_BASE_URL;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials.apiKey) {
      throw new AuthenticationError(
        'No credentials provided. Include X-Shippo-API-Key header.'
      );
    }

    return {
      Authorization: `ShippoToken ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? Number.parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Authentication failed. Check your Shippo API key.');
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.detail || errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new ShippoApiError(message, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
    const str = query.toString();
    return str ? `?${str}` : '';
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      await this.request<PaginatedResponse<ShippoAddress>>('/addresses?results=1');
      return { connected: true, message: 'Successfully connected to Shippo API' };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // Addresses
  // ===========================================================================

  async listAddresses(params?: PaginationParams): Promise<PaginatedResponse<ShippoAddress>> {
    return this.request<PaginatedResponse<ShippoAddress>>(`/addresses${this.buildQueryString(params)}`);
  }

  async getAddress(id: string): Promise<ShippoAddress> {
    return this.request<ShippoAddress>(`/addresses/${id}`);
  }

  async createAddress(input: AddressCreateInput): Promise<ShippoAddress> {
    return this.request<ShippoAddress>('/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async validateAddress(id: string): Promise<ShippoAddress> {
    return this.request<ShippoAddress>(`/addresses/${id}/validate`);
  }

  // ===========================================================================
  // Parcels
  // ===========================================================================

  async listParcels(params?: PaginationParams): Promise<PaginatedResponse<ShippoParcel>> {
    return this.request<PaginatedResponse<ShippoParcel>>(`/parcels${this.buildQueryString(params)}`);
  }

  async getParcel(id: string): Promise<ShippoParcel> {
    return this.request<ShippoParcel>(`/parcels/${id}`);
  }

  async createParcel(input: ParcelCreateInput): Promise<ShippoParcel> {
    return this.request<ShippoParcel>('/parcels', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Shipments
  // ===========================================================================

  async listShipments(params?: PaginationParams): Promise<PaginatedResponse<ShippoShipment>> {
    return this.request<PaginatedResponse<ShippoShipment>>(`/shipments${this.buildQueryString(params)}`);
  }

  async getShipment(id: string): Promise<ShippoShipment> {
    return this.request<ShippoShipment>(`/shipments/${id}`);
  }

  async createShipment(input: ShipmentCreateInput): Promise<ShippoShipment> {
    return this.request<ShippoShipment>('/shipments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Rates
  // ===========================================================================

  async getRate(id: string): Promise<ShippoRate> {
    return this.request<ShippoRate>(`/rates/${id}`);
  }

  async listShipmentRates(shipmentId: string, currency?: string): Promise<PaginatedResponse<ShippoRate>> {
    const endpoint = currency
      ? `/shipments/${shipmentId}/rates/${currency}`
      : `/shipments/${shipmentId}/rates`;
    return this.request<PaginatedResponse<ShippoRate>>(endpoint);
  }

  // ===========================================================================
  // Transactions (Labels)
  // ===========================================================================

  async listTransactions(params?: PaginationParams): Promise<PaginatedResponse<ShippoTransaction>> {
    return this.request<PaginatedResponse<ShippoTransaction>>(`/transactions${this.buildQueryString(params)}`);
  }

  async getTransaction(id: string): Promise<ShippoTransaction> {
    return this.request<ShippoTransaction>(`/transactions/${id}`);
  }

  async createTransaction(input: TransactionCreateInput): Promise<ShippoTransaction> {
    return this.request<ShippoTransaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createInstantTransaction(input: InstantTransactionCreateInput): Promise<ShippoTransaction> {
    return this.request<ShippoTransaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Tracking
  // ===========================================================================

  async getTrackingStatus(carrier: string, trackingNumber: string): Promise<TrackingStatus> {
    return this.request<TrackingStatus>(`/tracks/${carrier}/${trackingNumber}`);
  }

  async registerTrackingWebhook(input: TrackingWebhookInput): Promise<TrackingStatus> {
    return this.request<TrackingStatus>('/tracks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Refunds
  // ===========================================================================

  async createRefund(input: RefundCreateInput): Promise<ShippoRefund> {
    return this.request<ShippoRefund>('/refunds', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getRefund(id: string): Promise<ShippoRefund> {
    return this.request<ShippoRefund>(`/refunds/${id}`);
  }

  // ===========================================================================
  // Carrier Accounts
  // ===========================================================================

  async listCarrierAccounts(params?: PaginationParams): Promise<PaginatedResponse<CarrierAccount>> {
    return this.request<PaginatedResponse<CarrierAccount>>(`/carrier_accounts${this.buildQueryString(params)}`);
  }

  async getCarrierAccount(id: string): Promise<CarrierAccount> {
    return this.request<CarrierAccount>(`/carrier_accounts/${id}`);
  }

  async createCarrierAccount(input: CarrierAccountCreateInput): Promise<CarrierAccount> {
    return this.request<CarrierAccount>('/carrier_accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateCarrierAccount(id: string, input: CarrierAccountUpdateInput): Promise<CarrierAccount> {
    return this.request<CarrierAccount>(`/carrier_accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Customs Items
  // ===========================================================================

  async listCustomsItems(params?: PaginationParams): Promise<PaginatedResponse<CustomsItem>> {
    return this.request<PaginatedResponse<CustomsItem>>(`/customs/items${this.buildQueryString(params)}`);
  }

  async getCustomsItem(id: string): Promise<CustomsItem> {
    return this.request<CustomsItem>(`/customs/items/${id}`);
  }

  async createCustomsItem(input: CustomsItemCreateInput): Promise<CustomsItem> {
    return this.request<CustomsItem>('/customs/items', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Customs Declarations
  // ===========================================================================

  async listCustomsDeclarations(params?: PaginationParams): Promise<PaginatedResponse<CustomsDeclaration>> {
    return this.request<PaginatedResponse<CustomsDeclaration>>(`/customs/declarations${this.buildQueryString(params)}`);
  }

  async getCustomsDeclaration(id: string): Promise<CustomsDeclaration> {
    return this.request<CustomsDeclaration>(`/customs/declarations/${id}`);
  }

  async createCustomsDeclaration(input: CustomsDeclarationCreateInput): Promise<CustomsDeclaration> {
    return this.request<CustomsDeclaration>('/customs/declarations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Manifests
  // ===========================================================================

  async listManifests(params?: PaginationParams): Promise<PaginatedResponse<Manifest>> {
    return this.request<PaginatedResponse<Manifest>>(`/manifests${this.buildQueryString(params)}`);
  }

  async getManifest(id: string): Promise<Manifest> {
    return this.request<Manifest>(`/manifests/${id}`);
  }

  async createManifest(input: ManifestCreateInput): Promise<Manifest> {
    return this.request<Manifest>('/manifests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Batches
  // ===========================================================================

  async getBatch(id: string): Promise<Batch> {
    return this.request<Batch>(`/batches/${id}`);
  }

  async createBatch(input: BatchCreateInput): Promise<Batch> {
    return this.request<Batch>('/batches', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async addShipmentsToBatch(batchId: string, input: BatchAddShipmentsInput): Promise<Batch> {
    return this.request<Batch>(`/batches/${batchId}/add_shipments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async removeShipmentsFromBatch(batchId: string, input: BatchRemoveShipmentsInput): Promise<Batch> {
    return this.request<Batch>(`/batches/${batchId}/remove_shipments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async purchaseBatch(batchId: string): Promise<Batch> {
    return this.request<Batch>(`/batches/${batchId}/purchase`, {
      method: 'POST',
    });
  }

  // ===========================================================================
  // Pickups
  // ===========================================================================

  async createPickup(input: PickupCreateInput): Promise<Pickup> {
    return this.request<Pickup>('/pickups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Orders
  // ===========================================================================

  async listOrders(params?: PaginationParams): Promise<PaginatedResponse<ShippoOrder>> {
    return this.request<PaginatedResponse<ShippoOrder>>(`/orders${this.buildQueryString(params)}`);
  }

  async getOrder(id: string): Promise<ShippoOrder> {
    return this.request<ShippoOrder>(`/orders/${id}`);
  }

  async createOrder(input: OrderCreateInput): Promise<ShippoOrder> {
    return this.request<ShippoOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ===========================================================================
  // Service Groups
  // ===========================================================================

  async listServiceGroups(): Promise<ServiceGroup[]> {
    return this.request<ServiceGroup[]>('/service-groups');
  }

  async createServiceGroup(input: ServiceGroupCreateInput): Promise<ServiceGroup> {
    return this.request<ServiceGroup>('/service-groups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateServiceGroup(input: ServiceGroupUpdateInput): Promise<ServiceGroup> {
    return this.request<ServiceGroup>('/service-groups', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteServiceGroup(id: string): Promise<void> {
    await this.request<void>(`/service-groups/${id}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // Carrier Parcel Templates
  // ===========================================================================

  async listCarrierParcelTemplates(
    params?: PaginationParams & { carrier?: string; include?: string }
  ): Promise<PaginatedResponse<CarrierParcelTemplate>> {
    return this.request<PaginatedResponse<CarrierParcelTemplate>>(
      `/parcel-templates${this.buildQueryString(params)}`
    );
  }

  async getCarrierParcelTemplate(token: string): Promise<CarrierParcelTemplate> {
    return this.request<CarrierParcelTemplate>(`/parcel-templates/${token}`);
  }

  // ===========================================================================
  // User Parcel Templates
  // ===========================================================================

  async listUserParcelTemplates(params?: PaginationParams): Promise<PaginatedResponse<UserParcelTemplate>> {
    return this.request<PaginatedResponse<UserParcelTemplate>>(
      `/user-parcel-templates${this.buildQueryString(params)}`
    );
  }

  async getUserParcelTemplate(id: string): Promise<UserParcelTemplate> {
    return this.request<UserParcelTemplate>(`/user-parcel-templates/${id}`);
  }

  async createUserParcelTemplate(input: UserParcelTemplateCreateInput): Promise<UserParcelTemplate> {
    return this.request<UserParcelTemplate>('/user-parcel-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteUserParcelTemplate(id: string): Promise<void> {
    await this.request<void>(`/user-parcel-templates/${id}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // Live Rates
  // ===========================================================================

  async createLiveRate(input: LiveRateCreateInput): Promise<LiveRate[]> {
    const response = await this.request<{ results: LiveRate[] }>('/live-rates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.results;
  }

  async getDefaultParcelTemplate(): Promise<DefaultParcelTemplate | null> {
    try {
      return await this.request<DefaultParcelTemplate>('/live-rates/settings/parcel-template');
    } catch (error) {
      if (error instanceof ShippoApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateDefaultParcelTemplate(input: DefaultParcelTemplateUpdateInput): Promise<DefaultParcelTemplate> {
    return this.request<DefaultParcelTemplate>('/live-rates/settings/parcel-template', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteDefaultParcelTemplate(): Promise<void> {
    await this.request<void>('/live-rates/settings/parcel-template', {
      method: 'DELETE',
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Shippo client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createShippoClient(credentials: TenantCredentials): ShippoClient {
  return new ShippoClientImpl(credentials);
}
