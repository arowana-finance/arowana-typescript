// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { DataFeed } from '../common/DataFeed.sol';
import { BaseFunctionsConsumer } from './BaseFunctionsConsumer.sol';

contract ARWFeed is DataFeed, BaseFunctionsConsumer {
    uint256 public updateInterval;
    uint256 public maxBaseGasPrice;

    mapping(uint64 => uint64) public answers;

    /**
     * @dev For custom chainlink interval updates
     */
    function _checkUpkeepCondition() internal view override returns (bool) {
        if (block.basefee > maxBaseGasPrice) {
            return false;
        }

        if (block.timestamp < (latestTimestamp + updateInterval)) {
            return false;
        }

        return true;
    }

    function setFeedInfo(
        address _router,
        address _upkeepContract,
        uint256 _gasPrice,
        uint256 _interval
    ) public onlyOwner {
        setConsumer(_router, _upkeepContract);
        setGasPrice(_gasPrice);
        setInterval(_interval);
    }

    function setGasPrice(uint256 _gasPrice) public onlyOwner {
        maxBaseGasPrice = _gasPrice;
    }

    function setInterval(uint256 _interval) public onlyOwner {
        updateInterval = _interval;
    }

    function handleResponse(bytes memory response) internal override {
        uint64[] memory nums = splitBytes(response);
        uint arrayLen = nums.length / 2;

        for (uint i; i < arrayLen; ++i) {
            uint64 answer = nums[i * 2];
            uint64 timestamp = nums[i * 2 + 1];

            if (answers[timestamp] == answer) {
                continue;
            }

            answers[timestamp] = answer;
            _updateAnswer(int256(uint256(answer)), uint256(s_lastRequestId), uint256(timestamp));
        }
    }

    function splitBytes(bytes memory data) internal pure returns (uint64[] memory) {
        require(data.length % 8 == 0, 'Data length must be divisible by chunk size');

        uint256 numChunks = data.length / 8;
        uint64[] memory result = new uint64[](numChunks);

        for (uint256 i = 0; i < numChunks; i++) {
            bytes memory chunk = new bytes(8);
            for (uint256 j = 0; j < 8; j++) {
                chunk[j] = data[i * 8 + j];
            }
            result[i] = uint64(bytes8(chunk));
        }
        return result;
    }
}
