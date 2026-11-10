-- 001_initial_schema.sql
-- Initial schema for VPS Reseller Directory & Management Platform (WHMCS Integrated)
-- Rules:
--   - All IDs are BIGINT
--   - All monetary amounts are BIGINT in minor units + 3-letter ISO currency code

BEGIN;

CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  profile_img TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE countries (
  country_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL UNIQUE,
  iso_code VARCHAR(3) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendors (
  vendor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_name VARCHAR(150) NOT NULL,
  vendor_website TEXT,
  vendor_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (vendor_rating >= 0 AND vendor_rating <= 5.00),
  vendor_sales_count INTEGER NOT NULL DEFAULT 0 CHECK (vendor_sales_count >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_packages (
  package_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id BIGINT NOT NULL REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
  country_id BIGINT NOT NULL REFERENCES countries(country_id) ON DELETE RESTRICT,
  package_name VARCHAR(150) NOT NULL,
  cpu_cores VARCHAR(50),
  ram VARCHAR(50) NOT NULL,
  storage VARCHAR(50) NOT NULL,
  operating_system VARCHAR(100) NOT NULL,
  bandwidth VARCHAR(50) NOT NULL,
  dedicated_ip VARCHAR(50) NOT NULL,
  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly',
  package_sales_count INTEGER NOT NULL DEFAULT 0 CHECK (package_sales_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_packages_vendor_id ON vendor_packages(vendor_id);
CREATE INDEX idx_vendor_packages_country_id ON vendor_packages(country_id);

CREATE TABLE display_packages (
  display_package_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  whmcs_pid BIGINT UNIQUE,
  vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
  default_vendor_package_id BIGINT REFERENCES vendor_packages(package_id) ON DELETE SET NULL,
  country_id BIGINT NOT NULL REFERENCES countries(country_id) ON DELETE RESTRICT,
  package_name VARCHAR(150) NOT NULL,
  cpu_cores VARCHAR(50),
  ram VARCHAR(50) NOT NULL,
  storage VARCHAR(50) NOT NULL,
  operating_system VARCHAR(100) NOT NULL,
  bandwidth VARCHAR(50) NOT NULL,
  dedicated_ip VARCHAR(50) NOT NULL,
  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_display_packages_country_id ON display_packages(country_id);
CREATE INDEX idx_display_packages_vendor_id ON display_packages(vendor_id);

CREATE TABLE clients (
  client_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  whmcs_client_id BIGINT UNIQUE,
  client_name VARCHAR(150) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  company_name VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON clients(client_email);

CREATE TABLE purchases (
  purchase_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  whmcs_order_id BIGINT,
  whmcs_service_id BIGINT UNIQUE,
  whmcs_invoice_id BIGINT,
  client_id BIGINT NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  display_package_id BIGINT REFERENCES display_packages(display_package_id) ON DELETE SET NULL,
  vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
  package_id BIGINT REFERENCES vendor_packages(package_id) ON DELETE RESTRICT,
  ip_address VARCHAR(100),
  hostname VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_fulfillment'
    CHECK (status IN ('pending_fulfillment', 'active', 'suspended', 'cancelled', 'refunded')),
  sales_amount_minor BIGINT NOT NULL CHECK (sales_amount_minor >= 0),
  purchase_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (purchase_amount_minor >= 0),
  processing_charges_minor BIGINT NOT NULL DEFAULT 0 CHECK (processing_charges_minor >= 0),
  profit_amount_minor BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'monthly',
  payment_method VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_client_id ON purchases(client_id);
CREATE INDEX idx_purchases_vendor_id ON purchases(vendor_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_due_date ON purchases(due_date);

CREATE TABLE refunds (
  refund_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES purchases(purchase_id) ON DELETE RESTRICT,
  client_id BIGINT NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
  display_package_id BIGINT REFERENCES display_packages(display_package_id) ON DELETE SET NULL,
  refund_amount_minor BIGINT NOT NULL CHECK (refund_amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  whmcs_transaction_id VARCHAR(100),
  reason TEXT,
  refund_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_purchase_id ON refunds(purchase_id);
CREATE INDEX idx_refunds_client_id ON refunds(client_id);

CREATE TABLE expenses (
  expense_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
  expense_title VARCHAR(150) NOT NULL,
  expense_description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  expense_amount_minor BIGINT NOT NULL CHECK (expense_amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE TABLE scripts (
  script_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  script_name VARCHAR(150) NOT NULL,
  os_type VARCHAR(50),
  script_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_email_templates (
  template_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_name VARCHAR(150) NOT NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'ticket')),
  template_subject VARCHAR(255),
  template_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whmcs_sync_logs (
  sync_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source VARCHAR(20) NOT NULL CHECK (source IN ('webhook', 'api_pull')),
  event_type VARCHAR(50) NOT NULL,
  external_id VARCHAR(100),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whmcs_sync_logs_created_at ON whmcs_sync_logs(created_at DESC);

COMMIT;
