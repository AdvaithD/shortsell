pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract DAI is StandardToken {

    function DAI() {
        totalSupply_ = 1000000 * 10**18;
        balances[msg.sender] = totalSupply_;
    }

}