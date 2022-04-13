pragma circom 2.0.0;

// Massively borrowed from tornado cash: https://github.com/tornadocash/tornado-core/tree/master/circuits
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";

// Computes MiMC([left, right])
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = MiMCSponge(2, 220, 1);
    hasher.ins[0] <== left;
    hasher.ins[1] <== right;
    hasher.k <== 0;
    hash <== hasher.outs[0];
}

// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}

// Verifies that merkle proof is correct for given merkle root and a leaf
// pathIndices input is an array of 0/1 selectors telling whether given pathElement is on the left or right side of merkle path
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = HashLeftRight();
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root === hashers[levels - 1].hash;
}

// computes Pedersen(address)
template CommitmentHasher() {
    signal input address;
    signal output commitment;

    component commitmentHasher = Pedersen(160);
    component addressBits = Num2Bits(160);
    addressBits.in <== address;
    for (var i = 0; i < 160; i++) {
        commitmentHasher.in[i] <== addressBits.out[i];
    }

    commitment <== commitmentHasher.out[0];
}

// Verifies that address is included in the merkle tree of the whitelist
template Whitelist(levels) {
    signal input root; // public
    signal input address; // public

    signal input pathElements[levels]; // private
    signal input pathIndices[levels]; // private

    component hasher = CommitmentHasher();
    hasher.address <== address;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
}

component main {public [root, address]} = Whitelist(5); // This value corresponds to width of tree (2^x)