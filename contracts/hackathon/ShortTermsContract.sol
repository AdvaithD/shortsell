pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "../DebtRegistry.sol";
import "../TermsContract.sol";

contract ShortTermsContract is TermsContract {
    using SafeMath for uint;

    mapping (bytes32 => uint) valueRepaid;

    // Contracts
    DebtRegistry debtRegistry;
    address repaymentToken;
    address repaymentRouter;

    // Terms
    address public SHORTED_TOKEN; // Augur REP
    uint256 public TERM_LENGTH = 1 years;
    uint256 public PRINCIPAL = 10 * 10**18; // 10 REP
    uint256 public INTEREST_RATE_IN_BASIS_POINTS = 1000; // 10%
    uint256 public BASIS_POINTS = 10000;

    function ShortTermsContract(
        address _debtRegistry,
        address _repaymentToken,
        address _repaymentRouter
    )
        public
    {
        debtRegistry = DebtRegistry(_debtRegistry);

        repaymentToken = _repaymentToken;
        repaymentRouter = _repaymentRouter;
    }

     /// When called, the registerRepayment function records the debtor's
     ///  repayment, as well as any auxiliary metadata needed by the contract
     ///  to determine ex post facto the value repaid (e.g. current USD
     ///  exchange rate)
     /// @param  agreementId bytes32. The agreement id (issuance hash) of the debt agreement to which this pertains.
     /// @param  payer address. The address of the payer.
     /// @param  beneficiary address. The address of the payment's beneficiary.
     /// @param  unitsOfRepayment uint. The units-of-value repaid in the transaction.
     /// @param  tokenAddress address. The address of the token with which the repayment transaction was executed.
    function registerRepayment(
        bytes32 agreementId,
        address payer,
        address beneficiary,
        uint256 unitsOfRepayment,
        address tokenAddress
    ) public returns (bool _success) {
        if (msg.sender != repaymentRouter) {
            return false;
        }

        if (tokenAddress == SHORTED_TOKEN) {
            valueRepaid[agreementId] = valueRepaid[agreementId].add(unitsOfRepayment);
            return true;
        }

        return false;

        // Silence compiler warnings.
        payer; beneficiary;
    }

     /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
     ///  Note this is not a constant function -- this value can vary on basis of any number of
     ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
     /// @param  agreementId bytes32. The agreement id (issuance hash) of the debt agreement to which this pertains.
     /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
     /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(
        bytes32 agreementId,
        uint256 timestamp
    ) public view returns (uint256) {
        uint issuanceBlockTimestamp = debtRegistry.getIssuanceBlockTimestamp(agreementId);
        if (issuanceBlockTimestamp + TERM_LENGTH < block.timestamp) {
            return 0;
        }
        return PRINCIPAL + PRINCIPAL * INTEREST_RATE_IN_BASIS_POINTS / BASIS_POINTS;

        // Silence compiler warnings.
        timestamp;
    }

     /// Returns the cumulative units-of-value repaid by the point at which this method is called.
     /// @param  agreementId bytes32. The agreement id (issuance hash) of the debt agreement to which this pertains.
     /// @return uint256 The cumulative units-of-value repaid up until now.
    function getValueRepaidToDate(
        bytes32 agreementId
    ) public view returns (uint256) {
        return valueRepaid[agreementId];
    }

}
