import { ethers } from "hardhat";

async function main() {
  const entryPointAddress = process.env.ENTRYPOINT_ADDRESS;
  if (!entryPointAddress) {
    throw new Error("ENTRYPOINT_ADDRESS env var missing");
  }

  console.log("Deploying EmailAAFactory using entry point:", entryPointAddress);
  const factory = await ethers.deployContract("EmailAAFactory", [entryPointAddress]);
  await factory.waitForDeployment();

  console.log("Factory deployed to:", await factory.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
