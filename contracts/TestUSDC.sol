// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Spray Test USDC (tUSDC)
/// @notice TESTNET ONLY. A worthless ERC-20 with 6 decimals that mirrors USDC so the
///         Spray contract (which hard-codes 6-decimal amounts) behaves exactly as on Arc.
///         Anyone can claim a small amount once per cooldown. It has no value and must
///         never be listed, bridged or presented as real USDC.
contract TestUSDC is ERC20 {
    uint256 public constant CLAIM_AMOUNT = 100e6; // 100 tUSDC
    uint256 public constant CLAIM_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastClaimAt;

    error ClaimTooSoon(uint256 retryAt);

    constructor() ERC20("Spray Test USDC (testnet, no value)", "tUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice One-click faucet: mints CLAIM_AMOUNT to the caller, once per cooldown.
    function claim() external {
        uint256 last = lastClaimAt[msg.sender];
        if (last != 0 && block.timestamp < last + CLAIM_COOLDOWN) {
            revert ClaimTooSoon(last + CLAIM_COOLDOWN);
        }
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
    }
}
