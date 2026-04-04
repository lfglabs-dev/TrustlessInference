require("@nomicfoundation/hardhat-toolbox");

/** @type {import("hardhat/config").HardhatUserConfig} */
const config = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
    scripts: "./scripts",
  },
  networks: {
    coston2: {
      url: "https://coston2-api.flare.network/ext/C/rpc",
      chainId: 114,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

module.exports = config;
