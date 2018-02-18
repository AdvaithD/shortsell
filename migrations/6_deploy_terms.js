module.exports = (deployer, network, accounts) => {
    const ShortTermsContract = artifacts.require("ShortTermsContract");
    const DAI = artifacts.require("DAI");
    const DebtRegistry = artifacts.require("DebtRegistry");
    const Collateralized = artifacts.require("Collateralized");

    // Deploy terms
    deployer.deploy(ShortTermsContract).then(async () => {
        // Deploy DAI for collateral
        await deployer.deploy(DAI, accounts[0], 1000 * Math.pow(10, 18));
        // Deploy collateral
        await deployer.deploy(Collateralized, DebtRegistry.address);
    });
};