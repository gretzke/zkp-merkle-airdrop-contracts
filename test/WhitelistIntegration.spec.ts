import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { PlonkVerifier, Whitelist } from "../typechain";
import { Contract } from "@ethersproject/contracts";
import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { readFileSync } from "fs";
import { MerkleTree, generateProofCallData, pedersenHashConcat, pedersenHash, toHex } from "../lib";
import { randomBigInt, readMerkleTreeAndSourceFromFile } from "../utils/WhitelistUtils";

let WASM_PATH = "./build/circuit_js/circuit.wasm";
let ZKEY_PATH = "./build/circuit_final.zkey";

let WASM_BUFF = readFileSync(WASM_PATH);
let ZKEY_BUFF = readFileSync(ZKEY_PATH);

describe("Whitelist", async () => {
  // Load existing Merkle Tree from file to speed tests
  let merkleTreeAndSource = readMerkleTreeAndSourceFromFile("./test/temp/mt_8192.csv");
  it("check whether an address is whitelisted", async () => {
    // Deploy contracts
    let hexRoot = toHex(merkleTreeAndSource.merkleTree.root.val);
    let [owner] = await ethers.getSigners();
    let { verifier, whitelist } = await deployContracts(owner, hexRoot);

    let merkleTree = merkleTreeAndSource.merkleTree;

    // Generate proof
    let leafIndex = 7;
    let address = merkleTreeAndSource.includedAddresses[leafIndex];
    let callData = await generateProofCallData(merkleTree, address, WASM_BUFF, ZKEY_BUFF);
    let execute = await whitelist.isWhitelisted(callData);
    expect(execute).to.be.true;
  });

  //   xit("cannot exploit using public inputs larger than the scalar field", async () => {
  //     // Deploy contracts
  //     let hexRoot = toHex(merkleTreeAndSource.merkleTree.root.val);
  //     let [universalOwnerSigner, erc20SupplyHolder, redeemer] = await ethers.getSigners();
  //     let { erc20, verifier, airdrop } = await deployContracts(universalOwnerSigner, erc20SupplyHolder.address, hexRoot);

  //     // Transfer airdroppable tokens to contract
  //     await erc20.connect(erc20SupplyHolder).transfer(airdrop.address, NUM_ERC20_TO_DISTRIBUTE);
  //     let contractBalanceInit: BigNumber = await erc20.balanceOf(airdrop.address);
  //     expect(contractBalanceInit.toNumber()).to.be.eq(NUM_ERC20_TO_DISTRIBUTE);

  //     let merkleTree = merkleTreeAndSource.merkleTree;

  //     // Generate proof
  //     let leafIndex = 7;
  //     let key = merkleTreeAndSource.leafNullifiers[leafIndex];
  //     let secret = merkleTreeAndSource.leafSecrets[leafIndex];
  //     let callData = await generateProofCallData(merkleTree, key, secret, redeemer.address, WASM_BUFF, ZKEY_BUFF);

  //     // Collect
  //     let keyHash = toHex(pedersenHash(key));
  //     let keyHashTwo = toHex(
  //       BigInt(keyHash) + BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617")
  //     );

  //     let execute = await (await airdrop.connect(redeemer).collectAirdrop(callData, keyHash)).wait();
  //     expect(execute.status).to.be.eq(1);
  //     let contractBalanceUpdated: BigNumber = await erc20.balanceOf(airdrop.address);
  //     expect(contractBalanceUpdated.toNumber()).to.be.eq(contractBalanceInit.toNumber() - NUM_ERC20_PER_REDEMPTION);
  //     let redeemerBalance: BigNumber = await erc20.balanceOf(redeemer.address);
  //     expect(redeemerBalance.toNumber()).to.be.eq(NUM_ERC20_PER_REDEMPTION);
  //     await expect(airdrop.connect(redeemer).collectAirdrop(callData, keyHashTwo)).to.be.revertedWith(
  //       "Nullifier is not within the field"
  //     );
  //   });

  //   xit("can be updated", async () => {
  //     let initHexRoot = toHex(merkleTreeAndSource.merkleTree.root.val);

  //     let [_a, _b, _c, _d, _e, _f, _g, universalOwnerSigner, erc20SupplyHolder, redeemer] = await ethers.getSigners();
  //     let { erc20, verifier, airdrop } = await deployContracts(
  //       universalOwnerSigner,
  //       erc20SupplyHolder.address,
  //       initHexRoot
  //     );

  //     // Transfer airdroppable tokens to contract
  //     await erc20.connect(erc20SupplyHolder).transfer(airdrop.address, NUM_ERC20_TO_DISTRIBUTE);
  //     let contractBalanceInit: BigNumber = await erc20.balanceOf(airdrop.address);
  //     expect(contractBalanceInit.toNumber()).to.be.eq(NUM_ERC20_TO_DISTRIBUTE);

  //     // Redeem 1
  //     let merkleTree = merkleTreeAndSource.merkleTree;
  //     let redeemIndex = 222;
  //     let nullifier = merkleTreeAndSource.leafNullifiers[redeemIndex];
  //     let secret = merkleTreeAndSource.leafSecrets[redeemIndex];
  //     let callData = await generateProofCallData(merkleTree, nullifier, secret, redeemer.address, WASM_BUFF, ZKEY_BUFF);
  //     let nullifierHash = toHex(pedersenHash(nullifier));
  //     await expect(airdrop.connect(redeemer).collectAirdrop(callData, nullifierHash));

  //     // Check onlyOwner for addLeaf
  //     await expect(airdrop.connect(redeemer).updateRoot(toHex(randomBigInt(32)))).to.be.revertedWith(
  //       "Ownable: caller is not the owner"
  //     );

  //     // Call addLeaf
  //     let newIndex = 555;
  //     let newNullifier = randomBigInt(31);
  //     let newSecret = randomBigInt(31);
  //     let newCommitment = pedersenHashConcat(newNullifier, newSecret);
  //     let newLeaves = merkleTreeAndSource.merkleTree.leaves.map((leaf) => leaf.val);
  //     newLeaves[newIndex] = newCommitment;
  //     let newMerkleTree = MerkleTree.createFromLeaves(newLeaves);

  //     await airdrop.connect(universalOwnerSigner).updateRoot(toHex(newMerkleTree.root.val));

  //     // Redeem at the new leaf
  //     expect(newMerkleTree.root).to.be.not.eq(initHexRoot);
  //     let secondProof = await generateProofCallData(
  //       newMerkleTree,
  //       newNullifier,
  //       newSecret,
  //       redeemer.address,
  //       WASM_BUFF,
  //       ZKEY_BUFF
  //     );
  //     let newNullifierHash = toHex(pedersenHash(newNullifier));
  //     await airdrop.connect(redeemer).collectAirdrop(secondProof, newNullifierHash);
  //     let redeemerBalance: BigNumber = await erc20.balanceOf(redeemer.address);
  //     expect(redeemerBalance.toNumber()).to.be.eq(NUM_ERC20_PER_REDEMPTION * 2);
  //   });
});

async function deployContracts(
  ownerSigner: Signer,
  root: string
): Promise<{ verifier: PlonkVerifier; whitelist: Whitelist }> {
  let plonkFactory = await ethers.getContractFactory("PlonkVerifier", ownerSigner);
  let verifier = await plonkFactory.deploy();

  let whitelistFactory = await ethers.getContractFactory("Whitelist", ownerSigner);
  let whitelist: Whitelist = (await whitelistFactory.deploy(verifier.address, root)) as Whitelist;
  return { verifier, whitelist };
}
