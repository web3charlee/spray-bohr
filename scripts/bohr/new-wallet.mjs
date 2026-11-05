// Generates a brand-new wallet. Use it as your BOT-only deployer. Nothing is saved to disk.
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const key = generatePrivateKey()
const account = privateKeyToAccount(key)
console.log('\nNew wallet (shown once, nothing is saved):\n')
console.log('  Address     :', account.address)
console.log('  Private key :', key)
console.log('\nSave the private key somewhere safe (a password manager). Anyone who has it controls the wallet.')
console.log('Never commit it, paste it in a chat, or put it in a .env file.')
console.log('\nNext: send test BOT to the address from https://faucet.botchain.ai/basic, then in the SAME terminal:')
console.log('  PowerShell:  $env:DEPLOYER_KEY = "<the private key>"')
console.log('  Mac/Linux:   export DEPLOYER_KEY=<the private key>')
console.log('  then:        npm run deploy:bohr\n')
