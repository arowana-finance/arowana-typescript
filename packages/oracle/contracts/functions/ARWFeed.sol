// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { DataFeed } from '../common/DataFeed.sol';
import { BaseFunctionsConsumer } from './BaseFunctionsConsumer.sol';

contract ARWFeed is DataFeed, BaseFunctionsConsumer {
    mapping(uint256 => uint256) public answers;

    function handleResponse(bytes memory response) internal override {
        (uint256[] memory _answers, uint256[] memory _timestamps) = abi.decode(
            response,
            (uint256[], uint256[])
        );

        for (uint i; i < _answers.length; ++i) {
            uint256 answer = _answers[i];
            uint256 timestamp = _timestamps[i];

            if (answers[timestamp] == answer) {
                continue;
            }

            answers[timestamp] = answer;
            _updateAnswer(int256(answer), uint256(s_lastRequestId), timestamp);
        }
    }
}
