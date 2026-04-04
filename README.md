# Verifiable AI Inference with On-Chain Proof on Flare

> "If a provider sells you Opus but serves you Sonnet, you have cryptographic proof of fraud — stored permanently on-chain."

## The Problem

Users of AI inference APIs have **no way to verify** which model actually served their request. You pay for GPT-4 but might get GPT-3.5. You pay for Claude Opus but might get Sonnet. Billing is opaque, and there's no auditability.

## The Solution — Three Pillars

### 1. Model Registry (On-Chain)

Every model is registered on Flare with its cryptographic identity — a keccak256 hash of the model name/weights. Anyone can query the registry to verify which models are authorized.

```
ModelRegistry (Flare Coston2)
├── "anthropic/claude-opus-4.6" → 0x00482d...
└── "google/gemini-2.5-flash"   → 0x9a3f1e...
```

### 2. Inference Gateway (On-Chain)

Users deposit USDT into a smart contract. After each inference, the TEE server submits an ECDSA-signed proof on-chain. The contract **verifies the signature**, **stores the proof permanently**, and **deducts the inference cost** — all in a single atomic transaction.

```
User deposits 10 USDT  →  InferenceGateway.deposit()
User sends prompt       →  TEE runs inference
TEE submits proof       →  InferenceGateway.submitProof()
                            ├── ecrecover(sig) == teeAddress?  ✓ verified
                            ├── store proof on-chain            ✓ permanent
                            └── deduct 0.10 USDT                ✓ auditable
```

### 3. TEE Attestation (Cryptographic Proof)

Every inference response includes an ECDSA-signed attestation with an on-chain transaction hash:

```json
{
  "tee_platform": "flare-fce-mock-v1",
  "enclave_hash": "0xadf9bc...",
  "input_hash": "0x7a04e5...",
  "output_hash": "0xd67050...",
  "model_hash": "0x00482d...",
  "timestamp": 1775292781,
  "signature": "0x5192618927e6...",
  "tx_hash": "0x85968169609456e5..."
}
```

The `model_hash` is cross-referenced against the on-chain Model Registry. The `tx_hash` links to the permanent on-chain proof that anyone can verify on the block explorer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLARE COSTON2                                │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  ModelRegistry   │  │  InferenceGateway                        │  │
│  │                  │  │                                          │  │
│  │  registerModel() │  │  deposit(amount)                         │  │
│  │  getModelHash()  │  │  submitProof(user, hashes, sig)          │  │
│  │                  │  │    ├── ecrecover → must match teeAddress  │  │
│  │  Maps model name │  │    ├── balances[user] -= inferenceCost   │  │
│  │  to weight hash  │  │    └── proofs[id] = {user, hashes, ts}  │  │
│  │                  │  │  getUserProofCount(user)                  │  │
│  │                  │  │  getUserProofAt(user, index)              │  │
│  └─────────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         ▲                          ▲                    ▲
         │ verify model             │ submit proof       │ deposit USDT
         │                          │                    │
┌────────┴──────────────────────────┴────────┐    ┌──────┴──────────┐
│           TEE SERVER (Next.js)              │    │    USER WALLET   │
│                                             │    │    (Reown AppKit)│
│  /api/chat                                  │    │                  │
│    1. Check balance ≥ cost                  │    │  approve()       │
│    2. Verify model hash on-chain            │    │  deposit()       │
│    3. Stream inference (OpenRouter)         │    │                  │
│    4. Sign attestation (ECDSA)              │    └──────────────────┘
│    5. Submit proof on-chain (submitProof)   │
│    6. Return response + tx_hash             │
│                                             │
│  TEE_SIGNER_PRIVATE_KEY                     │
│  (hardware-backed in production)            │
└─────────────────────────────────────────────┘
```

---

## End-to-End Flow

```
  USER                       TEE SERVER                    FLARE COSTON2
   │                              │                              │
   │                              │                              │
   │  ┌─── DEPOSIT (one-time) ────┼──────────────────────────────┤
   │  │                           │                              │
   │  │  1. approve(gateway, amt)─┼──────────────────────────────>│ USDT0
   │  │  2. deposit(amt) ────────-┼──────────────────────────────>│ InferenceGateway
   │  │                           │                      balances[user] += amt
   │  │                           │                              │
   │  └──────────────────────────-┼──────────────────────────────┤
   │                              │                              │
   │  ┌─── INFERENCE (per msg) ───┤                              │
   │  │                           │                              │
   │  │  3. POST /api/chat ──────>│                              │
   │  │     {prompt, model, addr} │                              │
   │  │                           │  4. checkBalance(user) ─────>│ balances[user]
   │  │                           │  <── balance ≥ cost? ────────│
   │  │                           │                              │
   │  │                           │  5. getModelHash(model) ────>│ ModelRegistry
   │  │                           │  <── hash matches? ─────────│
   │  │                           │                              │
   │  │                           │  6. Stream inference          │
   │  │  <── streaming tokens ────│     (OpenRouter API)         │
   │  │                           │                              │
   │  │                           │  7. Sign attestation (ECDSA) │
   │  │                           │     sig = sign(user +        │
   │  │                           │       promptHash +           │
   │  │                           │       responseHash +         │
   │  │                           │       modelHash + timestamp) │
   │  │                           │                              │
   │  │                           │  8. submitProof(sig) ───────>│ InferenceGateway
   │  │                           │                      ecrecover(sig) == teeAddress ✓
   │  │                           │                      store proof on-chain ✓
   │  │                           │                      balances[user] -= 0.10 USDT ✓
   │  │                           │  <── tx_hash ───────────────│
   │  │                           │                              │
   │  │  <── attestation + ──────│                              │
   │  │      tx_hash              │                              │
   │  │                           │                              │
   │  └──────────────────────────-┤                              │
   │                              │                              │
   │  9. Click tx_hash link       │                              │
   │     → Coston2 Explorer       │                              │
   │     → Proof visible on-chain │                              │
```

---

## How the TEE Protects Both Sides

```
┌─────────────────────────────────────────────────────────────┐
│                    TEE ENCLAVE (Hardware-Sealed)             │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Encrypted    │    │  Inference   │    │  Attestation │  │
│  │  Model Weights│───>│  Runtime     │───>│  Generator   │  │
│  │  (decrypted   │    │  (auditable  │    │  (ECDSA sign │  │
│  │   inside only)│    │   code)      │    │   + on-chain │  │
│  │              │    │              │    │   submission) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ^                    |                    |          │
└─────────|────────────────────|────────────────────|──────────┘
          |                    |                    |
    CAN'T EXTRACT        CAN'T TAMPER         CAN'T FORGE
    (hardware seal)      (hash changes)       (ECDSA + on-chain)
          |                    |                    |
          v                    v                    v
   ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
   │ Model        │    │ Server       │    │ User / On-Chain  │
   │ Provider     │    │ Operator     │    │ Verifier         │
   │ (Anthropic)  │    │ (can't see   │    │ (checks proof    │
   │ weights safe │    │  weights or  │    │  on block        │
   │              │    │  lie about   │    │  explorer)       │
   │              │    │  the model)  │    │                  │
   └─────────────┘    └──────────────┘    └──────────────────┘
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

  submitProof(model_hash=0xAAA)      submitProof(model_hash=0xBBB)
  Contract: 0xAAA == 0xAAA MATCH     Contract: 0xBBB != 0xAAA MISMATCH
  Proof stored on-chain              FRAUD DETECTED — provable on-chain
```

---

## On-Chain Proof Verification

Every inference creates a permanent, queryable proof on Flare:

```
Proof #1 (on-chain)
├── user:         0x88Ff...
├── promptHash:   0x7a04e5...  ← keccak256 of "What is Flare?"
├── responseHash: 0xd67050...  ← keccak256 of the AI response
├── modelHash:    0x00482d...  ← matches ModelRegistry entry
├── timestamp:    1775292781
└── tx_hash:      0x859681...  ← viewable on Coston2 Explorer
```

Anyone can verify:
1. **Was the right model used?** Compare `modelHash` against `ModelRegistry.getModelHash()`
2. **Was the response tampered with?** Recompute `keccak256(response)` and compare to `responseHash`
3. **Was the proof signed by the TEE?** The contract already verified this via `ecrecover` — if the tx succeeded, the signature is valid

---

## Key Questions Answered

### Why can't the server operator fake the attestation?

In production, the attestation is signed by the **CPU hardware** (Intel TDX via GCP Confidential Space), not by software. The server operator controls the machine but NOT the TEE's signing keys. For this demo, we simulate the TEE signer with a server-side keypair, but the on-chain verification (ECDSA ecrecover) is real.

### Why can't the server operator steal the model weights?

The weights are decrypted ONLY inside the enclave's protected memory region. The host OS, hypervisor, and server operator cannot read enclave memory — this is enforced by the CPU hardware.

### What's mocked vs. real in this demo?

| Component | Status |
|-----------|--------|
| ModelRegistry contract | **Real** — deployed on Flare Coston2 |
| InferenceGateway contract | **Real** — deposits, proof verification, balance deduction |
| ECDSA signature verification | **Real** — contract verifies via ecrecover |
| On-chain proof storage | **Real** — every inference creates a permanent proof |
| Balance deduction | **Real** — 0.10 USDT deducted per inference |
| USDT token integration | **Real** — ERC20 approve + deposit pattern |
| TEE hardware enclave | **Mocked** — inference runs server-side, not in GCP Confidential Space |
| TEE signer key | **Mocked** — uses server-side keypair instead of vTPM hardware key |

In production, the server runs inside **GCP Confidential Space** (Intel TDX) using Flare's **flare-ai-kit** SDK. The vTPM provides hardware-backed attestation tokens that replace the server-side ECDSA signer. The on-chain contract and verification logic remain identical.

---

## Deployed Contracts (Coston2)

| Contract | Address |
|----------|---------|
| ModelRegistry | `0xa0c9336d297417555A58a5a93ec2764171d1050B` |
| InferenceGateway | `0xb35588BC2B06bd8d1064EfCA224b8fdf3b928AFb` |
| USDT0 | `0xC1A5B41512496B80903D1f32d6dEa3a73212E71F` |

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

# Run E2E on-chain test (16 tests)
bun run test:e2e:coston2
```

### Environment Variables

```bash
OPENROUTER_API_KEY=             # AI inference via OpenRouter
DEPLOYER_PRIVATE_KEY=           # Contract deployment
TEE_SIGNER_PRIVATE_KEY=         # TEE server wallet (signs attestations + submits proofs)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_MODEL_REGISTRY_ADDRESS=
NEXT_PUBLIC_INFERENCE_GATEWAY_ADDRESS=
NEXT_PUBLIC_USDT0_ADDRESS=
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Blockchain:** Solidity 0.8.24, Hardhat, wagmi, viem
- **Wallet:** Reown AppKit (WalletConnect)
- **AI:** OpenRouter (Claude Opus 4.6, Gemini 2.5 Flash)
- **Network:** Flare Coston2 Testnet (Chain 114)
- **TEE (Production):** GCP Confidential Space, Intel TDX, flare-ai-kit
- **Secrets:** dotenvx encrypted environment
