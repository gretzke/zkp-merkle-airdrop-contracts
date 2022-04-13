// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../Whitelist.sol";

/// @dev doSomething function is used to output gas usage in the gas reporter
contract MockContract is Whitelist {
    constructor(IPlonkVerifier _verifier, bytes32 _root) Whitelist(_verifier, _root) {}

    function doSomething(bytes calldata proof) public {
        require(isWhitelisted(proof, msg.sender), "not whitelisted");
    }
}
