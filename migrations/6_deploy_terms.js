module.exports = (deployer, network, accounts) => {
    const ShortTermsContract = artifacts.require("ShortTermsContract");
    const Collateralized = artifacts.require("Collateralized");
    const DAI = artifacts.require("DAI");
    // Deploy terms
    return deployer.deploy(ShortTermsContract).then(async () => {
        // Deploy collateral
        deployer.deploy(Collateralized);
        // Deploy DAI for collateral
        deployer.deploy(DAI);
    });
};
