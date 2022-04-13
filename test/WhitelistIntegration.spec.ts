import { Signer } from '@ethersproject/abstract-signer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { generateProofCallData, toHex } from '../lib';
import { MockContract } from '../typechain';
import { generateRandomMerkleTree, MerkleTreeAndSource, randomBigInt } from '../utils/WhitelistUtils';

let WASM_PATH = './build/circuit_js/circuit.wasm';
let ZKEY_PATH = './build/circuit_final.zkey';

let WASM_BUFF = readFileSync(WASM_PATH);
let ZKEY_BUFF = readFileSync(ZKEY_PATH);

let TREE_HEIGHT = parseInt(process.env.TREE_HEIGHT as string);

describe('Whitelist', async () => {
  let merkleTreeAndSource: MerkleTreeAndSource;
  let whitelist: MockContract;
  let owner: SignerWithAddress;

  before(async () => {
    // Load existing Merkle Tree from file to speed tests
    merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
    let hexRoot = toHex(merkleTreeAndSource.merkleTree.root.val);
    [owner] = await ethers.getSigners();
    whitelist = await deployContract(owner, hexRoot);
  });

  it('check whether an address is whitelisted', async () => {
    // Generate proof
    const leafIndex = 7;
    const addressBigInt = merkleTreeAndSource.includedAddresses[leafIndex];
    const address = toHex(addressBigInt, 20);
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, addressBigInt, WASM_BUFF, ZKEY_BUFF);
    expect(await whitelist.isWhitelisted(callData, address)).to.be.true;
    // ensure proof verification is included in gas reporter
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address],
    });
    const signer = await ethers.getSigner(address);
    await owner.sendTransaction({ to: signer.address, value: ethers.utils.parseEther('1') });
    await whitelist.connect(signer).doSomething(callData);
    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [address],
    });
  });

  it('should not be able to generate proof for address not included in the merkle tree', async () => {
    const address = randomBigInt(20);
    await expect(generateProofCallData(merkleTreeAndSource.merkleTree, address, WASM_BUFF, ZKEY_BUFF)).to.throw;
  });

  it('should not be able to provide valid proof for with an address not included in the merkle tree', async () => {
    const notIncludedAddress = randomBigInt(20);
    const leafIndex = 6;
    const address = merkleTreeAndSource.includedAddresses[leafIndex];
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, address, WASM_BUFF, ZKEY_BUFF);
    expect(await whitelist.isWhitelisted(callData, toHex(notIncludedAddress, 20))).to.be.false;
  });

  it('can be updated', async () => {
    const leafIndex = 7;
    const addressBefore = merkleTreeAndSource.includedAddresses[leafIndex];
    merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
    const address = merkleTreeAndSource.includedAddresses[leafIndex];
    expect(addressBefore).to.not.equal(address);
    // update root
    await whitelist.updateRoot(toHex(merkleTreeAndSource.merkleTree.root.val));
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, address, WASM_BUFF, ZKEY_BUFF);
    expect(await whitelist.isWhitelisted(callData, toHex(address, 20))).to.be.true;
  });
});

async function deployContract(ownerSigner: Signer, root: string): Promise<MockContract> {
  let plonkFactory = await ethers.getContractFactory('PlonkVerifier', ownerSigner);
  let verifier = await plonkFactory.deploy();

  let whitelistFactory = await ethers.getContractFactory('MockContract', ownerSigner);
  let whitelist: MockContract = (await whitelistFactory.deploy(verifier.address, root)) as MockContract;
  return whitelist;
}
