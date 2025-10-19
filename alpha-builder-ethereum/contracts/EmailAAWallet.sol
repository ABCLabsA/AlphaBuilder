// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import "./IZKEmailVerifier.sol";

/**
 * @title EmailAAWallet
 * @dev ERC-4337 compliant smart account that supports three signature modes:
 *      1) Standard EOA / ERC1271 owner signature
 *      2) zk-email derived session keys (verifier-gated)
 *      3) Binance shadow wallet signatures for mirrored custody users
 */
contract EmailAAWallet is BaseAccount {

    enum WalletKind {
        BinanceShadow,
        Native
    }

    enum SignatureType {
        Owner,
        EmailZK,
        BinanceShadow
    }

    struct EmailAuth {
        bytes32 emailCommitment;
        bytes32 nullifier;
        bytes proof;
    }

    struct BinanceAuth {
        bytes signature;
        uint48 deadline;
    }

    event WalletInitialized(
        address indexed owner,
        WalletKind indexed kind,
        address indexed shadowWallet,
        bytes32 emailCommitment
    );
    event EmailVerifierUpdated(address indexed verifier);
    event EmailCommitmentUpdated(bytes32 indexed commitment);
    event BinanceWalletUpdated(address indexed wallet);
    event NullifierConsumed(bytes32 indexed nullifier);

    IEntryPoint private immutable _entryPoint;
    address public owner;
    WalletKind public walletKind;
    address public binanceWallet;
    bytes32 public emailCommitment;
    IZKEmailVerifier public zkEmailVerifier;

    mapping(bytes32 => bool) public consumedNullifiers;

    constructor(IEntryPoint entryPoint_) {
        _entryPoint = entryPoint_;
    }

    receive() external payable {}

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "EmailAAWallet: not owner");
        _;
    }

    function initialize(
        address owner_,
        WalletKind kind,
        address binanceWallet_,
        bytes32 emailCommitment_,
        IZKEmailVerifier verifier_
    ) external {
        require(owner == address(0), "EmailAAWallet: already initialized");
        require(owner_ != address(0), "EmailAAWallet: owner required");
        owner = owner_;
        walletKind = kind;

        if (kind == WalletKind.BinanceShadow) {
            require(binanceWallet_ != address(0), "EmailAAWallet: binance wallet required");
            binanceWallet = binanceWallet_;
            emit BinanceWalletUpdated(binanceWallet_);
        }

        if (emailCommitment_ != bytes32(0)) {
            emailCommitment = emailCommitment_;
            emit EmailCommitmentUpdated(emailCommitment_);
        }

        if (address(verifier_) != address(0)) {
            zkEmailVerifier = verifier_;
            emit EmailVerifierUpdated(address(verifier_));
        }

        emit WalletInitialized(owner_, kind, binanceWallet_, emailCommitment_);
    }

    function setEmailVerifier(IZKEmailVerifier verifier) external onlyOwner {
        zkEmailVerifier = verifier;
        emit EmailVerifierUpdated(address(verifier));
    }

    function setEmailCommitment(bytes32 newCommitment) external onlyOwner {
        emailCommitment = newCommitment;
        emit EmailCommitmentUpdated(newCommitment);
    }

    function setBinanceWallet(address wallet) external onlyOwner {
        require(walletKind == WalletKind.BinanceShadow, "EmailAAWallet: not shadow wallet");
        require(wallet != address(0), "EmailAAWallet: zero wallet");
        binanceWallet = wallet;
        emit BinanceWalletUpdated(wallet);
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        _requireFromEntryPointOrOwner();
        _call(target, value, data);
    }

    function executeBatch(
        address[] calldata targets,
        bytes[] calldata payloads
    ) external {
        _requireFromEntryPointOrOwner();
        require(targets.length == payloads.length, "EmailAAWallet: length mismatch");
        for (uint256 i = 0; i < targets.length; i++) {
            _call(targets[i], 0, payloads[i]);
        }
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingFunds
    ) external override returns (uint256 validationData) {
        _requireFromEntryPoint();
        validationData = _validateSignature(userOp, userOpHash);

        if (missingFunds != 0) {
            _payPrefund(missingFunds);
        }
        return validationData;
    }

    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal returns (uint256) {
        if (userOp.signature.length == 0) {
            return SIG_VALIDATION_FAILED;
        }

        (SignatureType sigType, bytes memory payload) = abi.decode(userOp.signature, (SignatureType, bytes));

        if (sigType == SignatureType.Owner) {
            bytes memory ownerSignature = abi.decode(payload, (bytes));
            if (!SignatureChecker.isValidSignatureNow(owner, userOpHash, ownerSignature)) {
                return SIG_VALIDATION_FAILED;
            }
            return 0;
        }

        if (sigType == SignatureType.EmailZK) {
            require(address(zkEmailVerifier) != address(0), "EmailAAWallet: verifier not set");
            EmailAuth memory auth = abi.decode(payload, (EmailAuth));
            require(auth.emailCommitment == emailCommitment, "EmailAAWallet: commitment mismatch");
            require(!consumedNullifiers[auth.nullifier], "EmailAAWallet: nullifier used");
            bool verified = zkEmailVerifier.verifyProof(auth.proof, auth.emailCommitment, auth.nullifier, userOpHash);
            if (!verified) {
                return SIG_VALIDATION_FAILED;
            }
            consumedNullifiers[auth.nullifier] = true;
            emit NullifierConsumed(auth.nullifier);
            return 0;
        }

        if (sigType == SignatureType.BinanceShadow) {
            require(walletKind == WalletKind.BinanceShadow, "EmailAAWallet: wrong wallet kind");
            require(binanceWallet != address(0), "EmailAAWallet: binance wallet missing");
            BinanceAuth memory auth = abi.decode(payload, (BinanceAuth));
            if (auth.deadline != 0) {
                require(block.timestamp <= auth.deadline, "EmailAAWallet: signature expired");
            }
            if (!SignatureChecker.isValidSignatureNow(binanceWallet, userOpHash, auth.signature)) {
                return SIG_VALIDATION_FAILED;
            }
            return 0;
        }

        return SIG_VALIDATION_FAILED;
    }

    function _payPrefund(uint256 missingFunds) internal {
        (bool success, ) = payable(msg.sender).call{value: missingFunds}("");
        require(success, "EmailAAWallet: prefund failed");
    }

    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == owner,
            "EmailAAWallet: only EntryPoint or owner"
        );
    }

    function _requireFromEntryPoint() internal view {
        require(msg.sender == address(entryPoint()), "EmailAAWallet: only EntryPoint");
    }

    function _call(address target, uint256 value, bytes calldata data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, string(result));
    }
}
