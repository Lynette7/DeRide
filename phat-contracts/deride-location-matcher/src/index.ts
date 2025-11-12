import { Hono } from "hono/tiny";
import GeoHash from "geohash";
import CryptoJS from "crypto-js";

// Types
interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface RiderRequest {
  riderId: string;
  encryptedLocation: string;
  maxDistance: number; // in meters
  timestamp: number;
}

interface DriverLocation {
  driverId: string;
  peaqDID: string;
  encryptedLocation: string;
  available: boolean;
  vehicleType: string;
  rating: number;
  lastUpdate: number;
}

interface RideMatch {
  rideId: string;
  riderId: string;
  driverId: string;
  estimatedArrival: number; // minutes
  distance: number; // meters
  price: number; // USDT (6 decimals)
  matchedAt: number;
}

interface RideCompletionProof {
  rideId: string;
  riderId: string;
  driverId: string;
  startLocation: Location;
  endLocation: Location;
  startTime: number;
  endTime: number;
  distance: number;
  signature: string;
  timestamp: number;
}

// In-memory storage
let activeDrivers: Map<string, DriverLocation> = new Map();
let activeRides: Map<string, RideMatch> = new Map();
let rideHistory: Map<string, Location[]> = new Map();

const app = new Hono();

// Utility Functions
function decryptLocation(encryptedData: string, key: string): Location {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Invalid encrypted location");
  }
}

function calculateDistance(loc1: Location, loc2: Location): number {
  // Haversine formula
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (loc1.latitude * Math.PI) / 180;
  const lat2Rad = (loc2.latitude * Math.PI) / 180;
  const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculatePrice(distanceMeters: number): number {
  // Base fare: 2 USDT + 0.5 USDT per km
  const baseFare = 2000000; // 2 USDT (6 decimals)
  const perKmRate = 500000; // 0.5 USDT
  const distanceKm = distanceMeters / 1000;
  return Math.floor(baseFare + perKmRate * distanceKm);
}

function estimateArrival(distanceMeters: number): number {
  // Assume average speed: 30 km/h in city
  const speedKmh = 30;
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / speedKmh;
  return Math.ceil(hours * 60); // Return minutes
}

function generateRideId(): string {
  return `ride_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function signData(data: any, privateKey: string): string {
  const dataString = JSON.stringify(data);
  const hash = CryptoJS.SHA256(dataString).toString();
  return CryptoJS.HmacSHA256(hash, privateKey).toString();
}

// API Endpoints

// 1. Update Driver Location
app.post("/driver/location", async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, peaqDID, encryptedLocation, vehicleType, available } = body;

    if (!driverId || !encryptedLocation) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const driver: DriverLocation = {
      driverId,
      peaqDID: peaqDID || "",
      encryptedLocation,
      available: available !== false,
      vehicleType: vehicleType || "sedan",
      rating: 4.5, // Hard coded but should fetch from peaq in production
      lastUpdate: Date.now(),
    };

    activeDrivers.set(driverId, driver);

    console.log(`Driver ${driverId} location updated (available: ${available})`);

    return c.json({
      success: true,
      message: "Location updated",
      driverId,
    });
  } catch (error) {
    console.error("Error updating driver location:", error);
    return c.json({ error: "Failed to update location" }, 500);
  }
});

// 2. Match Rider with Driver
app.post("/rider/match", async (c) => {
  try {
    const body = await c.req.json();
    const { riderId, encryptedLocation, maxDistance, encryptionKey } = body;

    if (!riderId || !encryptedLocation || !encryptionKey) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Decrypt rider location inside TEE (privacy preserved)
    const riderLocation = decryptLocation(encryptedLocation, encryptionKey);
    console.log(`Rider ${riderId} requesting match`);

    // Find nearby available drivers
    const matches: Array<{
      driver: DriverLocation;
      distance: number;
      eta: number;
    }> = [];

    for (const [driverId, driver] of activeDrivers) {
      if (!driver.available) continue;

      // Check if driver location is recent (< 5 minutes)
      if (Date.now() - driver.lastUpdate > 300000) continue;

      // Decrypt driver location inside TEE
      const driverLocation = decryptLocation(
        driver.encryptedLocation,
        encryptionKey
      );

      const distance = calculateDistance(riderLocation, driverLocation);

      if (distance <= (maxDistance || 5000)) {
        matches.push({
          driver,
          distance,
          eta: estimateArrival(distance),
        });
      }
    }

    if (matches.length === 0) {
      return c.json({
        success: false,
        message: "No nearby drivers available",
      });
    }

    // Sort by distance and pick closest
    matches.sort((a, b) => a.distance - b.distance);
    const bestMatch = matches[0];

    // Create ride
    const rideId = generateRideId();
    const price = calculatePrice(bestMatch.distance);

    const rideMatch: RideMatch = {
      rideId,
      riderId,
      driverId: bestMatch.driver.driverId,
      estimatedArrival: bestMatch.eta,
      distance: bestMatch.distance,
      price,
      matchedAt: Date.now(),
    };

    activeRides.set(rideId, rideMatch);

    // Mark driver as unavailable
    const driver = activeDrivers.get(bestMatch.driver.driverId);
    if (driver) {
      driver.available = false;
      activeDrivers.set(bestMatch.driver.driverId, driver);
    }

    // Initialize ride tracking
    rideHistory.set(rideId, [riderLocation]);

    console.log(`Match found: Ride ${rideId}, Driver ${bestMatch.driver.driverId}`);

    // Return match without exposing raw locations
    return c.json({
      success: true,
      match: {
        rideId,
        driverId: bestMatch.driver.driverId,
        driverName: `Driver ${bestMatch.driver.driverId.substring(0, 6)}`,
        vehicleType: bestMatch.driver.vehicleType,
        rating: bestMatch.driver.rating,
        estimatedArrival: bestMatch.eta,
        distance: Math.round(bestMatch.distance),
        price,
        peaqDID: bestMatch.driver.peaqDID,
      },
    });
  } catch (error) {
    console.error("Error matching rider:", error);
    return c.json({ error: "Failed to match rider" }, 500);
  }
});

// 3. Track Ride Progress
app.post("/ride/track", async (c) => {
  try {
    const body = await c.req.json();
    const { rideId, encryptedLocation, encryptionKey } = body;

    if (!rideId || !encryptedLocation) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const ride = activeRides.get(rideId);
    if (!ride) {
      return c.json({ error: "Ride not found" }, 404);
    }

    // Decrypt and store location update
    const location = decryptLocation(encryptedLocation, encryptionKey);
    const history = rideHistory.get(rideId) || [];
    history.push(location);
    rideHistory.set(rideId, history);

    console.log(`Ride ${rideId} location tracked (${history.length} points)`);

    return c.json({
      success: true,
      message: "Location tracked",
      totalPoints: history.length,
    });
  } catch (error) {
    console.error("Error tracking ride:", error);
    return c.json({ error: "Failed to track ride" }, 500);
  }
});

// 4. Complete Ride & Generate Proof
app.post("/ride/complete", async (c) => {
  try {
    const body = await c.req.json();
    const { rideId, endLocation, encryptionKey } = body;

    if (!rideId) {
      return c.json({ error: "Missing rideId" }, 400);
    }

    const ride = activeRides.get(rideId);
    if (!ride) {
      return c.json({ error: "Ride not found" }, 404);
    }

    const history = rideHistory.get(rideId) || [];
    if (history.length === 0) {
      return c.json({ error: "No ride history found" }, 400);
    }

    const startLocation = history[0];
    const finalLocation = endLocation
      ? decryptLocation(endLocation, encryptionKey)
      : history[history.length - 1];

    const totalDistance = calculateDistance(startLocation, finalLocation);
    const endTime = Date.now();

    // Generate cryptographic proof (signed inside TEE)
    const proofData = {
      rideId,
      riderId: ride.riderId,
      driverId: ride.driverId,
      startLocation,
      endLocation: finalLocation,
      startTime: ride.matchedAt,
      endTime,
      distance: totalDistance,
      price: ride.price,
    };

    // Derive secret key from TEE
    const secretKey = "tee_secret_key";
    const signature = signData(proofData, secretKey);

    const proof: RideCompletionProof = {
      ...proofData,
      signature,
      timestamp: Date.now(),
    };

    // Clean up
    activeRides.delete(rideId);
    rideHistory.delete(rideId);

    // Mark driver as available
    const driver = activeDrivers.get(ride.driverId);
    if (driver) {
      driver.available = true;
      activeDrivers.set(ride.driverId, driver);
    }

    console.log(`Ride ${rideId} completed. Proof generated.`);

    return c.json({
      success: true,
      proof: {
        rideId: proof.rideId,
        signature: proof.signature,
        distance: Math.round(totalDistance),
        price: proof.price,
        timestamp: proof.timestamp,
      },
    });
  } catch (error) {
    console.error("Error completing ride:", error);
    return c.json({ error: "Failed to complete ride" }, 500);
  }
});

// 5. Get Active Drivers Count (Privacy-Safe)
app.get("/drivers/count", (c) => {
  const available = Array.from(activeDrivers.values()).filter(
    (d) => d.available
  ).length;

  return c.json({
    total: activeDrivers.size,
    available,
  });
});

// 6. Health Check
app.get("/", (c) => {
  return c.json({
    message: "DeRide Location Matcher - Phala TEE",
    version: "1.0.0",
    timestamp: Date.now(),
  });
});

export default app;