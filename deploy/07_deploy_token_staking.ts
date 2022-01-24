import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const { ethers, upgrades } = require("hardhat");

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, helpers} = hre
  const { log } = deployments

  // TODO: is this the right way to check whether to do fresh proxy deploy or upgrade?
  const OldTokenStaking = await deployments.getOrNull("TokenStaking")
  if (
    OldTokenStaking &&
    helpers.address.isValid(OldTokenStaking.address)
  ) {
    // TODO: should the upgrade pathway be in a different script? Untested pathway
    // Perform upgrade of proxied TokenStaking
    log(`upgrading "TokenStaking" deployed implementation, current address ${OldTokenStaking.address}`)
    const TokenStaking = await ethers.getContractFactory("TokenStaking")
    const tokenStaking = await upgrades.upgradeProxy(OldTokenStaking.address, TokenStaking)
    await tokenStaking.deployed();
    log(`upgraded "TokenStaking" proxy at ${tokenStaking.address}`)

    await deployments.save("TokenStaking", tokenStaking)
  } else {
    // freshly deploy proxied TokenStaking
    const T = await deployments.get("T")
    const KeepTokenStaking = await deployments.get("KeepTokenStaking")
    const NuCypherStakingEscrow = await deployments.get("NuCypherStakingEscrow")
    const VendingMachineKeep = await deployments.get("VendingMachineKeep")
    const VendingMachineNuCypher = await deployments.get("VendingMachineNuCypher")
    const KeepStake = await deployments.get("KeepStake")

    const tokenStakingConstructorArgs = [
      T.address,
      KeepTokenStaking.address,
      NuCypherStakingEscrow.address,
      VendingMachineKeep.address,
      VendingMachineNuCypher.address,
      KeepStake.address,
    ]

    const tokenStakingInitializerArgs = []

    const TokenStaking = await ethers.getContractFactory("TokenStaking")
    const tokenStaking = await upgrades.deployProxy(
      TokenStaking,
      tokenStakingInitializerArgs,
      {
        constructorArgs: tokenStakingConstructorArgs,
      }
    )
    await tokenStaking.deployed();
    log(`"TokenStaking" deployed at proxy ${tokenStaking.address}`)

    await deployments.save("TokenStaking", tokenStaking)
  }
}

export default func

func.tags = ["TokenStaking"]
func.dependencies = [
  "T",
  "KeepTokenStaking",
  "NuCypherStakingEscrow",
  "VendingMachineKeep",
  "VendingMachineNuCypher",
  "KeepStake",
  "MintT",
]
