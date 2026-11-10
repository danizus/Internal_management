-- minimal_seed.sql
-- Seed script for TAM VPS Reseller Platform
-- Run this AFTER running 001_initial_schema.sql
-- All IDs are BIGINT, all monetary values are minor units (e.g. 1250 = $12.50)

BEGIN;

-- 1. Insert Countries Lookup
INSERT INTO countries (country_name, iso_code)
VALUES
  ('Germany', 'DE'),
  ('United States', 'US'),
  ('United Kingdom', 'GB'),
  ('Finland', 'FI')
ON CONFLICT (iso_code) DO NOTHING;

-- 2. Insert Upstream Vendors
INSERT INTO vendors (vendor_name, vendor_website, vendor_rating, vendor_sales_count, notes)
VALUES
  ('Hetzner', 'https://hetzner.com', 4.80, 1, 'Top tier EU reliability, fast provisioning, NVMe storage'),
  ('Contabo', 'https://contabo.com', 4.20, 0, 'High RAM and core counts, cost-effective wholesale rates'),
  ('OVHcloud', 'https://ovhcloud.com', 4.40, 0, 'Anti-DDoS included, global data centers')
ON CONFLICT DO NOTHING;

-- 3. Insert Wholesale Vendor Packages (Linked to Vendors & Countries)
INSERT INTO vendor_packages (
  vendor_id,
  country_id,
  package_name,
  cpu_cores,
  ram,
  storage,
  operating_system,
  bandwidth,
  dedicated_ip,
  price_minor,
  currency,
  billing_cycle,
  package_sales_count,
  is_active
)
VALUES
  -- Hetzner CX22 in Germany
  (
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Hetzner' LIMIT 1),
    (SELECT country_id FROM countries WHERE iso_code = 'DE' LIMIT 1),
    'CX22',
    '2 vCPU',
    '4 GB',
    '40 GB NVMe',
    'Ubuntu 24.04',
    '20 TB',
    '1 IPv4',
    550, -- $5.50
    'USD',
    'monthly',
    1,
    TRUE
  ),
  -- Hetzner CPX31 in Germany
  (
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Hetzner' LIMIT 1),
    (SELECT country_id FROM countries WHERE iso_code = 'DE' LIMIT 1),
    'CPX31',
    '4 vCPU',
    '8 GB',
    '160 GB NVMe',
    'Ubuntu 24.04',
    '20 TB',
    '1 IPv4',
    1390, -- $13.90
    'USD',
    'monthly',
    0,
    TRUE
  ),
  -- Contabo Cloud VPS S in Germany
  (
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Contabo' LIMIT 1),
    (SELECT country_id FROM countries WHERE iso_code = 'DE' LIMIT 1),
    'Cloud VPS S',
    '4 vCPU',
    '8 GB',
    '50 GB NVMe',
    'Ubuntu 24.04',
    '32 TB',
    '1 IPv4',
    650, -- $6.50
    'USD',
    'monthly',
    0,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- 4. Insert Retail Display Packages (Mapped to WHMCS Products)
INSERT INTO display_packages (
  whmcs_pid,
  vendor_id,
  default_vendor_package_id,
  country_id,
  package_name,
  cpu_cores,
  ram,
  storage,
  operating_system,
  bandwidth,
  dedicated_ip,
  price_minor,
  currency,
  billing_cycle,
  is_active
)
VALUES
  -- Retail Product 1 (WHMCS PID 42) mapped to Hetzner CX22
  (
    42,
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Hetzner' LIMIT 1),
    (SELECT package_id FROM vendor_packages WHERE package_name = 'CX22' LIMIT 1),
    (SELECT country_id FROM countries WHERE iso_code = 'DE' LIMIT 1),
    'EU Cloud Starter 4G',
    '2 vCPU',
    '4 GB',
    '40 GB NVMe',
    'Ubuntu 24.04',
    '20 TB',
    '1 IPv4',
    1250, -- Retail: $12.50 (Est Gross Margin: $12.50 - $5.50 = +$7.00)
    'USD',
    'monthly',
    TRUE
  ),
  -- Retail Product 2 (WHMCS PID 43) mapped to Hetzner CPX31
  (
    43,
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Hetzner' LIMIT 1),
    (SELECT package_id FROM vendor_packages WHERE package_name = 'CPX31' LIMIT 1),
    (SELECT country_id FROM countries WHERE iso_code = 'DE' LIMIT 1),
    'EU Cloud Pro 8G',
    '4 vCPU',
    '8 GB',
    '160 GB NVMe',
    'Ubuntu 24.04',
    '20 TB',
    '1 IPv4',
    2400, -- Retail: $24.00 (Est Gross Margin: $24.00 - $13.90 = +$10.10)
    'USD',
    'monthly',
    TRUE
  )
ON CONFLICT (whmcs_pid) DO NOTHING;

-- 5. Insert Sample Clients
INSERT INTO clients (whmcs_client_id, client_name, client_email, client_phone, company_name, status)
VALUES
  (15, 'Daniyal Ahmed', 'daniyal@example.com', '+923001234567', 'CloudTech Ltd', 'active'),
  (16, 'Acme Corp Admin', 'billing@acme.com', '+14155552671', 'Acme Corporation', 'active')
ON CONFLICT (whmcs_client_id) DO NOTHING;

-- 6. Insert Sample Purchases (1 Active, 1 Pending Fulfillment)
INSERT INTO purchases (
  whmcs_order_id,
  whmcs_service_id,
  whmcs_invoice_id,
  client_id,
  display_package_id,
  vendor_id,
  package_id,
  ip_address,
  hostname,
  status,
  sales_amount_minor,
  purchase_amount_minor,
  processing_charges_minor,
  profit_amount_minor,
  currency,
  purchase_date,
  due_date,
  billing_cycle,
  payment_method
)
VALUES
  -- 1. Active Order (Fulfilled)
  (
    1001,
    501,
    981,
    (SELECT client_id FROM clients WHERE whmcs_client_id = 15 LIMIT 1),
    (SELECT display_package_id FROM display_packages WHERE whmcs_pid = 42 LIMIT 1),
    (SELECT vendor_id FROM vendors WHERE vendor_name = 'Hetzner' LIMIT 1),
    (SELECT package_id FROM vendor_packages WHERE package_name = 'CX22' LIMIT 1),
    '188.114.97.2',
    'vps1.daniyal.net',
    'active',
    1250, -- Sale: $12.50
    550,  -- Wholesale: $5.50
    50,   -- Gateway fee: $0.50
    650,  -- Net Profit: $6.50
    'USD',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    'monthly',
    'Stripe'
  ),
  -- 2. Pending Fulfillment Order (WHMCS newly paid order waiting for IP provisioning)
  (
    1002,
    502,
    982,
    (SELECT client_id FROM clients WHERE whmcs_client_id = 16 LIMIT 1),
    (SELECT display_package_id FROM display_packages WHERE whmcs_pid = 43 LIMIT 1),
    NULL, -- Staff will assign in the UI
    NULL, -- Staff will assign in the UI
    NULL, -- Staff will enter IP in the UI
    NULL,
    'pending_fulfillment',
    2400, -- Sale: $24.00
    0,
    75,   -- Gateway fee: $0.75
    2325, -- Temporary profit until wholesale cost is confirmed
    'USD',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '30 days',
    'monthly',
    'PayPal'
  )
ON CONFLICT (whmcs_service_id) DO NOTHING;

COMMIT;
