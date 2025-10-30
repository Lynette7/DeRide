import { Sdk } from "@peaq-network/sdk";
import crypto from "node:crypto";
import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";
import dotenv from "dotenv";

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
    //Get sdk
    const driverSdk = await createDriverSdkInstance();
    const deviceId = generateDeviceId();
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
      name: `did:peaq:device:${deviceId}`,
      customDocumentFields: customDocumentFields,
    });
    return { result, deviceId };
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
  const { result, deviceId } = await registerDevice();
  console.log("Device registered", result);
  const readResults = await readDevice(deviceId);
  console.log("Device read", readResults);
}

main().catch(console.error);
