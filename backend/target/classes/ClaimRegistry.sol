// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TerraNode ClaimRegistry
 * @dev Enterprise immutable registry for ZK-proven AgriStack crop damage claims.
 */
contract ClaimRegistry {

    struct ClaimRecord {
        address farmerWallet;
        string damageType;
        string imageHash;
        string zkProofIntegrity;
        uint256 timestamp;
        bool verified;
    }

    // Mapping from unique JWT derived claim UUID to its on-chain record
    mapping(string => ClaimRecord) public claims;

    event ClaimAnchored(string indexed claimId, address indexed farmerWallet, string damageType, uint256 timestamp);

    /**
     * @dev Called by the Spring Boot Backend Server acting as the oracle upon successful Gemini verification.
     */
    function anchorVerifiedClaim(
        string memory _claimId,
        address _farmerWallet,
        string memory _damageType,
        string memory _imageHash,
        string memory _zkProofIntegrity
    ) public {
        require(claims[_claimId].timestamp == 0, "Claim ID already registered on-chain");

        claims[_claimId] = ClaimRecord({
            farmerWallet: _farmerWallet,
            damageType: _damageType,
            imageHash: _imageHash,
            zkProofIntegrity: _zkProofIntegrity,
            timestamp: block.timestamp,
            verified: true
        });

        emit ClaimAnchored(_claimId, _farmerWallet, _damageType, block.timestamp);
    }
}
