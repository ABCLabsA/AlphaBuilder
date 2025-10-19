// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

import "./EmailAAWallet.sol";
import "./IZKEmailVerifier.sol";

/**
 * @title EmailAAFactory
 * @dev Deterministic CREATE2 factory for EmailAAWallet accounts.
 */
contract EmailAAFactory {
    event AccountCreated(
        address indexed account,
        address indexed owner,
        EmailAAWallet.WalletKind indexed kind,
        address shadowWallet,
        bytes32 emailCommitment,
        uint256 salt
    );

    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint entryPoint_) {
        entryPoint = entryPoint_;
    }

    function createAccount(
        address owner,
        EmailAAWallet.WalletKind kind,
        address binanceWallet,
        bytes32 emailCommitment,
        IZKEmailVerifier verifier,
        uint256 salt
    ) external returns (EmailAAWallet account) {
        bytes32 innerSalt = _computeSalt(owner, kind, binanceWallet, emailCommitment, verifier, salt);
        address predicted = _computeAddress(innerSalt);
        if (predicted.code.length > 0) {
            return EmailAAWallet(payable(predicted));
        }

        account = EmailAAWallet(payable(address(new EmailAAWallet{salt: innerSalt}(entryPoint))));
        account.initialize(owner, kind, binanceWallet, emailCommitment, verifier);
        emit AccountCreated(address(account), owner, kind, binanceWallet, emailCommitment, salt);
    }

    function getAddress(
        address owner,
        EmailAAWallet.WalletKind kind,
        address binanceWallet,
        bytes32 emailCommitment,
        IZKEmailVerifier verifier,
        uint256 salt
    ) external view returns (address) {
        bytes32 innerSalt = _computeSalt(owner, kind, binanceWallet, emailCommitment, verifier, salt);
        return _computeAddress(innerSalt);
    }

    function _computeAddress(bytes32 innerSalt) internal view returns (address) {
        bytes memory deploymentData = abi.encodePacked(
            type(EmailAAWallet).creationCode,
            abi.encode(entryPoint)
        );
        bytes32 codeHash = keccak256(deploymentData);
        bytes32 addressHash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), innerSalt, codeHash)
        );
        return address(uint160(uint256(addressHash)));
    }

    function _computeSalt(
        address owner,
        EmailAAWallet.WalletKind kind,
        address binanceWallet,
        bytes32 emailCommitment,
        IZKEmailVerifier verifier,
        uint256 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(owner, kind, binanceWallet, emailCommitment, verifier, salt));
    }
}
