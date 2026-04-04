// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ModelRegistry {
    address public owner;
    mapping(string => bytes32) public modelHashes;

    event ModelRegistered(string name, bytes32 hash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerModel(string calldata name, bytes32 hash) external onlyOwner {
        modelHashes[name] = hash;
        emit ModelRegistered(name, hash);
    }

    function getModelHash(string calldata name) external view returns (bytes32) {
        return modelHashes[name];
    }
}
