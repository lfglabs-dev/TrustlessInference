import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy ModelRegistry
  const ModelRegistry = await ethers.getContractFactory("ModelRegistry");
  const registry = await ModelRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("ModelRegistry deployed to:", registryAddr);

  // Register models
  const claudeHash = ethers.keccak256(ethers.toUtf8Bytes("anthropic/claude-opus-4.6"));
  const geminiHash = ethers.keccak256(ethers.toUtf8Bytes("google/gemini-2.5-pro"));

  await registry.registerModel("anthropic/claude-opus-4.6", claudeHash);
  console.log("Registered anthropic/claude-opus-4.6");

  await registry.registerModel("google/gemini-2.5-pro", geminiHash);
  console.log("Registered google/gemini-2.5-pro");

  // Deploy PaymentGateway
  // USDT0 on Coston2 — use a placeholder address; replace with actual USDT0 address on Coston2
  const USDT0_ADDRESS = process.env.USDT0_ADDRESS || "0x0000000000000000000000000000000000000000";
  const PaymentGateway = await ethers.getContractFactory("PaymentGateway");
  const gateway = await PaymentGateway.deploy(USDT0_ADDRESS);
  await gateway.waitForDeployment();
  const gatewayAddr = await gateway.getAddress();
  console.log("PaymentGateway deployed to:", gatewayAddr);

  console.log("\n--- Deployed Addresses ---");
  console.log(`MODEL_REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`PAYMENT_GATEWAY_ADDRESS=${gatewayAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
