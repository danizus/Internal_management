# TAM API Reference & Schema Specification

Base URL: `http://localhost:4000/api`

All monetary amounts are `string` integers in minor units (e.g. cents: `"1250"` = `$12.50`).
All IDs are `string` integers (e.g. `"1"`, `"42"`).

---

## Standard Headers & Rate Limiting

The API is protected by rate limiting. Every response includes standard rate limit headers:
- `X-RateLimit-Limit`: Maximum requests permitted in the current window (default: `100`).
- `X-RateLimit-Remaining`: Requests remaining in the current window.
- `X-RateLimit-Reset`: Unix timestamp in seconds when the window resets.

When exceeded, the API returns HTTP `429 Too Many Requests` with a `Retry-After: <seconds>` header.

---

## Standard Response Format

### Success:
```json
{
  "ok": true,
  "data": { ... }
}
```

### Error:
```json
{
  "ok": false,
  "error": {
    "message": "Human-readable error description",
    "details": [ ... ]
  }
}
```

---

## 1. System Health & Database Indicator

### `GET /api/health`
Probes database connectivity and returns latency.

**Response (Connected - 200 OK):**
```json
{
  "ok": true,
  "status": "healthy",
  "database": {
    "connected": true,
    "latency_ms": 3
  }
}
```

**Response (Degraded - 503 Service Unavailable):**
```json
{
  "ok": false,
  "status": "degraded",
  "database": {
    "connected": false,
    "error": "connect ECONNREFUSED 127.0.0.1:5432"
  }
}
```

---

## 2. Authentication & Profile

### `POST /api/auth/register`
Registers a new internal team user. If no users exist, first user is automatically promoted to `admin`.
- **Body**: `{ "name": string, "email": string, "password": string (min 8), "phone"?: string, "role"?: "admin" | "staff" }`
- **Response (201 Created)**: `{ "ok": true, "data": { "token": string, "user": { "user_id": string, "name": string, "email": string, "role": string } } }`

### `POST /api/auth/login`
- **Rate Limit**: 15 requests / 15 minutes.
- **Body**: `{ "email": string, "password": string }`
- **Response (200 OK)**: `{ "ok": true, "data": { "token": string, "user": { ... } } }`

### `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: `{ "ok": true, "data": { "user_id": string, "name": string, "email": string, "role": string } }`

---

## 3. Lookups: Countries

- `GET /api/countries`: List all countries sorted alphabetically.
- `GET /api/countries/:id`: Get country by ID.
- `POST /api/countries`:
  - **Body**: `{ "country_name": string, "iso_code": string (2-3 chars uppercase) }`
- `PATCH /api/countries/:id`: Partial update.
- `DELETE /api/countries/:id`: Delete country (409 if referenced by packages).

---

## 4. Upstream Reseller Directory: Vendors & Wholesale Packages

### Vendors:
- `GET /api/vendors?q=...`: List vendors with package count and total sales count.
- `GET /api/vendors/:id`: Get vendor by ID.
- `POST /api/vendors`:
  - **Body**: `{ "vendor_name": string, "vendor_website"?: string, "vendor_rating"?: number (0-5), "notes"?: string }`
- `PATCH /api/vendors/:id`: Update vendor.
- `DELETE /api/vendors/:id`: Delete vendor.

### Wholesale Packages (`vendor_packages`):
- `GET /api/vendor-packages`:
  - **Query Filters**: `vendor_id`, `country_id`, `operating_system`, `max_price_minor`, `is_active`, `q`.
- `GET /api/vendor-packages/:id`
- `POST /api/vendor-packages`:
  - **Body**:
    ```json
    {
      "vendor_id": "10",
      "country_id": "1",
      "package_name": "CX22",
      "cpu_cores": "2 vCPU",
      "ram": "4 GB",
      "storage": "40 GB NVMe",
      "operating_system": "Ubuntu 24.04",
      "bandwidth": "20 TB",
      "dedicated_ip": "1 IPv4",
      "price_minor": "550",
      "currency": "USD",
      "billing_cycle": "monthly",
      "is_active": true
    }
    ```
- `PATCH /api/vendor-packages/:id`
- `DELETE /api/vendor-packages/:id`

---

## 5. Retail Catalog: Display Packages (`display_packages`)

- `GET /api/display-packages`:
  - **Query Filters**: `country_id`, `vendor_id`, `whmcs_pid`, `is_active`, `q`.
  - **Returns**: Enriched with `default_vendor_package_name`, `upstream_price_minor`, and computed `estimated_margin_minor` (`price_minor - upstream_price_minor`).
- `GET /api/display-packages/:id`
- `POST /api/display-packages`:
  - **Body**:
    ```json
    {
      "whmcs_pid": "42",
      "default_vendor_package_id": "101",
      "country_id": "1",
      "vendor_id": "10",
      "package_name": "Cloud VPS 4G",
      "cpu_cores": "2 vCPU",
      "ram": "4 GB",
      "storage": "40 GB NVMe",
      "operating_system": "Ubuntu 24.04",
      "bandwidth": "20 TB",
      "dedicated_ip": "1 IPv4",
      "price_minor": "1200",
      "currency": "USD",
      "billing_cycle": "monthly",
      "is_active": true
    }
    ```
- `PATCH /api/display-packages/:id`
- `DELETE /api/display-packages/:id`

---

## 6. Client CRM: Clients (`clients`)

- `GET /api/clients`:
  - **Query Filters**: `status` (`active` | `inactive` | `closed`), `q` (name, email, phone, company).
  - **Returns**: Client rows with aggregated `purchase_count`.
- `GET /api/clients/:id`
- `POST /api/clients`:
  - **Body**: `{ "client_name": string, "client_email": string, "whmcs_client_id"?: string, "client_phone"?: string, "company_name"?: string, "status"?: string }`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id` (409 if purchases reference client).

---

## 7. Orders & Fulfillment: Purchases (`purchases`)

- `GET /api/purchases`:
  - **Query Filters**: `status` (`pending_fulfillment` | `active` | `suspended` | `cancelled` | `refunded`), `client_id`, `vendor_id`, `due_within_days` (e.g. 7), `q`.
- `GET /api/purchases/:id`
- `POST /api/purchases`:
  - Automatically computes `profit_amount_minor = sales_amount_minor - purchase_amount_minor - processing_charges_minor`.
- `POST /api/purchases/:id/fulfill`:
  - **Body**:
    ```json
    {
      "vendor_id": "10",
      "package_id": "101",
      "ip_address": "192.0.2.1",
      "hostname": "vps1.client.com",
      "purchase_amount_minor": "550",
      "processing_charges_minor": "50"
    }
    ```
  - **Behavior**: Atomically marks purchase as `'active'`, recalculates net profit, and increments `vendors.vendor_sales_count` and `vendor_packages.package_sales_count` inside a PostgreSQL transaction.
- `PATCH /api/purchases/:id`: Recalculates profit if amounts change.
- `DELETE /api/purchases/:id` (409 if refunds reference purchase).

---

## 8. WHMCS Real-Time Webhook & Synchronization Center

### `POST /api/webhooks/whmcs` (Public, HMAC Signed)
Receives real-time order and client push events from WHMCS Action Hook (`tam_order_sync.php`).
- **Required Header**: `X-WHMCS-Signature: <hmac-sha256 hex>`
- **Body Example (`order_paid`)**:
  ```json
  {
    "event": "order_paid",
    "order_id": "101",
    "service_id": "505",
    "invoice_id": "990",
    "product_id": "42",
    "amount": "15.00",
    "currency": "USD",
    "billing_cycle": "monthly",
    "payment_method": "Stripe",
    "due_date": "2026-12-10T00:00:00.000Z",
    "client": {
      "client_id": "15",
      "name": "Daniyal Ahmed",
      "email": "daniyal@example.com",
      "phone": "+923001234567",
      "company": "CloudTech"
    }
  }
  ```
- **Response (200 OK)**: `{ "ok": true, "data": { "client_id": "201", "purchase_id": "701" } }`

### `GET /api/whmcs/status`
Returns integration readiness status (whether `WHMCS_WEBHOOK_SECRET`, `WHMCS_API_URL`, and credentials are configured).
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "ok": true,
    "data": {
      "has_webhook_secret": true,
      "has_api_url": true,
      "has_api_credentials": true,
      "api_url": "https://billing.example.com/includes/api.php"
    }
  }
  ```

### `POST /api/whmcs/sync`
Triggers on-demand reconciliation pull from WHMCS External API (`GetOrders`, `GetClientsDetails`).
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "ok": true,
    "data": {
      "orders_synced": 5,
      "clients_upserted": 4,
      "errors": []
    }
  }
  ```

### `GET /api/whmcs/logs?limit=50`
Retrieves recent webhook deliveries and API sync runs from `whmcs_sync_logs`.
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "ok": true,
    "data": [
      {
        "sync_id": "1",
        "source": "webhook",
        "event_type": "order_paid",
        "external_id": "505",
        "payload": { ... },
        "status": "processed",
        "error_message": null,
        "created_at": "2026-11-10T19:54:00.000Z"
      }
    ]
  }
  ```

