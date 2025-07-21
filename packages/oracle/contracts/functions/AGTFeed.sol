// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ARWFeed } from './ARWFeed.sol';

/**
 * @dev AGT Price Oracle powered by Chainlink Functions
 *
 * ( Only for Arbitrum Sepolia as it doesn't have native XAU / USD price feed so we mirror mainnet price feed )
 * ( For Arbitrum mainnet should use something like PriceCapAdapterStable at front of XAU / USD price feed )
 */
contract AGTFeed is ARWFeed {
    uint64 public remoteChain;

    address public remoteChainOracle;

    function setAGTFeedInfo(
        address _asset,
        string memory _description,
        uint64 _remoteChain,
        address _remoteChainOracle,
        address _router,
        address _upkeepContract,
        uint64 _upkeepInterval,
        uint64 _upkeepRateInterval,
        uint64 _upkeepRateCap,
        uint64 _maxBaseGasPrice,
        uint64 _updateInterval
    ) public onlyOwner {
        remoteChain = _remoteChain;
        remoteChainOracle = _remoteChainOracle;

        setARWFeedInfo(
            _asset,
            _description,
            _router,
            _upkeepContract,
            _upkeepInterval,
            _upkeepRateInterval,
            _upkeepRateCap,
            _maxBaseGasPrice,
            _updateInterval
        );
    }
}
