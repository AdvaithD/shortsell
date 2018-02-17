pragma solidity 0.4.18;

import "../DebtRegistry.sol";
import "../TermsContract.sol";
import "zeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract KittyCollateralizer {
    DebtRegistry debtRegistry;
    ERC721 kittyContract;

    struct CollateralAgreement {
        bytes32 debtAgreementId;
        address owner;
        uint lockupPeriodEnd;
    }

    mapping (uint => CollateralAgreement) kittyToCollateralAgreement;

    function KittyCollateralizer(
        address debtRegistryAddress,
        address cryptoKittiesContractAddress
    ) public
    {
        debtRegistry = DebtRegistry(debtRegistryAddress);
        kittyContract = ERC721(cryptoKittiesContractAddress);
    }

    function collateralize(bytes32 debtAgreementId, uint kittyId, uint lockupPeriodEnd) {
        require(kittyToCollateralAgreement[kittyId].owner == address(0));
        require(lockupPeriodEnd > block.number);

        // TODO:
        // kittyContract.transferFrom(msg.sender, this, kittyId);

        kittyToCollateralAgreement[kittyId] = CollateralAgreement({
            debtAgreementId: debtAgreementId,
            owner: msg.sender,
            lockupPeriodEnd: lockupPeriodEnd
        });
    }

    function withdrawCollateral(uint kittyId) {
        CollateralAgreement collateralAgreement = kittyToCollateralAgreement[kittyId];

        require(collateralAgreement.debtAgreementId != bytes32(0));

        var (termsContractAddress, termsContractParameters) =
            debtRegistry.getTerms(collateralAgreement.debtAgreementId);

        TermsContract termsContract = TermsContract(termsContract);

        // uint expectedValueRepaid = termsContract.getExpectedRepaymentValue(collateralAgreement.debtAgreementId,
        //     termsContractParameters, block.number);
        // uint actualValueRepaid = termsContract.getValueRepaid(collateralAgreement.debtAgreementId);
    }

    function releaseKitty(address to, uint kittyId) internal {
        kittyContract.transfer(to, kittyId);
        kittyToCollateralAgreement[kittyId] = CollateralAgreement({
            debtAgreementId: bytes32(0),
            owner: address(0),
            lockupPeriodEnd: 0
        });
    }
}

