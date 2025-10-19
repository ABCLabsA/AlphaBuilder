// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IZKEmailVerifier
 * @dev Minimal interface for a zk-email verifier contract. The verifier checks that an email-based
 *      zero-knowledge proof was generated correctly off-chain and corresponds to the stored commitment.
 */
interface IZKEmailVerifier {
    /**
     * @notice Validates the zk proof against the expected context.
     * @param proof Groth16/Plonk or other circuit proof bytes (opaque to this contract).
     * @param emailCommitment Hash of the email address and login metadata (Poseidon/MiMC/Keccak commitment).
     * @param nullifier Unique nullifier to prevent proof re-use across sessions.
     * @param userOpHash ERC-4337 user operation hash being authorized.
     * @return True if the proof is valid; false otherwise.
     */
    function verifyProof(
        bytes calldata proof,
        bytes32 emailCommitment,
        bytes32 nullifier,
        bytes32 userOpHash
    ) external view returns (bool);
}
