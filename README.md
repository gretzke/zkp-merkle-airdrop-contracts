# ZK-Whitelist

Managing a whitelist on chain can be very expensive for project maintainers. This repo demonstrates the usage of zero knowledge proofs for a whitelist.

Users included in a whitelist are stored in a merkle tree. The root of the merkle tree is stored in the smart contract. Modifying the whitelist can be achieved by updating the root of the merkle tree. An arbitrary amount of addresses can be added and / or removed from the whitelist in a single transaction without increasing gas costs.

Users can prove that they are included in the whitelist by providing a proof of inclusion to the verifying smart contract. Verification costs ~275k gas.

## Prerequisites

- yarn and node.js
- (optional) [Circom 2.0 + snarkjs](https://docs.circom.io/getting-started/installation/) if you want to modify the amount of addresses that can be included in the merkle tree

## Installation

- `yarn install`
- `yarn compile`

## Useful commands

- Test: `yarn test`
- Generate circuit, zkey, solidity: `yarn run build:circuit`
- Generate local randomized Merkle Tree of addresses: `ts-node scripts/gen_tree.ts`

## Changing max amount of addresses

The amount of addresses that can be stored in the merkle tree are defined by the tree height (`2^tree height`). To ensure unit tests run quickly, the tree height is set to 5. This allows for a maximum of 32 addresses in the whitelist. To change the maximum amount of addresses, rename the `.env.template` file to `.env` and change the `TREE_HEIGHT` value. Run `yarn run build:circuit` to recompile the circuit with the new tree height. This command will also generate new code for the `MerkVerifier` contract.

## Disclaimer

_These smart contracts are being provided as is. No guarantee, representation or warranty is being made, express or implied, as to the safety or correctness of the user interface or the smart contracts. They have not been audited and as such there can be no assurance they will work as intended, and users may experience delays, failures, errors, omissions or loss of transmitted information. In addition, any airdrop using these smart contracts should be conducted in accordance with applicable law. Nothing in this repo should be construed as investment advice or legal advice for any particular facts or circumstances and is not meant to replace competent counsel. It is strongly advised for you to contact a reputable attorney in your jurisdiction for any questions or concerns with respect thereto. a16z is not liable for any use of the foregoing, and users should proceed with caution and use at their own risk. See a16z.com/disclosure for more info._



