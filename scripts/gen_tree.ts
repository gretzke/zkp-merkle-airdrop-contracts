import 'dotenv/config';
import { generateRandomMerkleTree, saveMerkleTreeAndSource } from '../utils/WhitelistUtils';

let TREE_HEIGHT = parseInt(process.env.TREE_HEIGHT as string);

async function main() {
  let merkleTreeAndSource = generateRandomMerkleTree(2 ** TREE_HEIGHT);
  saveMerkleTreeAndSource(merkleTreeAndSource);
}

main()
  .then(() => process.exit(0))
  .catch((e) => console.error(e));

// Local hashing times:
// 2^10 takes 700ms
// 2^11 takes 1611ms
// ...
