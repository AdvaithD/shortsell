module.exports = (deployer, network, accounts) => {
    const KittyCollateralizer = artifacts.require("KittyCollateralizer");
    return deployer.deploy(KittyCollateralizer);
};
