// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Spray} from "../Spray.sol";
import {TestUSDC} from "../TestUSDC.sol";

/// Deploys TestUSDC + Spray(TestUSDC) to BOT Bohr testnet.
/// Run with a FRESH testnet-only key (never your Arc deployer key):
///   forge script contracts/script/DeployBohr.s.sol --rpc-url https://rpc.bohr.life \
///     --private-key $BOHR_DEPLOYER_KEY --broadcast
contract DeployBohr is Script {
    function run() external {
        vm.startBroadcast();
        TestUSDC token = new TestUSDC();
        Spray spray = new Spray(address(token));
        vm.stopBroadcast();

        console2.log("TestUSDC:", address(token));
        console2.log("Spray   :", address(spray));
        console2.log("Deploy block:", block.number);
        console2.log("--- paste into .env.bohr ---");
        console2.log("VITE_NETWORK=bohr");
    }
}
