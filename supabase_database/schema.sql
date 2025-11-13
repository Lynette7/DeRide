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
  metadata JSONB,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;



-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_driver_id ON devices(driver_id);
CREATE INDEX IF NOT EXISTS idx_devices_driver_active ON devices(driver_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices(is_active);
UPDATE devices d1
SET is_active = true
WHERE d1.id = (
  SELECT MIN(id) 
  FROM devices d2 
  WHERE d2.driver_id = d1.driver_id
)
AND NOT EXISTS (
  SELECT 1 
  FROM devices d3 
  WHERE d3.driver_id = d1.driver_id 
  AND d3.is_active = true
);