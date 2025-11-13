## What I am Doing with peaq

### Overview

I am using peaq as the foundation layer that proves real-world ride events actually happened by creating a decentralized identity (DID) for each driver's smartphone and logging verifiable GPS location data throughout every ride.

### How It Works

**Driver Registration:**

- When a driver signs up, their phone gets registered as a unique "device" on the peaq network
- Each phone receives its own blockchain identity (DID)

**During Each Ride:**

- The app automatically sends timestamped GPS coordinates to peaq's storage:
  - Pickup location
  - Route tracking (every 30-60 seconds)
  - Dropoff location
- Creates an immutable, tamper-proof record of the journey

### Three Critical Purposes of "Proof-of-Ride" Data

1. **Dispute Resolution**

   - Resolves disagreements between riders and drivers about what happened during the ride

2. **Reputation Building**

   - Builds reputation scores for drivers based on completed rides

3. **Payment Trigger** (Most Important)
   - Sends an ISMP message to Phala Network saying "this ride is complete and verified"
   - Triggers the release of escrowed USDT payment from Asset Hub to the driver

### Key Insight

Essentially, peaq acts as the trusted oracle that confirms physical-world events (rides) to the rest of the decentralized system without requiring any central authority like Uber to verify what happened.
