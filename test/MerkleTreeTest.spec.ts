import { expect } from 'chai';
import { MerkleTree } from '../lib';
import { generateRandomMerkleTree } from '../utils/WhitelistUtils';

describe('MerkleTree', () => {
  it('can be constructed and destructed', () => {
    let mtk = generateRandomMerkleTree(4);

    let ss1 = mtk.merkleTree.getStorageString();
    let mt2 = MerkleTree.createFromStorageString(ss1);
    let ss2 = mt2.getStorageString();

    expect(ss1).to.be.eq(ss2);
  });
});
