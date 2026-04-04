const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Pre-flight: check C2FLR balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error("Deployer has zero C2FLR — fund via https://faucet.flare.network/coston2");
  }
  console.log("C2FLR balance:", hre.ethers.formatEther(balance));

  // Validate USDT0 address
  const USDT0_ADDRESS = process.env.USDT0_ADDRESS;
  if (!USDT0_ADDRESS || USDT0_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("USDT0_ADDRESS env var must be set to a valid address");
  }
  console.log("USDT0 address:", USDT0_ADDRESS);

  // Deploy ModelRegistry
  const ModelRegistry = await hre.ethers.getContractFactory("ModelRegistry");
  const registry = await ModelRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("ModelRegistry deployed to:", registryAddr);

  // Register models
  const claudeHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("anthropic/claude-opus-4.6"));
  const geminiHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("google/gemini-2.5-flash"));

  const tx1 = await registry.registerModel("anthropic/claude-opus-4.6", claudeHash);
  await tx1.wait();
  console.log("Registered anthropic/claude-opus-4.6");

  const tx2 = await registry.registerModel("google/gemini-2.5-flash", geminiHash);
  await tx2.wait();
  console.log("Registered google/gemini-2.5-flash");

  // Derive TEE signer address from private key
  const TEE_SIGNER_PRIVATE_KEY = process.env.TEE_SIGNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!TEE_SIGNER_PRIVATE_KEY) {
    throw new Error("TEE_SIGNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY must be set");
  }
  const teeWallet = new hre.ethers.Wallet(TEE_SIGNER_PRIVATE_KEY);
  const teeSignerAddress = teeWallet.address;
  console.log("TEE signer address:", teeSignerAddress);

  // Deploy InferenceGateway
  const INFERENCE_COST = 100_000; // 0.10 USDT (6 decimals)
  const InferenceGateway = await hre.ethers.getContractFactory("InferenceGateway");
  const gateway = await InferenceGateway.deploy(USDT0_ADDRESS, teeSignerAddress, INFERENCE_COST);
  await gateway.waitForDeployment();
  const gatewayAddr = await gateway.getAddress();
  console.log("InferenceGateway deployed to:", gatewayAddr);

  console.log("\n--- Deployed Addresses ---");
  console.log(`MODEL_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`INFERENCE_GATEWAY_ADDRESS=${gatewayAddr}`);
  console.log(`USDT0_ADDRESS=${USDT0_ADDRESS}`);
  console.log(`TEE_SIGNER_ADDRESS=${teeSignerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
