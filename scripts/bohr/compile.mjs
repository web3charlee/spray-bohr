// Compiles Spray.sol and TestUSDC.sol with solc 0.8.28 (same settings as foundry.toml: paris, via-IR, optimizer 200).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import solc from 'solc'
import { BUILD_DIR, ROOT } from './lib.mjs'

export function compileAll() {
  const names = ['Spray', 'TestUSDC']
  const sources = Object.fromEntries(
    names.map(n => [`contracts/${n}.sol`, { content: fs.readFileSync(path.join(ROOT, 'contracts', `${n}.sol`), 'utf8') }]),
  )
  const findImports = p => {
    for (const base of [path.join(ROOT, 'node_modules'), ROOT]) {
      const f = path.join(base, p)
      if (fs.existsSync(f)) return { contents: fs.readFileSync(f, 'utf8') }
    }
    return { error: `Import not found: ${p} (did you run npm install?)` }
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: 'paris',
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  }
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  const errors = (out.errors || []).filter(e => e.severity === 'error')
  for (const e of out.errors || []) console.log(`${e.severity.toUpperCase()}: ${e.formattedMessage.split('\n')[0]}`)
  if (errors.length) {
    console.error('\nCompile failed.')
    process.exit(1)
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true })
  for (const file of Object.values(out.contracts)) {
    for (const [name, c] of Object.entries(file)) {
      if (!names.includes(name)) continue
      fs.writeFileSync(
        path.join(BUILD_DIR, `${name}.json`),
        JSON.stringify({ contractName: name, abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }),
      )
    }
  }
  console.log(`Compiled ${names.join(' + ')} with solc ${solc.version().split('+')[0]} -> contracts/build/`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) compileAll()
