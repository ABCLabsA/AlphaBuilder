// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../IZKEmailVerifier.sol";

contract ZKEmailVerifierMock is IZKEmailVerifier {
    bool public shouldApprove;

    constructor(bool approve) {
        shouldApprove = approve;
    }

    function setShouldApprove(bool approve) external {
        shouldApprove = approve;
    }

    function verifyProof(
        bytes calldata,
        bytes32,
        bytes32,
        bytes32
    ) external view override returns (bool) {
        return shouldApprove;
    }
}
