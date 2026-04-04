// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PaymentGateway {
    address public owner;
    IERC20 public usdt;
    mapping(address => uint256) public balances;

    event PaymentReceived(address indexed user, uint256 amount);
    event InferenceCharged(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdt) {
        owner = msg.sender;
        usdt = IERC20(_usdt);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender] += amount;
        emit PaymentReceived(msg.sender, amount);
    }

    function deductBalance(address user, uint256 amount) external onlyOwner {
        require(balances[user] >= amount, "Insufficient balance");
        balances[user] -= amount;
        emit InferenceCharged(user, amount);
    }
}
