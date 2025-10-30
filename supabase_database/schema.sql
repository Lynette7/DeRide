--Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    substrate_address VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'active'
);
-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  did_name TEXT UNIQUE NOT NULL,
  blockchain_address TEXT,
  registered_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  device_type TEXT DEFAULT 'smartphone',
  metadata JSONB
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_driver_id ON devices(driver_id);
