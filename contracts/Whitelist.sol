// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

/// @title An example whitelist contract utilizing a zk-proof of MerkleTree inclusion.
contract Whitelist is Ownable {
    IPlonkVerifier verifier;
    bytes32 public root;

    uint256 constant SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    constructor(
        IPlonkVerifier _verifier,
        bytes32 _root
    ) {
        verifier = _verifier;
        root = _root;
    }

    /// @notice verifies the proof, collects the airdrop if valid, and prevents this proof from working again.
    function isWhitelisted(bytes calldata proof) public view returns (bool) {
        uint[] memory pubSignals = new uint[](3);
        pubSignals[0] = uint256(root);
        return verifier.verifyProof(proof, pubSignals);
    }

    /// @notice Allows the owner to update the root of the merkle tree.
    /// @dev Function can be removed to make the merkle tree immutable. If removed, the ownable extension can also be removed for gas savings.
    function updateRoot(bytes32 newRoot) public onlyOwner {
        root = newRoot;
    }
}
