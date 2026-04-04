// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract InferenceGateway {
    address public owner;
    address public teeAddress;
    IERC20 public usdt;
    uint256 public inferenceCost;

    mapping(address => uint256) public balances;

    struct Proof {
        address user;
        bytes32 promptHash;
        bytes32 responseHash;
        bytes32 modelHash;
        uint256 timestamp;
    }

    mapping(bytes32 => Proof) public proofs;
    mapping(address => bytes32[]) internal _userProofs;
    uint256 public proofCount;

    event PaymentReceived(address indexed user, uint256 amount);
    event ProofSubmitted(
        bytes32 indexed proofId,
        address indexed user,
        bytes32 promptHash,
        bytes32 responseHash,
        bytes32 modelHash,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyTee() {
        require(msg.sender == teeAddress, "Not TEE");
        _;
    }

    constructor(address _usdt, address _teeAddress, uint256 _inferenceCost) {
        owner = msg.sender;
        usdt = IERC20(_usdt);
        teeAddress = _teeAddress;
        inferenceCost = _inferenceCost;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender] += amount;
        emit PaymentReceived(msg.sender, amount);
    }

    function submitProof(
        address user,
        bytes32 promptHash,
        bytes32 responseHash,
        bytes32 modelHash,
        uint256 timestamp,
        bytes calldata signature
    ) external onlyTee {
        // Verify ECDSA signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(user, promptHash, responseHash, modelHash, timestamp)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(signature.length == 65, "Invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        address recovered = ecrecover(ethSignedHash, v, r, s);
        require(recovered == teeAddress, "Invalid signature");

        // Deduct balance
        require(balances[user] >= inferenceCost, "Insufficient balance");
        balances[user] -= inferenceCost;

        // Store proof
        bytes32 proofId = keccak256(
            abi.encodePacked(user, promptHash, responseHash, timestamp)
        );
        proofs[proofId] = Proof(user, promptHash, responseHash, modelHash, timestamp);
        _userProofs[user].push(proofId);
        proofCount++;

        emit ProofSubmitted(proofId, user, promptHash, responseHash, modelHash, timestamp);
    }

    function getUserProofCount(address user) external view returns (uint256) {
        return _userProofs[user].length;
    }

    function getUserProofAt(address user, uint256 index) external view returns (bytes32) {
        return _userProofs[user][index];
    }

    function setTeeAddress(address _tee) external onlyOwner {
        teeAddress = _tee;
    }

    function setInferenceCost(uint256 _cost) external onlyOwner {
        inferenceCost = _cost;
    }
}
