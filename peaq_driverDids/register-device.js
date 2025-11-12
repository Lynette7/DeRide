import { Sdk } from "@peaq-network/sdk";
import crypto from "node:crypto";
// import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
// import { Keyring } from "@polkadot/keyring";
import dotenv from "dotenv";
import { createDevice } from "../supabase_database/src/db/device.js";
import { getOrCreateDriver } from "../supabase_database/src/db/drivers.js";
dotenv.config();
const WSS_BASE_URL = "wss://peaq-agung.api.onfinality.io/public-ws";
const SUBSTRATE_SEED = process.env["SUBSTRATE_SEED"];
const SUBSTRATE_ADDRESS = process.env["SUBSTRATE_ADDRESS"];
// Generate a unique identifier for a device
// This is for simulation only
function generateDeviceId() {
  return crypto.randomBytes(16).toString("hex");
}

// Create an sdk instance for the driver
// This is how they'll pay gas fee to be able to register a  device like a phone for example
async function createDriverSdkInstance() {
  try {
    const driverSdk = await Sdk.createInstance({
      baseUrl: WSS_BASE_URL,
      chainType: Sdk.ChainType.SUBSTRATE,
      seed: SUBSTRATE_SEED,
    });

    return driverSdk;
  } catch (error) {
    console.error("Error creating SDK instance", error);
    throw error;
  }
}
async function registerDevice() {
  try {
    //check if the driver is already registered/create them if they don't exist
    const driver = await getOrCreateDriver(SUBSTRATE_ADDRESS);
    console.log(`✅ Driver ID: ${driver.id}\n`);

   
    //Get sdk
    const driverSdk = await createDriverSdkInstance();
    const deviceId = generateDeviceId();
    const didName = `did:peaq:device:${deviceId}`;
    const customDocumentFields = {
      services: [
        {
          id: "#device",
          type: "smartphoneDevice",
          serviceEndpoint: "deride://device",
        },
      ],
    };
    const result = await driverSdk.did.create({
      name: didName,
      customDocumentFields: customDocumentFields,
    });
    
    console.log(`✅ Device DID created: ${didName}`);
    
    // Read the device immediately to get the full document with address
    const readResult = await driverSdk.did.read({
      name: didName,
      address: SUBSTRATE_ADDRESS,
    });
    
    // Extract blockchain address from the read result
    const blockchainAddress = readResult.document?.controller?.replace('did:peaq:', '') 
      || readResult.document?.id?.replace('did:peaq:', '') 
      || null;
    
    console.log(`   Blockchain address: ${blockchainAddress || 'N/A'}\n`);
    
    const deviceData = {
      device_id: deviceId,
      driver_id: driver.id,
      did_name: didName,
      blockchain_address: blockchainAddress,
      device_type: "smartphone",
      metadata: {
        registered_via: "register-device.js",
        timestamp: new Date().toISOString(),
      },
    };
    const savedDevice = await createDevice(deviceData);
    console.log(`✅ Device saved to database (ID: ${savedDevice.id})\n`);
    return {
      deviceId,
      didName,
      driver,
      device: savedDevice,
      blockchainResult: readResult,
      blockchainAddress: blockchainAddress, 
    };
  } catch (error) {
    console.error("Error registering device", error);
    throw error;
  }
}
async function readDevice(deviceId) {
  try {
    const sdk = await createDriverSdkInstance();
    const result = await sdk.did.read({
      name: `did:peaq:device:${deviceId}`,
      address: SUBSTRATE_ADDRESS,
    });
    return result;
  } catch {
    console.error("Error reading device", error);
    throw error;
  }
}

// Register a device DID on the peaq network
async function main() {
 try{
  const registration = await registerDevice();
  console.log("🎉 Device registration complete!\n");
  console.log("Summary:");
  console.log(`   Device ID: ${registration.deviceId}`);
  console.log(`   DID Name: ${registration.didName}`);
  console.log(`   Driver ID: ${registration.driver.id}`);
  console.log(`   Blockchain Address: ${registration.blockchainAddress || 'N/A'}`);
  console.log(`   Database Device ID: ${registration.device.id}`);
  console.log("\n Verifying device on blockchain...");
  const readResults = await readDevice(registration.deviceId);
  console.log("✅ Device verified on peaq network");
  console.log("   Blockchain data:", readResults);

 }catch(error){
  console.error("Error registering device", error);
  throw error;
 }
}

main().catch(console.error);
