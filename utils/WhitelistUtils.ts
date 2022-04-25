import * as crypto from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { MerkleTree, pedersenHash, toHex } from "../lib";

/** MerkleTree and inputs used to derive. */
export interface MerkleTreeAndSource {
  merkleTree: MerkleTree;
  includedAddresses: BigInt[];
}

/**
 * Generates a Merkle Tree from random leaves of size @param numLeaves.
 */
export function generateRandomMerkleTree(numLeaves: number): MerkleTreeAndSource {
  let includedAddresses: BigInt[] = [];
  let leaves: BigInt[] = [];
  for (let i = 0; i < numLeaves; i++) {
    includedAddresses.push(randomBigInt(20));
    leaves.push(pedersenHash(includedAddresses[i]));
  }
  let merkleTree = MerkleTree.createFromLeaves(leaves);
  return { merkleTree, includedAddresses };
}

/**
 * Generates a Merkle Tree with a fixed size of leaves @param numLeavesfrom, list of specific addresses @param addresses, and fills the rest of the tree with random address
 */
 export function generateMerkleTreeWithSpecificAddressesAndFillRandom(numLeaves: number, addresses: BigInt[]): MerkleTreeAndSource {
  let includedAddresses: BigInt[] = addresses;
  let contIndex: number = 0;
  let leaves: BigInt[] = [];

  if (numLeaves > addresses.length) contIndex = numLeaves - addresses.length; 

  for (let i = 0; i < numLeaves; i++) {
    if((contIndex > 0) && (i > addresses.length - 1)) {
      includedAddresses.push(randomBigInt(20));
    }
    leaves.push(pedersenHash(includedAddresses[i]));
  }
  let merkleTree = MerkleTree.createFromLeaves(leaves);
  return { merkleTree, includedAddresses };
}

export function saveMerkleTreeAndSource(mts: MerkleTreeAndSource, filePrefix: string = "") {
  let csvContent = "address,commitment\n";
  for (let i = 0; i < mts.includedAddresses.length; i++) {
    csvContent += toHex(mts.includedAddresses[i]) + "," + toHex(mts.merkleTree.leaves[i].val) + "\n";
  }

  writeFileSync(`${filePrefix}mt_${mts.includedAddresses.length}.csv`, csvContent);
  saveMerkleTree(mts.merkleTree, filePrefix);
}

export function saveMerkleTree(mt: MerkleTree, filePrefix: string = "") {
  let storage = mt.getStorageString();
  writeFileSync(`${filePrefix}mt_keys_${mt.leaves.length}.txt`, storage);
}

export function readMerkleTreeAndSourceFromFile(filename: string): MerkleTreeAndSource {
  let includedAddresses: BigInt[] = [];
  let leaves: BigInt[] = [];

  let contents = readFileSync(filename, "utf8");
  let lines = contents.split("\n");
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let tokens = line.split(",");
    if (tokens.length < 2) continue;

    let address = tokens[0];
    let commitment = tokens[1].split("\n")[0];
    includedAddresses.push(BigInt(address));
    leaves.push(BigInt(commitment));
  }
  let merkleTree = MerkleTree.createFromLeaves(leaves);
  return { merkleTree, includedAddresses };
}

export function randomBigInt(nBytes: number): BigInt {
  return toBigIntLE(crypto.randomBytes(nBytes));
}

export function toBigIntLE(buff: Buffer) {
  const reversed = Buffer.from(buff);
  reversed.reverse();
  const hex = reversed.toString("hex");
  if (hex.length === 0) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}
