const {
  keepTokenAddress,
  nuCypherTokenAddress,
  keepTokenStakingAddress,
  nuCypherStakingEscrowAddress,
  keepRegistryAddress,
  keepTokenGrantAddress,
} = require("./constants.js")
const {
  to1e18,
  impersonateAccount,
} = require("../helpers/contract-test-helpers")

async function initContracts() {
  const deployer = await ethers.getSigner(0)

  const keepToken = await resolveKeepToken()
  const nuCypherToken = await resolveNuCypherToken()
  const keepTokenStaking = await resolveKeepTokenStaking()
  const nuCypherStakingEscrow = await resolveNuCypherStakingEscrow()
  const keepRegistry = await resolveKeepRegistry()
  const keepTokenGrant = await resolveKeepTokenGrant()

  const tToken = await deployTToken(to1e18(1000000))

  const keepVendingMachine = await deployVendingMachine(
    keepToken,
    tToken,
    to1e18(1000000),
    to1e18(500000)
  )

  const nuCypherVendingMachine = await deployVendingMachine(
    nuCypherToken,
    tToken,
    to1e18(1000000),
    to1e18(500000)
  )

  const keepStake = await deployKeepStake(keepTokenStaking)

  const tokenStaking = await deployTokenStaking(
    tToken,
    keepTokenStaking,
    nuCypherStakingEscrow,
    keepVendingMachine,
    nuCypherVendingMachine,
    keepStake
  )

  // Token staking must be approved in the Keep registry in order
  // to work with Keep authorizations.
  await keepRegistry
    .connect(
      await impersonateAccount(
        await keepRegistry.registryKeeper(),
        deployer,
        "5"
      )
    )
    .approveOperatorContract(tokenStaking.address)

  return {
    keepToken: keepToken,
    keepTokenGrant: keepTokenGrant,
    keepTokenStaking: keepTokenStaking,
    tokenStaking: tokenStaking,
  }
}

async function resolveKeepToken() {
  return await ethers.getContractAt("IKeepToken", keepTokenAddress)
}

async function resolveNuCypherToken() {
  return await ethers.getContractAt("IERC20", nuCypherTokenAddress)
}

async function resolveKeepTokenStaking() {
  return await ethers.getContractAt(
    "ITestKeepTokenStaking",
    keepTokenStakingAddress
  )
}

async function resolveNuCypherStakingEscrow() {
  return await ethers.getContractAt(
    "INuCypherStakingEscrow",
    nuCypherStakingEscrowAddress
  )
}

async function resolveKeepRegistry() {
  return await ethers.getContractAt("IKeepRegistry", keepRegistryAddress)
}

async function resolveKeepTokenGrant() {
  return await ethers.getContractAt("IKeepTokenGrant", keepTokenGrantAddress)
}

async function deployTToken() {
  const TToken = await ethers.getContractFactory("T")
  const tToken = await TToken.deploy()

  await tToken.deployed()

  return tToken
}

async function deployVendingMachine(
  wrappedToken,
  tToken,
  wrappedTokenAllocation,
  tTokenAllocation
) {
  const deployer = await ethers.getSigner(0)
  await tToken.mint(deployer.address, tTokenAllocation)

  const VendingMachine = await ethers.getContractFactory("VendingMachine")
  const vendingMachine = await VendingMachine.deploy(
    wrappedToken.address,
    tToken.address,
    wrappedTokenAllocation,
    tTokenAllocation
  )

  await vendingMachine.deployed()

  await tToken.transfer(vendingMachine.address, tTokenAllocation)

  return vendingMachine
}

async function deployKeepStake(keepTokenStaking) {
  const KeepStake = await ethers.getContractFactory("KeepStake")
  const keepStake = await KeepStake.deploy(keepTokenStaking.address)

  await keepStake.deployed()

  return keepStake
}

async function deployTokenStaking(
  tToken,
  keepTokenStaking,
  nuCypherStakingEscrow,
  keepVendingMachine,
  nuCypherVendingMachine,
  keepStake
) {
  const TokenStaking = await ethers.getContractFactory("TokenStaking")
  const tokenStaking = await TokenStaking.deploy(
    tToken.address,
    keepTokenStaking.address,
    nuCypherStakingEscrow.address,
    keepVendingMachine.address,
    nuCypherVendingMachine.address,
    keepStake.address
  )

  await tokenStaking.deployed()

  return tokenStaking
}

module.exports.initContracts = initContracts