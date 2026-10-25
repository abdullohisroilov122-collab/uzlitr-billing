// UZLITR billing bridge schema, applied automatically on the first request (lib/db.js).
// Every statement is idempotent so it is safe to run on each cold start.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('superadmin', 'admin', 'operator')),
  client_type   TEXT NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'legal')),
  pinfl         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  manufacturer TEXT,
  description  TEXT,
  diameter_mm  INTEGER,
  ping_hours   INTEGER NOT NULL DEFAULT 24,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meters (
  id             SERIAL PRIMARY KEY,
  meter_serial   TEXT UNIQUE,
  modem_serial   TEXT NOT NULL UNIQUE,
  model_id       INTEGER REFERENCES models(id) ON DELETE SET NULL,
  owner_name     TEXT,
  owner_phone    TEXT,
  account_number TEXT,
  address        TEXT,
  notes          TEXT,
  last_value     NUMERIC(14, 3),
  last_battery   NUMERIC(5, 2),
  last_signal    INTEGER,
  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS readings (
  id               BIGSERIAL PRIMARY KEY,
  meter_id         INTEGER NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  value            NUMERIC(14, 3) NOT NULL,
  battery          NUMERIC(5, 2),
  signal           INTEGER,
  measured_at      TIMESTAMPTZ NOT NULL,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  forwarded_at     TIMESTAMPTZ,
  forward_attempts INTEGER NOT NULL DEFAULT 0,
  forward_error    TEXT,
  UNIQUE (meter_id, measured_at)
);
CREATE INDEX IF NOT EXISTS readings_meter_time ON readings (meter_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS readings_pending ON readings (id) WHERE forwarded_at IS NULL;

CREATE TABLE IF NOT EXISTS tokens (
  id           SERIAL PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('user', 'meter')),
  name         TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  scopes       TEXT[] NOT NULL DEFAULT '{}',
  meter_id     INTEGER REFERENCES meters(id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  details    JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_time ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  phone      TEXT NOT NULL,
  ip         TEXT,
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_phone_time ON login_attempts (phone, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- v0.2: customers (abonents), customer portal accounts, map coordinates.
CREATE TABLE IF NOT EXISTS customers (
  id             SERIAL PRIMARY KEY,
  kind           TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual', 'legal')),
  name           TEXT NOT NULL,
  phone          TEXT,
  inn            TEXT,
  pinfl          TEXT,
  account_number TEXT UNIQUE,
  region         TEXT,
  district       TEXT,
  street         TEXT,
  house          TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meters ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE meters ADD COLUMN IF NOT EXISTS installed_at DATE;
CREATE INDEX IF NOT EXISTS meters_customer ON meters (customer_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'operator', 'client'));

-- Move v0.1 owner fields on meters into customers. Clearing them afterwards makes this run once per meter.
DO $$
DECLARE r RECORD; cid INTEGER;
BEGIN
  FOR r IN SELECT id, owner_name, owner_phone, account_number, address FROM meters
           WHERE customer_id IS NULL AND (owner_name IS NOT NULL OR account_number IS NOT NULL) LOOP
    cid := NULL;
    IF r.account_number IS NOT NULL THEN
      SELECT id INTO cid FROM customers WHERE account_number = r.account_number;
    END IF;
    IF cid IS NULL THEN
      INSERT INTO customers (name, phone, account_number, street)
      VALUES (coalesce(r.owner_name, r.account_number), r.owner_phone, r.account_number, r.address)
      RETURNING id INTO cid;
    END IF;
    UPDATE meters SET customer_id = cid, owner_name = NULL, owner_phone = NULL, account_number = NULL WHERE id = r.id;
  END LOOP;
END $$;

-- v0.3: customer logins by modem number, and applications (self-registration, adding a meter).
ALTER TABLE users ADD COLUMN IF NOT EXISTS login TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users (lower(login)) WHERE login IS NOT NULL;

CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('register', 'add_meter')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  modem_serial TEXT NOT NULL,
  meter_id     INTEGER REFERENCES meters(id) ON DELETE SET NULL,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',
  note         TEXT,
  ip           TEXT,
  reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_status ON applications (status, created_at DESC);
`;
