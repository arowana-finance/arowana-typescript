// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { WithSettler } from './WithSettler.sol';

/// @title Chainlink / AAVE Compatible Price / PoR Feed
contract DataFeed is WithSettler {
    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    uint256 public immutable getTokenType = 1;
    uint8 public immutable decimals = 8;

    uint256 public latestTimestamp;
    int256 public latestAnswer;
    uint256 public latestRound;

    function updateAnswer(int256 newAnswer) external onlySettlers {
        _updateAnswer(newAnswer, latestRound + 1, block.timestamp);
    }

    function _updateAnswer(int256 newAnswer, uint256 newRound, uint256 newTimestamp) internal {
        // Only update new answers
        if (latestTimestamp >= newTimestamp) {
            return;
        }

        latestTimestamp = newTimestamp;
        latestAnswer = newAnswer;
        latestRound = newRound;
        emit AnswerUpdated(newAnswer, newRound, newTimestamp);
    }
}
