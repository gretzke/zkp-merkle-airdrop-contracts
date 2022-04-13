/**
 * Library which abstracts away much of the details required to interact with the private airdrop contract.
 */
const snarkjs = require('snarkjs');
const circomlibjs = require('circomlibjs');
const wc = require('../build/circuit_js/witness_calculator');

import { MerkleTree } from './MerkleTree';

export async function generateProofCallData(
  merkleTree: MerkleTree,
  address: BigInt,
  circuitWasmBuffer: Buffer,
  zkeyBuffer: Buffer
): Promise<string> {
  let inputs = generateCircuitInputJson(merkleTree, address);
  let witnessCalculator = await wc(circuitWasmBuffer);
  let witnessBuffer = await witnessCalculator.calculateWTNSBin(inputs, 0);

  let { proof, publicSignals } = await snarkjs.plonk.prove(zkeyBuffer, witnessBuffer);

  let proofProcessed = unstringifyBigInts(proof);
  let pubProcessed = unstringifyBigInts(publicSignals);
  let allSolCallData: string = await snarkjs.plonk.exportSolidityCallData(proofProcessed, pubProcessed);
  let solCallDataProof = allSolCallData.split(',')[0];
  return solCallDataProof;
}

export function mimcSponge(l: BigInt, r: BigInt): BigInt {
  return circomlibjs.mimcsponge.multiHash([l, r]);
}

export function pedersenHash(address: BigInt): BigInt {
  return pedersenHashBuff(toBufferLE(address as any));
}

export function toHex(number: BigInt, length = 32) {
  const str: string = number.toString(16);
  return '0x' + str.padStart(length * 2, '0');
}

// Non-exported

interface CircuitInput {
  root: BigInt;
  pathIndices: number[];
  pathElements: BigInt[];
  address: BigInt;
}

function generateCircuitInputJson(mt: MerkleTree, address: BigInt): CircuitInput {
  let commitment = pedersenHash(address);
  let mp = mt.getMerkleProof(commitment);

  let inputObj = {
    root: mt.root.val,
    pathIndices: mp.indices,
    pathElements: mp.vals,
    address,
  };
  return inputObj;
}

function pedersenHashBuff(buff: Buffer): BigInt {
  let point = circomlibjs.pedersenHash.hash(buff);
  return circomlibjs.babyjub.unpackPoint(point)[0];
}

// Lifted from ffutils: https://github.com/iden3/ffjavascript/blob/master/src/utils_bigint.js
function unstringifyBigInts(o: any): any {
  if (typeof o == 'string' && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == 'string' && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == 'object') {
    const res: { [key: string]: any } = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

function toBufferLE(bi: BigInt, width: number = 20): Buffer {
  const hex = bi.toString(16);
  const buffer = Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
  buffer.reverse();
  return buffer;
}
