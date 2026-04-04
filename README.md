# Verifiable AI Inference with On-Chain Payment on Flare

> "If a provider sells you Opus but serves you Sonnet, you have cryptographic proof of fraud."

## The Problem

Users of AI inference APIs have **no way to verify** which model actually served their request. You pay for GPT-4 but might get GPT-3.5. You pay for Claude Opus but might get Sonnet. Billing is opaque, and there's no auditability.

## The Solution — Three Pillars

### 1. Model Registry (On-Chain)

Every model the marketplace offers is registered on Flare with its cryptographic identity — a hash of the model weights. Anyone can query the registry to verify which models are authorized and what their weight hashes are.

```
ModelRegistry (Flare Coston2)
├── "anthropic/claude-opus-4.6" → 0x00482d...
└── "google/gemini-2.5-flash"   → 0x9a3f1e...
```

### 2. Payment Gateway (On-Chain)

Users deposit USDT into a smart contract. The server deducts per-inference charges. All balances and charges emit on-chain events — **fully auditable, no hidden fees, no billing disputes**.

```
User deposits 10 USDT → PaymentGateway.deposit()
Server charges 0.10 USDT → PaymentGateway.deductBalance()
User can verify every charge on-chain ✓
```

### 3. TEE Attestation (Cryptographic Proof)

Every inference response includes an attestation from a Trusted Execution Environment:

```json
{
  "tee_platform": "flare-fce-v1",
  "enclave_hash": "0xadf9bc...",
  "input_hash": "0x7a04e5...",
  "output_hash": "0xd67050...",
  "model_hash": "0x00482d...",
  "timestamp": 1775292781,
  "signature": "0xbf4d4a..."
}
```

The `model_hash` can be cross-referenced against the on-chain Model Registry to prove which model was actually used.

---

## How the TEE Protects Both Sides

```
┌─────────────────────────────────────────────────────────────┐
│                    TEE ENCLAVE (Hardware-Sealed)             │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Encrypted    │    │  Inference   │    │  Attestation │  │
│  │  Model Weights│───>│  Runtime     │───>│  Generator   │  │
│  │  (decrypted   │    │  (auditable  │    │  (signed by  │  │
│  │   inside only)│    │   code)      │    │   hardware)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ^                    |                    |          │
└─────────|────────────────────|────────────────────|──────────┘
          |                    |                    |
    CAN'T EXTRACT        CAN'T TAMPER         CAN'T FORGE
    (hardware seal)      (hash changes)       (HW signature)
          |                    |                    |
          v                    v                    v
   ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
   │ Model        │    │ Server       │    │ User / On-Chain  │
   │ Provider     │    │ Operator     │    │ Verifier         │
   │ (Anthropic)  │    │ (can't see   │    │ (checks hash     │
   │ weights safe │    │  weights or  │    │  against Model   │
   │              │    │  lie about   │    │  Registry)       │
   │              │    │  the model)  │    │                  │
   └─────────────┘    └──────────────┘    └──────────────────┘
```

**For model providers (e.g., Anthropic):** Their proprietary weights are encrypted and only decrypted inside the TEE's protected memory. The server operator physically cannot extract them — this is a hardware guarantee, not a software promise.

**For users:** The TEE produces a hardware-signed attestation proving which model weights were loaded and what output was generated. This can be verified against the on-chain registry.

**For the server operator:** They provide the infrastructure but cannot tamper with the inference or forge attestations. The CPU's signing keys are burned into silicon.

---

## End-to-End Flow

```
  USER                    SERVER (TEE)              BLOCKCHAIN
   |                          |                         |
   |  1. Deposit USDT --------+------------------------>| PaymentGateway
   |                          |                         |   .deposit()
   |  2. Send prompt -------->|                         |
   |                          |  3. Verify model hash ->| ModelRegistry
   |                          |  <- hash matches -------|   .getModelHash()
   |                          |                         |
   |                          |  4. Run inference       |
   |                          |     inside TEE enclave  |
   |                          |     (weights sealed)    |
   |                          |                         |
   |                          |  5. Generate attestation|
   |                          |     {input_hash,        |
   |                          |      output_hash,       |
   |                          |      model_hash,        |
   |                          |      HW_signature}      |
   |                          |                         |
   |  <-- 6. Response + -----|                         |
   |       attestation        |                         |
   |                          |  7. Charge user ------->| PaymentGateway
   |                          |                         |   .deductBalance()
   |                          |                         |
   |  8. Verify attestation   |                         |
   |     - model_hash matches |                         |
   |       on-chain registry? +------------------------>| ModelRegistry
   |     - HW signature valid?|                         |
   |     VERIFIED             |                         |
```

---

## Why the Provider Can't Cheat

```
  HONEST PROVIDER                    CHEATING PROVIDER
  ===============                    =================

  Sells: Opus                        Sells: Opus
  Runs:  Opus                        Runs:  Sonnet

  TEE loads Opus weights             TEE loads Sonnet weights
  weight_hash = 0xAAA...             weight_hash = 0xBBB...

  On-chain registry:                 On-chain registry:
  "opus" -> 0xAAA...                 "opus" -> 0xAAA...

  Attestation model_hash:            Attestation model_hash:
  0xAAA...                           0xBBB...

  0xAAA == 0xAAA  MATCH              0xBBB != 0xAAA  MISMATCH
  User got what they paid for        FRAUD DETECTED
```

The TEE **cannot lie** about which weights it loaded. If different weights are loaded, the hash changes, and the mismatch with the on-chain registry is cryptographic proof of fraud.

---

## Key Questions Answered

### Why can't the server operator fake the attestation?

The attestation is signed by the **CPU hardware** (Intel SGX/TDX), not by software. The server operator controls the machine but NOT the TEE's signing keys — those are burned into the silicon by Intel. Forging an attestation would require breaking the CPU's hardware security.

### Why can't the server operator steal the model weights?

The weights are decrypted ONLY inside the enclave's protected memory region. The host OS, hypervisor, and server operator cannot read enclave memory — this is enforced by the CPU hardware, not by software.

### Don't the model weights need to be open source for this to work?

**No.** That's the beauty of TEEs. The model provider (e.g., Anthropic) encrypts their weights with a key only the TEE can access. The weights are decrypted inside the sealed enclave, used for inference, and never exposed. The provider publishes only the **weight hash** — enough for users to verify model identity, but revealing nothing about the weights themselves.

### What's mocked vs. real in this demo?

| Component | Status |
|-----------|--------|
| ModelRegistry contract | **Real** — deployed on Flare Coston2 |
| PaymentGateway contract | **Real** — USDT deposits and charges work |
| USDT token integration | **Real** — ERC20 approve + deposit pattern |
| TEE attestation structure | **Real** — correct format and field semantics |
| TEE hardware signature | **Mocked** — uses keccak256 instead of CPU signing |
| Enclave execution | **Mocked** — inference runs server-side, not in TEE |

In production, Flare's FCE (Confidential Execution) replaces the mock attestation with real hardware-backed attestation.

---

## Deployed Contracts (Coston2)

| Contract | Address |
|----------|---------|
| ModelRegistry | `0xEA7a4A308cb29E5b0De901138d79afB3951EB3db` |
| PaymentGateway | `0x0598D7d4c9D847B99eC1321B002B4cFfb1BEB130` |
| USDT | `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` |

Explorer: https://coston2-explorer.flare.network

---

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Deploy contracts to Coston2
bun run deploy:coston2

# Run E2E on-chain test
bun run test:e2e:coston2
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Blockchain:** Solidity 0.8.24, Hardhat, wagmi, viem
- **Wallet:** Reown AppKit (WalletConnect)
- **AI:** OpenRouter (Claude Opus, Gemini Flash)
- **Network:** Flare Coston2 Testnet (Chain 114)
- **Secrets:** dotenvx encrypted environment
