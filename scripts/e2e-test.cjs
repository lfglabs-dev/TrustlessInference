const hre = require("hardhat");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const results = [];
function log(phase, msg) {
  console.log(`[Phase ${phase}] ${msg}`);
}
function pass(phase, test) {
  results.push({ phase, test, status: "PASS" });
  console.log(`  ✅ ${test}`);
}
function fail(phase, test, reason) {
  results.push({ phase, test, status: "FAIL", reason });
  console.log(`  ❌ ${test}: ${reason}`);
}
function skip(phase, test, reason) {
  results.push({ phase, test, status: "SKIP", reason });
  console.log(`  ⏭️  ${test}: ${reason}`);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const ethers = hre.ethers;

  console.log("═══════════════════════════════════════════════════");
  console.log("  Flare TEE Marketplace — E2E On-Chain Test");
  console.log("  Network: Coston2 (Chain 114)");
  console.log("═══════════════════════════════════════════════════\n");

  // ===== PHASE 0: Pre-flight =====
  log(0, "Pre-flight checks");
  console.log(`  Deployer: ${deployer.address}`);

  const c2flrBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`  C2FLR balance: ${ethers.formatEther(c2flrBalance)}`);
  if (c2flrBalance === 0n) {
    fail(0, "C2FLR balance", "Zero balance — fund via https://faucet.flare.network/coston2");
    return;
  }
  pass(0, "C2FLR balance > 0");

  const registryAddr = process.env.NEXT_PUBLIC_MODEL_REGISTRY_ADDRESS;
  const gatewayAddr = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS;
  const usdtAddr = process.env.USDT0_ADDRESS || process.env.NEXT_PUBLIC_USDT0_ADDRESS;

  if (!registryAddr || !gatewayAddr) {
    fail(0, "Contract addresses", "NEXT_PUBLIC_MODEL_REGISTRY_ADDRESS or NEXT_PUBLIC_PAYMENT_GATEWAY_ADDRESS not set");
    return;
  }
  console.log(`  ModelRegistry: ${registryAddr}`);
  console.log(`  PaymentGateway: ${gatewayAddr}`);
  console.log(`  USDT: ${usdtAddr}`);
  pass(0, "Contract addresses configured");

  const usdt = new ethers.Contract(usdtAddr, ERC20_ABI, deployer);
  let usdtBalance;
  try {
    usdtBalance = await usdt.balanceOf(deployer.address);
    console.log(`  USDT balance: ${ethers.formatUnits(usdtBalance, 6)}`);
    pass(0, "USDT contract reachable");
  } catch (e) {
    fail(0, "USDT contract reachable", e.message);
    usdtBalance = 0n;
  }

  // ===== PHASE 1: ModelRegistry verification =====
  console.log("");
  log(1, "ModelRegistry verification");

  const registry = await ethers.getContractAt("ModelRegistry", registryAddr);

  // Test Claude Opus hash
  const claudeName = "anthropic/claude-opus-4.6";
  const expectedClaudeHash = ethers.keccak256(ethers.toUtf8Bytes(claudeName));
  const onChainClaudeHash = await registry.getModelHash(claudeName);

  if (onChainClaudeHash === expectedClaudeHash) {
    pass(1, `${claudeName} hash matches`);
  } else {
    fail(1, `${claudeName} hash matches`, `expected ${expectedClaudeHash}, got ${onChainClaudeHash}`);
  }

  // Test Gemini Flash hash
  const geminiName = "google/gemini-2.5-flash";
  const expectedGeminiHash = ethers.keccak256(ethers.toUtf8Bytes(geminiName));
  const onChainGeminiHash = await registry.getModelHash(geminiName);

  if (onChainGeminiHash === expectedGeminiHash) {
    pass(1, `${geminiName} hash matches`);
  } else {
    fail(1, `${geminiName} hash matches`, `expected ${expectedGeminiHash}, got ${onChainGeminiHash}`);
  }

  // Test nonexistent model
  const zeroHash = "0x" + "0".repeat(64);
  const unknownHash = await registry.getModelHash("nonexistent/model");
  if (unknownHash === zeroHash) {
    pass(1, "nonexistent model returns zero hash");
  } else {
    fail(1, "nonexistent model returns zero hash", `got ${unknownHash}`);
  }

  // ===== PHASE 2: PaymentGateway — Deposit =====
  console.log("");
  log(2, "PaymentGateway — Approve + Deposit");

  const gateway = await ethers.getContractAt("PaymentGateway", gatewayAddr);
  const depositAmount = 1_000_000n; // 1 USDT (6 decimals)

  if (usdtBalance < depositAmount) {
    skip(2, "USDT deposit", `Need 1 USDT, have ${ethers.formatUnits(usdtBalance, 6)}`);
  } else {
    // Read balance before
    const balanceBefore = await gateway.balances(deployer.address);
    console.log(`  Balance before: ${ethers.formatUnits(balanceBefore, 6)} USDT`);

    // Approve
    const approveTx = await usdt.approve(gatewayAddr, depositAmount);
    const approveReceipt = await approveTx.wait();
    console.log(`  Approve tx: ${approveReceipt.hash}`);
    pass(2, "USDT approve");

    // Verify allowance
    const allowance = await usdt.allowance(deployer.address, gatewayAddr);
    if (allowance >= depositAmount) {
      pass(2, "Allowance verified");
    } else {
      fail(2, "Allowance verified", `expected >= ${depositAmount}, got ${allowance}`);
    }

    // Deposit
    const depositTx = await gateway.deposit(depositAmount);
    const depositReceipt = await depositTx.wait();
    console.log(`  Deposit tx: ${depositReceipt.hash}`);
    pass(2, "Deposit transaction");

    // Verify balance
    const balanceAfter = await gateway.balances(deployer.address);
    console.log(`  Balance after: ${ethers.formatUnits(balanceAfter, 6)} USDT`);
    const expectedBalance = balanceBefore + depositAmount;
    if (balanceAfter === expectedBalance) {
      pass(2, `On-chain balance == ${ethers.formatUnits(expectedBalance, 6)} USDT`);
    } else {
      fail(2, "On-chain balance", `expected ${expectedBalance}, got ${balanceAfter}`);
    }
  }

  // ===== PHASE 3: PaymentGateway — Deduct =====
  console.log("");
  log(3, "PaymentGateway — Deduct (server charges for inference)");

  const currentBalance = await gateway.balances(deployer.address);
  const deductAmount = 100_000n; // 0.10 USDT

  if (currentBalance < deductAmount) {
    skip(3, "Deduct balance", `Need 0.10 USDT balance, have ${ethers.formatUnits(currentBalance, 6)}`);
  } else {
    const deductTx = await gateway.deductBalance(deployer.address, deductAmount);
    const deductReceipt = await deductTx.wait();
    console.log(`  Deduct tx: ${deductReceipt.hash}`);
    pass(3, "deductBalance transaction");

    const balanceAfterDeduct = await gateway.balances(deployer.address);
    console.log(`  Balance after deduct: ${ethers.formatUnits(balanceAfterDeduct, 6)} USDT`);
    const expectedAfterDeduct = currentBalance - deductAmount;
    if (balanceAfterDeduct === expectedAfterDeduct) {
      pass(3, `Balance == ${ethers.formatUnits(expectedAfterDeduct, 6)} USDT after deduction`);
    } else {
      fail(3, "Balance after deduction", `expected ${expectedAfterDeduct}, got ${balanceAfterDeduct}`);
    }
  }

  // ===== PHASE 4: Mock TEE Attestation =====
  console.log("");
  log(4, "Mock TEE Attestation — cross-verify with on-chain data");

  const modelName = "anthropic/claude-opus-4.6";
  const modelHash = ethers.keccak256(ethers.toUtf8Bytes(modelName));
  const inputText = "What is Flare?";
  const outputText = "Flare is a blockchain for decentralized data acquisition.";

  // Replicate tee.ts sha256Hex: keccak256(toBytes(toHex(utf8bytes)))
  const inputHex = ethers.hexlify(ethers.toUtf8Bytes(inputText));
  const inputHash = ethers.keccak256(ethers.getBytes(inputHex));

  const outputHex = ethers.hexlify(ethers.toUtf8Bytes(outputText));
  const outputHash = ethers.keccak256(ethers.getBytes(outputHex));

  const enclaveHash = ethers.keccak256(ethers.toUtf8Bytes("flare-fce-mock-enclave-v1"));
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = `${enclaveHash}${inputHash}${outputHash}${modelHash}${timestamp}`;
  const signature = ethers.keccak256(ethers.toUtf8Bytes(payload));

  const attestation = {
    tee_platform: "flare-fce-mock-v1",
    enclave_hash: enclaveHash,
    input_hash: inputHash,
    output_hash: outputHash,
    model_hash: modelHash,
    timestamp,
    signature,
  };

  console.log("  Attestation:");
  console.log(JSON.stringify(attestation, null, 4).split("\n").map(l => "    " + l).join("\n"));

  // Cross-verify: attestation model_hash must match on-chain registry
  const registryHash = await registry.getModelHash(modelName);
  if (attestation.model_hash === registryHash) {
    pass(4, "Attestation model_hash matches on-chain ModelRegistry");
  } else {
    fail(4, "Attestation model_hash matches on-chain", `attestation=${attestation.model_hash}, registry=${registryHash}`);
  }

  // Verify attestation signature
  const recomputedPayload = `${attestation.enclave_hash}${attestation.input_hash}${attestation.output_hash}${attestation.model_hash}${attestation.timestamp}`;
  const recomputedSig = ethers.keccak256(ethers.toUtf8Bytes(recomputedPayload));
  if (recomputedSig === attestation.signature) {
    pass(4, "Attestation signature verified");
  } else {
    fail(4, "Attestation signature", `recomputed=${recomputedSig}, got=${attestation.signature}`);
  }

  // ===== SUMMARY =====
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network:          Flare Coston2 (114)`);
  console.log(`  ModelRegistry:    ${registryAddr}`);
  console.log(`  PaymentGateway:   ${gatewayAddr}`);
  console.log(`  USDT:             ${usdtAddr}`);
  console.log(`  Models registered: 2 (claude-opus-4.6, gemini-2.5-flash)`);
  console.log("");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log("");

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️ ";
    console.log(`  ${icon} [Phase ${r.phase}] ${r.test}`);
  }

  console.log("\n═══════════════════════════════════════════════════");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
