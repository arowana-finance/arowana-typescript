// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { WithSettler } from './WithSettler.sol';

/// @title Chainlink / AAVE Compatible Price / PoR Feed
contract DataFeed is WithSettler {
    event NewAsset(address indexed asset);
    event NewDescription(string description);
    event NewRound(uint256 indexed roundId, address indexed startedBy, uint256 startedAt);
    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    uint8 public immutable decimals = 8;

    address public asset;

    string public description;

    uint256 public version = 6;

    uint256 public deploymentTimestamp;

    int256 public latestAnswer;

    uint256 public latestTimestamp;

    uint256 public latestRound;

    /// @dev roundId => answer
    mapping(uint256 => int256) public getAnswer;

    /// @dev roundId => timestamp
    mapping(uint256 => uint256) public getTimestamp;

    /// @dev timestamp => answer
    mapping(uint256 => int256) public getTimestampAnswer;

    function getRoundData(
        uint80 _roundId
    )
        public
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        roundId = _roundId;
        answer = getAnswer[uint256(_roundId)];
        startedAt = _roundId > uint80(0) ? getTimestamp[uint256(_roundId) - 1] : deploymentTimestamp;
        updatedAt = getTimestamp[uint256(_roundId)];
        // This data is not relevant so we just return same as requested _roundId like other feeds
        answeredInRound = _roundId;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return getRoundData(uint80(latestRound));
    }

    function setFeedInfo(address _asset, string memory _description) public onlyOwner {
        if (deploymentTimestamp == 0) {
            deploymentTimestamp = block.timestamp;
        }
        if (version == 0) {
            version = 6;
        }
        setAsset(_asset);
        setDescription(_description);
    }

    function setAsset(address _asset) public onlyOwner {
        asset = _asset;
        emit NewAsset(_asset);
    }

    function setDescription(string memory _description) public onlyOwner {
        description = _description;
        emit NewDescription(_description);
    }

    function setVersion(uint256 _version) public onlyOwner {
        version = _version;
    }

    function updateAnswer(int256 newAnswer) external onlySettlers {
        _updateAnswer(newAnswer, latestRound + 1, block.timestamp);
    }

    function _updateAnswer(int256 newAnswer, uint256 newRound, uint256 newTimestamp) internal {
        // Only update new answers
        if (latestTimestamp >= newTimestamp) {
            return;
        }

        latestAnswer = newAnswer;
        latestTimestamp = newTimestamp;
        latestRound = newRound;

        bool hasRound = getTimestamp[newRound] != 0;

        getAnswer[newRound] = newAnswer;
        getTimestamp[newRound] = newTimestamp;
        getTimestampAnswer[newTimestamp] = newAnswer;

        if (!hasRound) {
            emit NewRound(newRound, msg.sender, newTimestamp);
        }

        emit AnswerUpdated(newAnswer, newRound, newTimestamp);
    }
}
