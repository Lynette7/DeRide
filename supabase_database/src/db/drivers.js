import supabase from "../database-setup";
/**
 * Create a new driver
 * @param {string} substrateAddress - The substrate address of the driver
 * @returns {Object} - The created driver
 *  **/
export async function createDriver(substrateAddress) {
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      substrate_address: substrateAddress,
      status: "active",
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create driver: ${error.message}`);
  }
  return data;
}
/**
 * Get driver by substrate address
 * @param {string} substrateAddress
 * @returns {object|null} Driver record or null if not found
 */
export async function getDriverByAddress(substrateAddress) {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("substrate_address", substrateAddress)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    throw new Error(`Failed to get driver: ${error.message}`);
  }

  return data;
}

/**
 * Get or create driver (idempotent)
 * @param {string} substrateAddress
 * @returns {object} Driver record
 */
export async function getOrCreateDriver(substrateAddress) {
  // Try to get existing driver
  let driver = getDriverByAddress(substrateAddress);

  // If doesn't exist, create it
  if (!driver) {
    driver = createDriver(substrateAddress);
    console.log(`✓ New driver created: ${substrateAddress}`);
  } else {
    console.log(`✓ Existing driver found: ${substrateAddress}`);
  }

  return driver;
}

/**
 * Get driver by ID
 * @param {number} driverId
 * @returns {object|null}
 */
export async function getDriverById(driverId) {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get driver: ${error.message}`);
  }

  return data;
}
