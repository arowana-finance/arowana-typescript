// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AutomationCompatible } from '@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol';
import { WithSettler } from '../common/WithSettler.sol';
import { FunctionsClient } from './FunctionsClient.sol';

/**
 * @title Functions Consumer contract used for Chainlink Automation.
 */
contract BaseFunctionsConsumer is FunctionsClient, AutomationCompatible, WithSettler {
    event SetConsumer(address indexed router);
    event SetUpkeep(
        address indexed upkeepContract,
        uint64 upkeepInterval,
        uint64 upkeepRateInterval,
        uint64 upkeepRateCap,
        uint64 maxBaseGasPrice
    );
    event Response(bytes32 indexed requestId, bytes response, bytes err);

    /**
     * @dev Chainlink Settings
     */
    bytes public request;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donID;
    bytes32 public s_lastRequestId;

    /**
     * @dev Upkeep settings
     *
     * Defines upkeepContract, rate limits ( so that chainlink wouldn't drain our LINKs ), and limits on gasPrice costs
     */
    address public upkeepContract;
    uint64 public upkeepInterval;
    uint64 public upkeepRateInterval;
    uint64 public upkeepRateCap;
    uint64 public lastUpkeep;
    uint64 public maxBaseGasPrice;
    mapping(uint64 => uint64) public upkeepRates;

    error UnexpectedRequestID(bytes32 requestId);

    /**
     * @notice Reverts if called by anyone other than the contract owner or automation registry.
     */
    modifier onlyUpkeep() {
        require(msg.sender == owner() || msg.sender == upkeepContract, 'NotAllowedCaller');
        _;
    }

    function setConsumer(address _router) public onlyOwner {
        _initializeFuncClient(_router);

        emit SetConsumer(_router);
    }

    function setUpkeep(
        address _upkeepContract,
        uint64 _upkeepInterval,
        uint64 _upkeepRateInterval,
        uint64 _upkeepRateCap,
        uint64 _maxBaseGasPrice
    ) public onlyOwner {
        upkeepContract = _upkeepContract;
        upkeepInterval = _upkeepInterval;
        upkeepRateInterval = _upkeepRateInterval;
        upkeepRateCap = _upkeepRateCap;
        maxBaseGasPrice = _maxBaseGasPrice;

        emit SetUpkeep(
            _upkeepContract,
            _upkeepInterval,
            _upkeepRateInterval,
            _upkeepRateCap,
            _maxBaseGasPrice
        );
    }

    /// @notice Update the request settings
    /// @dev Only callable by the owner of the contract
    /// @param _request The new encoded CBOR request to be set. The request is encoded offchain
    /// @param _subscriptionId The new subscription ID to be set
    /// @param _gasLimit The new gas limit to be set
    /// @param _donID The new job ID to be set
    function updateRequest(
        bytes memory _request,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donID
    ) public onlyOwner {
        request = _request;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donID = _donID;
    }

    /**
     * @dev Upkeep settings
     * Applying rate limits from chainlink
     */
    function _checkUpkeepCondition() internal view virtual returns (bool) {
        if (uint64(block.basefee) > maxBaseGasPrice) {
            return false;
        }

        if (uint64(block.timestamp) < (lastUpkeep + upkeepInterval)) {
            return false;
        }

        if (upkeepRates[getUpkeepTime(block.timestamp)] >= upkeepRateCap) {
            return false;
        }

        return true;
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        return (_checkUpkeepCondition(), new bytes(0));
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        if (_checkUpkeepCondition()) {
            lastUpkeep = uint64(block.timestamp);
            s_lastRequestId = _sendRequest(request, subscriptionId, gasLimit, donID);
        }
    }

    /**
     * @notice Send a pre-encoded CBOR request
     * @return requestId The ID of the sent request
     */
    function sendRequestCBOR() external onlyUpkeep returns (bytes32 requestId) {
        s_lastRequestId = _sendRequest(request, subscriptionId, gasLimit, donID);
        return s_lastRequestId;
    }

    function handleResponse(bytes memory response) internal virtual {}

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        upkeepRates[getUpkeepTime(block.timestamp)]++;

        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        if (response.length > 1 && err.length == 0) {
            handleResponse(response);
        }

        emit Response(requestId, response, err);
    }

    function getUpkeepTime(uint256 timestamp) public view returns (uint64) {
        return (uint64(timestamp) / upkeepRateInterval) * upkeepRateInterval;
    }
}
