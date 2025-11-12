import { describe, it, expect, beforeAll } from "vitest";

const TEST_URL = "http://127.0.0.1:8090"; // Local test server

describe("DeRide Location Matcher Tests", () => {
  const ENCRYPTION_KEY = "test-secret-key-2024";
  
  const encryptLocation = (location: any) => {
    // Simple base64 encoding for testing
    return Buffer.from(JSON.stringify(location)).toString("base64");
  };

  it("should update driver location", async () => {
    const response = await fetch(`${TEST_URL}/driver/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: "driver_001",
        peaqDID: "did:peaq:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        encryptedLocation: encryptLocation({
          latitude: -1.2921,
          longitude: 36.8219,
          timestamp: Date.now(),
        }),
        vehicleType: "sedan",
        available: true,
      }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should match rider with nearby driver", async () => {
    // First, add a driver
    await fetch(`${TEST_URL}/driver/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: "driver_002",
        encryptedLocation: encryptLocation({
          latitude: -1.2921,
          longitude: 36.8219,
          timestamp: Date.now(),
        }),
        available: true,
      }),
    });

    // Request ride
    const response = await fetch(`${TEST_URL}/rider/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riderId: "rider_001",
        encryptedLocation: encryptLocation({
          latitude: -1.2925,
          longitude: 36.8225,
          timestamp: Date.now(),
        }),
        maxDistance: 5000,
        encryptionKey: ENCRYPTION_KEY,
      }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.match).toBeDefined();
    expect(data.match.rideId).toBeDefined();
  });
});