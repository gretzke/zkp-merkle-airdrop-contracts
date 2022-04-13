// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint256[] memory pubSignals) external view returns (bool);
}

/// @title An example whitelist contract utilizing a zk-proof of MerkleTree inclusion.
contract Whitelist is Ownable {
    IPlonkVerifier verifier;
    bytes32 public root;

    constructor(IPlonkVerifier _verifier, bytes32 _root) {
        verifier = _verifier;
        root = _root;
    }

    /// @notice verifies the proof, returns true if account is included in the whitelist
    function isWhitelisted(bytes calldata proof, address account) public view returns (bool) {
        uint256[] memory pubSignals = new uint256[](2);
        pubSignals[0] = uint256(root);
        pubSignals[1] = uint256(uint160(account));
        return verifier.verifyProof(proof, pubSignals);
    }

    /// @notice Allows the owner to update the root of the merkle tree.
    /// @dev Function can be removed to make the merkle tree immutable. If removed, the ownable extension can also be removed for gas savings.
    function updateRoot(bytes32 newRoot) public onlyOwner {
        root = newRoot;
    }
}
