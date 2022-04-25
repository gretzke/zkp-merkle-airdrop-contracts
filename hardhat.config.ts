import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';

import type { HardhatUserConfig } from 'hardhat/config'

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
          version: "0.8.0"
      },
      {
          version: "0.8.1"
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 88888,
      },
    },
  },
  mocha: {
    timeout: 999999999,
  },
}

export default config;
