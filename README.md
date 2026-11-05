# Spray

Spray cash at celebrations, on-chain. A host creates an event, guests send stablecoins from their phone, and a live wall shows every spray as it lands. Built around Nigerian owambe culture, usable anywhere.

## What it does

- **Create an event** with up to 10 recipients and any percentage split (the couple, the MC, the DJ).
- **Two modes**
  - **Live:** every spray goes to the recipients straight away.
  - **Pot:** sprays are held in escrow until an unlock time the host picks (up to 90 days). After that anyone can settle the Pot and recipients can withdraw.
- **Refunds:** if the host cancels a Pot before it unlocks, every contributor can claim a full refund.
- **Live wall / projector page** for the venue screen, showing each guest's display name and amount as sprays arrive.
- **Naira equivalent** shown next to amounts, using a rate the host sets for the event.
- **Recipients withdraw** their own balance from the contract. Nobody else can.

## How it works

| Page | Route | Who | What |
|---|---|---|---|
| Home | `/` | everyone | Start or find an event |
| Create | `/create` | host | Name, recipients and splits, mode, unlock time, naira rate |
| Guest | `/e/:id` | guests | Connect a wallet, approve the token, spray with a display name |
| Wall | `/wall/:id` | venue screen | Live feed of sprays |
| Host | `/host` | host | Manage your events: cancel a Pot before unlock, close an event |
| Recipient | `/recipient` | recipients | Withdraw balances, claim Pot refunds |

## Smart contract (`contracts/Spray.sol`)

- Works with any ERC-20 that has **6 decimals** (the token address is fixed when the contract is deployed).
- Limits: 0.10 minimum and 20 maximum per spray, 200 per event.
- No owner, admin, pause or upgrade functions. The deployer has no special rights after deployment.
- Hosts can only manage their own events. Recipients can only withdraw their own balance.
- Reentrancy-guarded transfers. **Unaudited**: the small limits are deliberate.

## Networks

| `VITE_NETWORK` | Network | Token |
|---|---|---|
| `bohr` (default) | BOT Bohr testnet (chain 968) | `tUSDC`, a worthless test token with a free `claim()` (`contracts/TestUSDC.sol`) |
| `botmainnet` | BOT Chain mainnet (chain 677) | USDT, checked to be 6 decimals at deploy time |
| `arc` | Arc mainnet (chain 5042) | USDC (the original deployment) |

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, Framer Motion. Contracts in Solidity 0.8.28 with OpenZeppelin, compiled with solc (paris, via-IR, optimizer 200).

## Run it

```bash
npm install --legacy-peer-deps
npm run wallet:new          # prints a new wallet; fund it with test BOT from https://faucet.botchain.ai/basic
```

Set the private key for this terminal session only (never put it in a file):

```powershell
$env:DEPLOYER_KEY = "0x..."     # PowerShell
```
```bash
export DEPLOYER_KEY=0x...       # macOS / Linux
```

```bash
npm run deploy:bohr         # deploys TestUSDC + Spray, writes .env and deployments/bohr.json
npm run status:bohr         # read-only health check of the deployment
npm run dev                 # run the app
npm run demo:bohr           # optional: scripted end-to-end run with throwaway wallets, testnet only
npm run build               # production build into dist/
```

Mainnet: `npm run deploy:botmainnet` deploys only Spray, and refuses to continue unless the RPC is chain 677, the USDT contract exists, and it has exactly 6 decimals. It then asks you to type `DEPLOY MAINNET`.

## Environment variables

`npm run deploy:*` writes these into `.env` for you (public addresses only; never put a private key in a file).

| Variable | Meaning |
|---|---|
| `VITE_NETWORK` | `bohr`, `botmainnet` or `arc` |
| `VITE_SPRAY_ADDRESS` | Deployed Spray contract |
| `VITE_TOKEN_ADDRESS` | TestUSDC address (testnet only) |
| `VITE_SPRAY_DEPLOY_BLOCK` | Block of the Spray deployment, where the wall starts reading logs |

On a host such as Netlify, set the same variables in the site settings. The build fails with a clear message if one is missing. Deployed addresses and deployment transactions are saved in `deployments/<network>.json`.

## Contract tests

```bash
npm run contracts:test      # Foundry tests in contracts/test
```

## Project structure

```
contracts/    Spray.sol, TestUSDC.sol, Foundry tests
scripts/bohr/ compile, deploy, status and demo scripts (plain Node, no Foundry needed)
src/          React app (pages, components, hooks, network config)
public/       static files (Netlify single-page-app redirect)
deployments/  deployed addresses and transaction hashes per network
```
