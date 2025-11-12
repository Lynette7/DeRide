import supabase from "../../database-setup.js";
export async function createDevice(deviceData) {
  const { data, error } = await supabase
    .from("devices")
    .insert({
      device_id: deviceData.device_id,
      driver_id: deviceData.driver_id,
      did_name: deviceData.did_name,
      blockchain_address: deviceData.blockchain_address || null,
      device_type: deviceData.device_type || "smartphone",
      metadata: deviceData.metadata || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create device: ${error.message}`);
  }

  return data;
}
// Get device by name
export async function getDeviceByName(didName) {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("did_name", didName)
    .single();
  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get device: ${error.message}`);
  }

  return data;
}
//Get device by device_id

export async function getDeviceById(deviceId) {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get device: ${error.message}`);
  }

  return data;
}
// Get all devices from one driver
export async function getDevicesByDriverId(driverId) {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("driver_id", driverId)
    .order("registered_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get devices: ${error.message}`);
  }

  return data || [];
}
// Delete device
export async function deleteDevice(deviceId) {
  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("device_id", deviceId);

  if (error) {
    throw new Error(`Failed to delete device: ${error.message}`);
  }

  return true;
}
/**
 * UPDATE - Update device (generic)
 */
export async function updateDevice(deviceId, updates) {
  const { data, error } = await supabase
    .from("devices")
    .update(updates)
    .eq("device_id", deviceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update device: ${error.message}`);
  }

  return data;
}

// We need to handle multiple device registration
/**
 * Get the active device for a driver
 * @param {number} driverId
 * @returns {object|null} Active device or null
 */
export async function getActiveDeviceByDriverId(driverId) {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("driver_id", driverId)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get active device: ${error.message}`);
  }

  return data;
}

/**
 * Set a device as active (deactivates other devices for the same driver)
 * @param {string} deviceId
 * @returns {object} Updated device
 */
export async function setDeviceActive(deviceId) {
  // First get the device to find driver_id
  const device = await getDeviceById(deviceId);
  if (!device) {
    throw new Error(`Device not found: ${deviceId}`);
  }

  // Deactivate all devices for this driver
  await supabase
    .from("devices")
    .update({ is_active: false })
    .eq("driver_id", device.driver_id);

  // Activate this device
  const { data, error } = await supabase
    .from("devices")
    .update({ is_active: true })
    .select()
    .eq("device_id", deviceId)
    .single();

  if (error) {
    throw new Error(`Failed to set device active: ${error.message}`);
  }

  return data;
}