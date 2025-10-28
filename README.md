# DeRide: A DePIN Protocol for Ride-Sharing

A decentralized, privacy-preserving, and peer-to-peer ride-sharing network.

## 1. Project Vision

**DeRide** is a **Decentralized Physical Infrastructure Network (DePIN)** protocol that directly connects drivers and riders without a centralized intermediary like Uber or Lyft.

## 2. Core Technology Stack

* **DePIN & Device Identity:** **peaq Network**
  * Manages DIDs (Decentralized IDs) for devices (e.g., driver's smartphone, car's IoT).
  * Used to log verifiable "proof-of-ride" data (e.g., location, time) from the driver's device.
* **User Identity:** **Kilt Protocol**
  * Manages DIDs for the users (drivers and riders).
  * Used to issue and verify credentials (e.g., "Verified Driver's License") to build trust.
* **Confidential Compute (Privacy):** **Phala Network (Phat Contracts)**
  * Runs the matching engine inside a **Trusted Execution Environment (TEE)**.
  * This is where encrypted rider and driver locations are sent. The TEE matches them without ever revealing the raw data to anyone, including DeRide.
  * *Alternatives to research:* Integritee, Acurast.
* **Payment & Escrow:** **Polkadot Asset Hub**
  * Used as the escrow for the system.
  * Payments are made using **USDT (Tether)**.
  * The escrow "contract" is actually a TEE-controlled account on Asset Hub.
* **Interoperability (Messaging):** **ISMP (Inter-Chain Messaging Protocol)**
  * The protocol that connects the chains.
  * We use **Hyperbridge** to send messages between peaq (where the ride is confirmed) and Phala (where the payment logic lives).

## 3. Hackathon MVP Goals (What We Must Build)

We cannot build everything. The core focus must be the **backend interoperability**.

1. **The basic flow:** Demonstrate the full, undisputed flow: `peaq` (event) $\rightarrow$ `ISMP` (message) $\rightarrow$ `Phala` (logic) $\rightarrow$ `Asset Hub` (payment).
2. **Simple UI:** A basic web interface (not a mobile app) with buttons like "Request Ride," "Accept Ride," and "End Ride" to trigger the backend functions.
3. **Scripts:** Create scripts to:
    * Register a device DID on `peaq`.
    * Deploy a basic Phat Contract on `Phala` that can hold a secret key.
    * Simulate sending a USDT transfer on `Asset Hub`.
4. **Integration:** The main goal is to successfully send an ISMP message from the peaq testnet to the Phala testnet that triggers an on-chain action (the payment).

## 4. Core Research Topics & Technologies

We need to find tutorials, SDKs, and testnets for each of these components *immediately*.

### **Category 1: DePIN & Identity**

* **peaq Network:**
  * **SDK:** How to use `peaq-pallet-did` to create and manage device DIDs.
  * **Data:** How to use `peaq-storage` to post verifiable data (like GPS coordinates) and link it to a device DID.
  * **Docs:** Explore the official peaq DePIN documentation.
* **Kilt Protocol:**
  * **SDK:** How to use the Kilt SDK (`Kilt-JS`) to create a user's DID.
  * **Credentials:** What is the full lifecycle of a Verifiable Credential (VC)? (Issue, Present, Verify). How can we *attest* that a driver is licensed?

### **Category 2: Confidential Compute (The TEEs)**

* **Phala Network (Primary Target):**
  * **Phat Contracts:** How do they work? How are they different from normal smart contracts?
  * **Secret Management:** How does a Phat Contract securely generate or receive a private key (for the Asset Hub wallet) so *only* the TEE can access it?
  * **Outbound Transactions:** How does a Phat Contract sign and *dispatch* an external transaction (i.e., the payment on Asset Hub)?
* **Integritee (Alternative):**
  * **Model:** How does its "Trusted Execution Sidechain" model compare to Phat Contracts?
  * **Workflow:** What is the development SDK and deployment process?
* **Acurast (Alternative):**
  * **Model:** How does its "decentralized computation delegation" work? Is this suitable for a persistent matching service, or more for one-off data requests?

### **Category 3: Interoperability**

* **ISMP (Inter-Chain Messaging Protocol):**
  * **Concept:** Understand the core protocol: `post`, `dispatch`, `get`, and `request/response` models.
  * **SDK:** How to use the ISMP SDK to *send* a message from peaq and *receive* it on Phala.
  * **Testnets:** We must find a tutorial for sending a simple message between two testnets using Hyperbridge. This is the highest technical risk.

### **Category 4: Payments**

* **Polkadot Asset Hub:**
  * **Interaction:** This is *not* a smart contract platform. All interaction is via standard transactions (like `assets.transfer`).
  * **Testnet:** What is the `AssetId` for **USDT** and which testnet shhould we use?
  * **Funding:** How do we get testnet USDT for our escrow and user accounts?
* **Transaction Logic:**
  * How do we use `polkadot-js` (or a Rust equivalent) *inside* the Phat Contract to construct, sign, and send the final payment transaction?
