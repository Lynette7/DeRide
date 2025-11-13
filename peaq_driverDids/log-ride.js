import { Sdk } from "@peaq-network/sdk";
import dotenv from "dotenv";
import { getActiveDeviceByDriverId, getDeviceById } from "../supabase_database/src/db/device.js";
import { getDriverByAddress } from "../supabase_database/src/db/drivers.js";

dotenv.config();

const WSS_BASE_URL = "wss://peaq-agung.api.onfinality.io/public-ws";
const SUBSTRATE_SEED = process.env["SUBSTRATE_SEED"];
const SUBSTRATE_ADDRESS = process.env["SUBSTRATE_ADDRESS"];

// Validate environment
if (!SUBSTRATE_SEED || !SUBSTRATE_ADDRESS) {
  console.error("❌ Error: SUBSTRATE_SEED and SUBSTRATE_ADDRESS are required in .env file");
  process.exit(1);
}

// Create SDK instance
async function createSdkInstance() {
  try {
    const sdk = await Sdk.createInstance({
      baseUrl: WSS_BASE_URL,
      chainType: Sdk.ChainType.SUBSTRATE,
      seed: SUBSTRATE_SEED,
    });
    return sdk;
  } catch (error) {
    console.error("Error creating SDK instance", error);
    throw error;
  }
}

/**
 * Log GPS coordinates to peaq storage
 * @param {string} deviceDidName - The DID name of the device (e.g., "did:peaq:device:abc123")
 * @param {Object} locationData - { latitude, longitude, timestamp, type, rideId }
 * @returns {Object} The stored data and result
 */
async function logLocation(deviceDidName, locationData) {
  let sdk;
  try {
    sdk = await createSdkInstance();
    
    // Prepare the data to store
    const dataToStore = {
         // "pickup", "route", "dropoff"
      type: locationData.type || "location",
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: locationData.timestamp || new Date().toISOString(),
      rideId: locationData.rideId || null,
      accuracy: locationData.accuracy || null,
      speed: locationData.speed || null,
    };

    console.log(`📍 Logging ${locationData.type} location for ${deviceDidName}:`);
    console.log(`   Lat: ${locationData.latitude}, Lng: ${locationData.longitude}`);
    console.log(`   Time: ${dataToStore.timestamp}`);
    if (locationData.rideId) {
      console.log(`   Ride ID: ${locationData.rideId}`);
    }

    // Create unique key for this location entry
    const timestamp = Date.now();
    const key = `ride-${locationData.rideId || 'current'}-${locationData.type}-${timestamp}`;
    const value = JSON.stringify(dataToStore);

    // Store to peaq storage
    const result = await sdk.storage.addItem({
      itemType: key,
      item: value
    });

    console.log(` Location stored on peaq blockchain`);
    
    return { data: dataToStore, result };
  } catch (error) {
    console.error(" Error logging location:", error);
    throw error;
  } finally {
    // Disconnect SDK when done
    if (sdk) {
      await sdk.disconnect();
    }
  }
}

/**
 * Log a complete ride with pickup, route, and dropoff
 * @param {string} deviceDidName - Device DID name
 * @param {Object} rideData - { pickup, dropoff, routePoints }
 * @returns {string} Ride ID
 */
async function logRide(deviceDidName, rideData) {
  try {
    const rideId = `ride-${Date.now()}`;
    console.log(`🚗 Starting ride logging: ${rideId}\n`);

    // Validate required data
    if (!rideData.pickup || !rideData.dropoff) {
      throw new Error("Pickup and dropoff locations are required");
    }

    // Log pickup location
    console.log("📍 Step 1: Logging pickup location...");
    await logLocation(deviceDidName, {
      ...rideData.pickup,
      type: "pickup",
      rideId,
    });
    console.log("");

    // Log route points (if provided)
    if (rideData.routePoints && rideData.routePoints.length > 0) {
      console.log(`📍 Step 2: Logging ${rideData.routePoints.length} route points...`);
      for (let i = 0; i < rideData.routePoints.length; i++) {
        const point = rideData.routePoints[i];
        await logLocation(deviceDidName, {
          ...point,
          type: "route",
          rideId,
        });
        // Small delay between route points (simulating real-time tracking)
        if (i < rideData.routePoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log("");
    } else {
      console.log("📍 Step 2: No route points provided (skipping)\n");
    }

    // Log dropoff location
    console.log("Step 3: Logging dropoff location...");
    await logLocation(deviceDidName, {
      ...rideData.dropoff,
      type: "dropoff",
      rideId,
    });
    console.log("");

    console.log(`✅ Ride ${rideId} logged successfully!`);
    return rideId;
  } catch (error) {
    console.error(" Error logging ride:", error);
    throw error;
  }
}

/**
 * Get device DID name from database
 * @param {string} deviceId - Device ID or "active" to get active device
 * @returns {string} Device DID name
 */
async function getDeviceDidName(deviceId) {
  try {
    // If "active" is passed, get active device for the driver
    if (deviceId === "active") {
      const driver = await getDriverByAddress(SUBSTRATE_ADDRESS);
      if (!driver) {
        throw new Error("Driver not found. Please register a device first.");
      }
      
      let activeDevice = await getActiveDeviceByDriverId(driver.id);
      
      // If no active device, get the first device and set it as active
      if (!activeDevice) {
        const { getDevicesByDriverId } = await import("../supabase_database/src/db/device.js");
        const devices = await getDevicesByDriverId(driver.id);
        
        if (devices.length === 0) {
          throw new Error("No devices found. Please register a device first.");
        }
        
        // Set first device as active
        const { setDeviceActive } = await import("../supabase_database/src/db/device.js");
        await setDeviceActive(devices[0].device_id);
        activeDevice = devices[0];
        console.log(`⚠️  No active device found. Setting first device as active.`);
      }
      
      return activeDevice.did_name;
    }

    // Otherwise, get device by ID
    const device = await getDeviceById(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    return device.did_name;
  } catch (error) {
    console.error("Error getting device:", error);
    throw error;
  }
}

// Main function for CLI usage
async function main() {
  try {
    // Get device DID name (from command line arg or use active device)
    const deviceIdArg = process.argv[2] || "active";
    const deviceDidName = await getDeviceDidName(deviceIdArg);
    
    console.log(`📱 Using device: ${deviceDidName}\n`);

    // Example ride data (in production, this would come from GPS or user input)
    const exampleRide = {
      pickup: {
        latitude: 40.7128,  // New York City
        longitude: -74.0060,
        timestamp: new Date().toISOString(),
        accuracy: 10, // meters
      },
      dropoff: {
        latitude: 40.7589,  // Times Square
        longitude: -73.9851,
        timestamp: new Date().toISOString(),
        accuracy: 10,
      },
      routePoints: [
        { 
          latitude: 40.7200, 
          longitude: -74.0050, 
          timestamp: new Date().toISOString(),
          accuracy: 10,
        },
        { 
          latitude: 40.7300, 
          longitude: -74.0040, 
          timestamp: new Date().toISOString(),
          accuracy: 10,
        },
        { 
          latitude: 40.7400, 
          longitude: -74.0030, 
          timestamp: new Date().toISOString(),
          accuracy: 10,
        },
      ],
    };

    console.log("🚗 Logging example ride...\n");
    const rideId = await logRide(deviceDidName, exampleRide);
    console.log(`\n🎉 Ride logged successfully!`);
    console.log(`   Ride ID: ${rideId}`);
    console.log(`   Device: ${deviceDidName}`);
    
  } catch (error) {
    console.error("❌ Failed to log ride:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('log-ride.js')) {
  main().catch(console.error);
}

export { logLocation, logRide, getDeviceDidName };