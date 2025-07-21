// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Initializable } from '@openzeppelin/contracts-upgradeable-v5/proxy/utils/Initializable.sol';
import { OwnableUpgradeable } from '@openzeppelin/contracts-upgradeable-v5/access/OwnableUpgradeable.sol';

/**
 * DataFeed Interface acting as an EACAggregatorProxy and FeedRegistry
 */
contract DataFeedAggregator is Initializable, OwnableUpgradeable {
    // denomination address also used for chainlink's price feed registry in production
    address private constant denomination = address(840);

    event FeedProposed(
        address indexed asset,
        address indexed denomination,
        address indexed proposedAggregator,
        address currentAggregator,
        address sender
    );
    event FeedConfirmed(
        address indexed asset,
        address indexed denomination,
        address indexed latestAggregator,
        address previousAggregator,
        uint16 nextPhaseId,
        address sender
    );

    uint16 public phaseId;

    mapping(uint16 => DataFeedAggregator) public phaseAggregators;

    function initialize(address _initOwner, address _aggregator) public virtual initializer {
        if (_initOwner == address(0)) {
            _initOwner = _msgSender();
        }
        __Ownable_init(_initOwner);

        if (_aggregator != address(0)) {
            DataFeedAggregator dataFeed = DataFeedAggregator(_aggregator);
            address _asset = callAsset(_aggregator);

            phaseAggregators[phaseId] = dataFeed;

            emit FeedProposed(_asset, denomination, _aggregator, address(0), msg.sender);
            emit FeedConfirmed(_asset, denomination, _aggregator, address(0), phaseId, msg.sender);
        }
    }

    /**
     * @notice Allows the owner to propose a new address for the aggregator
     * @param _aggregator The new address for the aggregator contract
     */
    function proposeAggregator(address _aggregator) public onlyOwner {
        DataFeedAggregator dataFeed = DataFeedAggregator(_aggregator);
        DataFeedAggregator prevAggregator = aggregator();
        address _asset = callAsset(_aggregator);

        phaseId++;
        phaseAggregators[phaseId] = dataFeed;

        emit FeedProposed(_asset, denomination, _aggregator, address(prevAggregator), msg.sender);
        emit FeedConfirmed(_asset, denomination, _aggregator, address(prevAggregator), phaseId, msg.sender);
    }

    function aggregator() public view returns (DataFeedAggregator) {
        return phaseAggregators[phaseId];
    }

    /**
     * Proxied functions to current aggregator
     */
    function decimals() external view returns (uint8) {
        return aggregator().decimals();
    }

    function asset() external view returns (address) {
        return callAsset(address(aggregator()));
    }

    function description() external view returns (string memory) {
        return aggregator().description();
    }

    function version() external view returns (uint256) {
        return aggregator().version();
    }

    function deploymentTimestamp() external view returns (uint256) {
        return aggregator().deploymentTimestamp();
    }

    function latestAnswer() external view returns (int256) {
        return aggregator().latestAnswer();
    }

    function latestTimestamp() external view returns (uint256) {
        return aggregator().latestTimestamp();
    }

    function latestRound() external view returns (uint256) {
        return aggregator().latestRound();
    }

    function getAnswer(uint256 _roundId) external view returns (uint256) {
        return aggregator().getAnswer(_roundId);
    }

    function getTimestamp(uint256 _roundId) external view returns (uint256) {
        return aggregator().getTimestamp(_roundId);
    }

    function getTimestampAnswer(uint256 _timestamp) external view returns (uint256) {
        return aggregator().getTimestampAnswer(_timestamp);
    }

    function getRoundData(uint80 _roundId) external view returns (uint80, int256, uint256, uint256, uint80) {
        return aggregator().getRoundData(_roundId);
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return aggregator().latestRoundData();
    }

    function callAsset(address _aggregator) public view returns (address) {
        (bool success, bytes memory returnData) = address(_aggregator).staticcall(
            abi.encodeCall(DataFeedAggregator.asset, ())
        );

        // asset() is non standard so we just return zero address
        if (!success) {
            return address(0);
        }

        return abi.decode(returnData, (address));
    }
}
