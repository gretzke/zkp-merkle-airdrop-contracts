import { Signer } from '@ethersproject/abstract-signer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { generateProofCallData, toHex } from '../lib';
import { Whitelist721LazyMint } from '../typechain';
import { generateRandomMerkleTree, MerkleTreeAndSource, randomBigInt } from '../utils/WhitelistUtils';

let WASM_PATH = './build/circuit_js/circuit.wasm';
let ZKEY_PATH = './build/circuit_final.zkey';

let WASM_BUFF = readFileSync(WASM_PATH);
let ZKEY_BUFF = readFileSync(ZKEY_PATH);

let TREE_HEIGHT = parseInt(process.env.TREE_HEIGHT as string);

describe('ERC721LazyMint Claim', async () => {
  let merkleTreeAndSource: MerkleTreeAndSource;
  let whitelist721lazymint: Whitelist721LazyMint;
  let owner: SignerWithAddress;
  let hexRoot: string;

  beforeEach(async () => {
    // Load existing Merkle Tree from file to speed tests
    merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
    hexRoot = toHex(merkleTreeAndSource.merkleTree.root.val);
    [owner] = await ethers.getSigners();
    whitelist721lazymint = await deployContract(owner, hexRoot);
  });

  it('check whether whitelisted address can mint NFT', async () => {
    // Generate proof
    const leafIndex = 7;
    const addressBigInt = merkleTreeAndSource.includedAddresses[leafIndex];
    const address = toHex(addressBigInt, 20);
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, addressBigInt, WASM_BUFF, ZKEY_BUFF);

    expect(await whitelist721lazymint.isWhitelisted(callData, address)).to.be.true;

    // ensure proof verification is included in gas reporter
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address],
    });

    const signer = await ethers.getSigner(address);

    await owner.sendTransaction({ to: signer.address, value: ethers.utils.parseEther('1') });
    await expect(whitelist721lazymint.connect(signer).claim(callData))
      .to.emit(whitelist721lazymint, 'Minted')
      .withArgs(signer.address, 1);

    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [address],
    });
  });

  it('should not be able to provide valid proof for with an address not included in the merkle tree', async () => {
    const notIncludedAddress = randomBigInt(20);
    const notIncludedAddressHex = toHex(notIncludedAddress, 20);
    const leafIndex = 6;
    const address = merkleTreeAndSource.includedAddresses[leafIndex];
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, address, WASM_BUFF, ZKEY_BUFF);
    expect(await whitelist721lazymint.isWhitelisted(callData, toHex(notIncludedAddress, 20))).to.be.false;

    // ensure proof verification is included in gas reporter
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [notIncludedAddressHex],
    });

    const signer = await ethers.getSigner(notIncludedAddressHex);

    await owner.sendTransaction({ to: signer.address, value: ethers.utils.parseEther('1') });

    await expect(whitelist721lazymint.connect(signer).claim(callData)).to.be.revertedWith('not whitelisted')

    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [notIncludedAddressHex],
    });
  });

  it('can be updated', async () => {
    const leafIndex = 7;
    const addressBefore = merkleTreeAndSource.includedAddresses[leafIndex];
    merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
    const address = merkleTreeAndSource.includedAddresses[leafIndex];
    expect(addressBefore).to.not.equal(address);
    // update root
    await whitelist721lazymint.updateRoot(toHex(merkleTreeAndSource.merkleTree.root.val));
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, address, WASM_BUFF, ZKEY_BUFF);
    expect(await whitelist721lazymint.isWhitelisted(callData, toHex(address, 20))).to.be.true;
  });

  it('token is expired: prevent access', async () => {
    // Generate proof
    const leafIndex = 7;
    const addressBigInt = merkleTreeAndSource.includedAddresses[leafIndex];
    const address = toHex(addressBigInt, 20);
    const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, addressBigInt, WASM_BUFF, ZKEY_BUFF);

    expect(await whitelist721lazymint.isWhitelisted(callData, address)).to.be.true;

    // ensure proof verification is included in gas reporter
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address],
    });

    const signer = await ethers.getSigner(address);

    await owner.sendTransaction({ to: signer.address, value: ethers.utils.parseEther('1') });
    await expect(whitelist721lazymint.connect(signer).claim(callData))
      .to.emit(whitelist721lazymint, 'Minted')
      .withArgs(signer.address, 1);

    merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
    const addressAfter = merkleTreeAndSource.includedAddresses[leafIndex];
    expect(addressBigInt).to.not.equal(addressAfter);

    // update root
    await whitelist721lazymint.updateRoot(toHex(merkleTreeAndSource.merkleTree.root.val));
    expect(whitelist721lazymint.root).to.not.equal(hexRoot);

    expect(await whitelist721lazymint.isTokenExpired(signer.address)).to.be.true;

    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [address],
    });
  })

  // @dev expected to fail because the previous user is not part of the randomly generated merkle tree
  // it('token is expired: old token burned, new token minted', async () => {
  //   // Generate proof
  //   const leafIndex = 7;
  //   const addressBigInt = merkleTreeAndSource.includedAddresses[leafIndex];
  //   const address = toHex(addressBigInt, 20);
  //   const callData = await generateProofCallData(merkleTreeAndSource.merkleTree, addressBigInt, WASM_BUFF, ZKEY_BUFF);

  //   expect(await whitelist721lazymint.isWhitelisted(callData, address)).to.be.true;

  //   // ensure proof verification is included in gas reporter
  //   await network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [address],
  //   });

  //   const signer = await ethers.getSigner(address);

  //   await owner.sendTransaction({ to: signer.address, value: ethers.utils.parseEther('1') });
  //   await expect(whitelist721lazymint.connect(signer).claim(callData))
  //     .to.emit(whitelist721lazymint, 'Minted')
  //     .withArgs(signer.address, 1);

  //   merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
  //   const addressAfter = merkleTreeAndSource.includedAddresses[leafIndex];
  //   expect(addressBigInt).to.not.equal(addressAfter);

  //   // update root
  //   await whitelist721lazymint.updateRoot(toHex(merkleTreeAndSource.merkleTree.root.val));

  //   expect(await whitelist721lazymint.isTokenExpired(signer.address)).to.equal(true);

  //   // TODO: need to add addressBigInt as leaf to the newly generated MerkleTree
  //   const newCallData = await generateProofCallData(merkleTreeAndSource.merkleTree, addressAfter, WASM_BUFF, ZKEY_BUFF);
  //   expect(address).to.equal(signer.address);
  //   expect(await whitelist721lazymint.isWhitelisted(newCallData, address)).to.be.true;

  //   await expect(whitelist721lazymint.connect(signer).claim(newCallData))
  //     .to.emit(whitelist721lazymint, 'Minted')
  //     .withArgs(signer.address, 2);

  //   await network.provider.request({
  //     method: 'hardhat_stopImpersonatingAccount',
  //     params: [address],
  //   });
  // })
});

async function deployContract(ownerSigner: Signer, root: string): Promise<Whitelist721LazyMint> {
  let plonkFactory = await ethers.getContractFactory('PlonkVerifier', ownerSigner);
  let verifier = await plonkFactory.deploy();

  let whitelist721LazyMintFactory = await ethers.getContractFactory('Whitelist721LazyMint', ownerSigner);
  return (await whitelist721LazyMintFactory.deploy(verifier.address, root)) as Whitelist721LazyMint;
}