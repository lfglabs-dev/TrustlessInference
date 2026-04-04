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

  // Deploy PaymentGateway
  const PaymentGateway = await hre.ethers.getContractFactory("PaymentGateway");
  const gateway = await PaymentGateway.deploy(USDT0_ADDRESS);
  await gateway.waitForDeployment();
  const gatewayAddr = await gateway.getAddress();
  console.log("PaymentGateway deployed to:", gatewayAddr);

  console.log("\n--- Deployed Addresses ---");
  console.log(`MODEL_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`PAYMENT_GATEWAY_ADDRESS=${gatewayAddr}`);
  console.log(`USDT0_ADDRESS=${USDT0_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
