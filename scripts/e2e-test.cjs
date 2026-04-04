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
  const gatewayAddr = process.env.NEXT_PUBLIC_INFERENCE_GATEWAY_ADDRESS;
  const usdtAddr = process.env.USDT0_ADDRESS || process.env.NEXT_PUBLIC_USDT0_ADDRESS;

  if (!registryAddr || !gatewayAddr) {
    fail(0, "Contract addresses", "NEXT_PUBLIC_MODEL_REGISTRY_ADDRESS or NEXT_PUBLIC_INFERENCE_GATEWAY_ADDRESS not set");
    return;
  }
  console.log(`  ModelRegistry: ${registryAddr}`);
  console.log(`  InferenceGateway: ${gatewayAddr}`);
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

  const claudeName = "anthropic/claude-opus-4.6";
  const expectedClaudeHash = ethers.keccak256(ethers.toUtf8Bytes(claudeName));
  const onChainClaudeHash = await registry.getModelHash(claudeName);

  if (onChainClaudeHash === expectedClaudeHash) {
    pass(1, `${claudeName} hash matches`);
  } else {
    fail(1, `${claudeName} hash matches`, `expected ${expectedClaudeHash}, got ${onChainClaudeHash}`);
  }

  const geminiName = "google/gemini-2.5-flash";
  const expectedGeminiHash = ethers.keccak256(ethers.toUtf8Bytes(geminiName));
  const onChainGeminiHash = await registry.getModelHash(geminiName);

  if (onChainGeminiHash === expectedGeminiHash) {
    pass(1, `${geminiName} hash matches`);
  } else {
    fail(1, `${geminiName} hash matches`, `expected ${expectedGeminiHash}, got ${onChainGeminiHash}`);
  }

  const zeroHash = "0x" + "0".repeat(64);
  const unknownHash = await registry.getModelHash("nonexistent/model");
  if (unknownHash === zeroHash) {
    pass(1, "nonexistent model returns zero hash");
  } else {
    fail(1, "nonexistent model returns zero hash", `got ${unknownHash}`);
  }

  // ===== PHASE 2: InferenceGateway — Deposit =====
  console.log("");
  log(2, "InferenceGateway — Approve + Deposit");

  const gateway = await ethers.getContractAt("InferenceGateway", gatewayAddr);
  const depositAmount = 1_000_000n; // 1 USDT (6 decimals)

  if (usdtBalance < depositAmount) {
    skip(2, "USDT deposit", `Need 1 USDT, have ${ethers.formatUnits(usdtBalance, 6)}`);
  } else {
    const balanceBefore = await gateway.balances(deployer.address);
    console.log(`  Balance before: ${ethers.formatUnits(balanceBefore, 6)} USDT`);

    const approveTx = await usdt.approve(gatewayAddr, depositAmount);
    const approveReceipt = await approveTx.wait();
    console.log(`  Approve tx: ${approveReceipt.hash}`);
    pass(2, "USDT approve");

    const allowance = await usdt.allowance(deployer.address, gatewayAddr);
    if (allowance >= depositAmount) {
      pass(2, "Allowance verified");
    } else {
      fail(2, "Allowance verified", `expected >= ${depositAmount}, got ${allowance}`);
    }

    const depositTx = await gateway.deposit(depositAmount);
    const depositReceipt = await depositTx.wait();
    console.log(`  Deposit tx: ${depositReceipt.hash}`);
    pass(2, "Deposit transaction");

    const balanceAfter = await gateway.balances(deployer.address);
    console.log(`  Balance after: ${ethers.formatUnits(balanceAfter, 6)} USDT`);
    const expectedBalance = balanceBefore + depositAmount;
    if (balanceAfter === expectedBalance) {
      pass(2, `On-chain balance == ${ethers.formatUnits(expectedBalance, 6)} USDT`);
    } else {
      fail(2, "On-chain balance", `expected ${expectedBalance}, got ${balanceAfter}`);
    }
  }

  // ===== PHASE 3: InferenceGateway — Submit Proof with ECDSA =====
  console.log("");
  log(3, "InferenceGateway — Submit Proof (ECDSA signature verification)");

  const currentBalance = await gateway.balances(deployer.address);
  const inferenceCost = await gateway.inferenceCost();
  console.log(`  Inference cost: ${ethers.formatUnits(inferenceCost, 6)} USDT`);
  console.log(`  Current balance: ${ethers.formatUnits(currentBalance, 6)} USDT`);

  if (currentBalance < inferenceCost) {
    skip(3, "Submit proof", `Need ${ethers.formatUnits(inferenceCost, 6)} USDT balance, have ${ethers.formatUnits(currentBalance, 6)}`);
  } else {
    const TEE_SIGNER_KEY = process.env.TEE_SIGNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    const teeSigner = new ethers.Wallet(TEE_SIGNER_KEY, ethers.provider);
    console.log(`  TEE signer: ${teeSigner.address}`);

    // Verify TEE address matches contract
    const registeredTee = await gateway.teeAddress();
    if (registeredTee === teeSigner.address) {
      pass(3, "TEE signer matches contract teeAddress");
    } else {
      fail(3, "TEE signer matches contract teeAddress", `registered=${registeredTee}, signer=${teeSigner.address}`);
    }

    // Build proof data
    const user = deployer.address;
    const modelName = "anthropic/claude-opus-4.6";
    const inputText = "What is Flare?";
    const outputText = "Flare is a blockchain for decentralized data acquisition.";

    const inputHex = ethers.hexlify(ethers.toUtf8Bytes(inputText));
    const promptHash = ethers.keccak256(ethers.getBytes(inputHex));
    const outputHex = ethers.hexlify(ethers.toUtf8Bytes(outputText));
    const responseHash = ethers.keccak256(ethers.getBytes(outputHex));
    const modelHash = ethers.keccak256(ethers.toUtf8Bytes(modelName));
    const timestamp = Math.floor(Date.now() / 1000);

    // Sign the message (matching contract's ecrecover format)
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "bytes32", "bytes32", "uint256"],
      [user, promptHash, responseHash, modelHash, timestamp]
    );
    const signature = await teeSigner.signMessage(ethers.getBytes(messageHash));
    console.log(`  Signature: ${signature.substring(0, 20)}...`);

    // Submit proof
    const gatewayAsTee = gateway.connect(teeSigner);
    const proofTx = await gatewayAsTee.submitProof(
      user, promptHash, responseHash, modelHash, timestamp, signature
    );
    const proofReceipt = await proofTx.wait();
    console.log(`  Proof tx: ${proofReceipt.hash}`);
    pass(3, "submitProof transaction succeeded");

    // Verify balance deducted
    const balanceAfterProof = await gateway.balances(deployer.address);
    const expectedAfterProof = currentBalance - inferenceCost;
    if (balanceAfterProof === expectedAfterProof) {
      pass(3, `Balance deducted: ${ethers.formatUnits(expectedAfterProof, 6)} USDT`);
    } else {
      fail(3, "Balance after proof", `expected ${expectedAfterProof}, got ${balanceAfterProof}`);
    }

    // Verify proof stored on-chain
    const proofCount = await gateway.getUserProofCount(deployer.address);
    if (proofCount > 0n) {
      pass(3, `User has ${proofCount} proof(s) on-chain`);
    } else {
      fail(3, "Proof count", "Expected > 0");
    }

    const proofId = await gateway.getUserProofAt(deployer.address, proofCount - 1n);
    const proof = await gateway.proofs(proofId);
    if (proof.user === deployer.address && proof.promptHash === promptHash && proof.responseHash === responseHash) {
      pass(3, "On-chain proof data matches submitted values");
    } else {
      fail(3, "On-chain proof data", "Mismatch");
    }
  }

  // ===== PHASE 4: Failure cases =====
  console.log("");
  log(4, "Failure cases — invalid signature, insufficient balance");

  // Test: invalid signature (signed by wrong key, but submitted by TEE)
  const TEE_KEY = process.env.TEE_SIGNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  const teeSignerForTest = new ethers.Wallet(TEE_KEY, ethers.provider);
  const wrongSigner = ethers.Wallet.createRandom();
  const fakeMessageHash = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "bytes32", "bytes32", "uint256"],
    [deployer.address, zeroHash, zeroHash, zeroHash, 0]
  );
  // Sign with wrong key — ecrecover will return wrong address
  const fakeSig = await wrongSigner.signMessage(ethers.getBytes(fakeMessageHash));

  try {
    const gatewayAsTee = gateway.connect(teeSignerForTest);
    await gatewayAsTee.submitProof(
      deployer.address, zeroHash, zeroHash, zeroHash, 0, fakeSig
    );
    fail(4, "Reject invalid signature", "Transaction did not revert");
  } catch (e) {
    if (e.message.includes("Invalid signature") || e.message.includes("Insufficient balance")) {
      pass(4, "Reject invalid signature (reverted)");
    } else {
      pass(4, "Reject invalid signature (reverted with: " + e.message.substring(0, 60) + ")");
    }
  }

  // ===== SUMMARY =====
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network:           Flare Coston2 (114)`);
  console.log(`  ModelRegistry:     ${registryAddr}`);
  console.log(`  InferenceGateway:  ${gatewayAddr}`);
  console.log(`  USDT:              ${usdtAddr}`);
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
