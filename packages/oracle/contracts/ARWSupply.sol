// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from '@openzeppelin/contracts-v5/token/ERC20/IERC20.sol';
import { EnumerableSet } from '@openzeppelin/contracts-v5/utils/structs/EnumerableSet.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable-v5/proxy/utils/Initializable.sol';
import { OwnableUpgradeable } from '@openzeppelin/contracts-upgradeable-v5/access/OwnableUpgradeable.sol';

/**
 * @dev Calculates live / transparent circulating supply of ARW token on-chain
 */
contract ARWSupply is Initializable, OwnableUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    event Initialized(address arw);
    event AddExcludedAddress(address indexed excluded);
    event RemoveExcludedAddress(address indexed excluded);

    IERC20 public ARW;

    EnumerableSet.AddressSet private excluded;

    function initialize(address _ARW) public initializer {
        __Ownable_init(msg.sender);

        ARW = IERC20(_ARW);

        emit Initialized(_ARW);

        address[] memory addresses = new address[](13);

        // EOAs
        addresses[0] = 0xb8c574171EE55be2dDc98E7461f9Ebd2de2f00AB;
        addresses[1] = 0x1E54223e49Ebb025C3fCaED65Ce1DA9C039C9565;
        addresses[2] = 0x2B4E8A0E5e52C65c45692fCcf77F10c786bc1e0B;
        addresses[3] = 0xA0F008b3E3187B247DDC987e52735654048858c9;
        addresses[4] = 0x85225dDFbCC3cd5D5333D1525CB64e43e4c77E75;
        addresses[5] = 0x06088f4b78bBc74570124bAdb3F9475410dC369A;
        addresses[6] = 0x4aF320D6155ac13a962048BC310ED83b1e44E4Ae;

        // Safes
        addresses[7] = 0x754637675bBF31b07f9a114Ef59BC78E65737A80;
        addresses[8] = 0x14A77f8656B753Be4FEBaB0f8891DB0205f7D588;
        addresses[9] = 0x2C12b7ADaB9f02cE1a0AA0E092C2F36487126cCe;
        addresses[10] = 0x17D30a2D883D40090ac1a19A09c635fC967d7D46;
        addresses[11] = 0x2f19E9d3D3F7f7DA27B6a0A2005748e295b6949D;
        addresses[12] = 0x4173f68528dfa76787CC8420C4E8592485456c43;

        for (uint i; i < addresses.length; ++i) {
            address addr = addresses[i];

            excluded.add(addr);

            emit AddExcludedAddress(addr);
        }
    }

    function addExcludedAddress(address _excluded) public onlyOwner {
        require(!excluded.contains(_excluded), 'Invalid address');

        excluded.add(_excluded);

        emit AddExcludedAddress(_excluded);
    }

    function removeExcludedaddress(address _excluded) public onlyOwner {
        require(excluded.contains(_excluded), 'Invalid address');

        excluded.remove(_excluded);

        emit RemoveExcludedAddress(_excluded);
    }

    function excludedAddresses() public view returns (address[] memory) {
        return excluded.values();
    }

    function excludedSupply() public view returns (uint256) {
        uint256 values = 0;

        address[] memory addresses = excludedAddresses();

        for (uint i; i < addresses.length; ++i) {
            values += ARW.balanceOf(addresses[i]);
        }

        return values;
    }

    function circulatingSupply() public view returns (uint256) {
        return ARW.totalSupply() - excludedSupply();
    }
}
