#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const AFMBRIDGE_REPO = 'obinnanwachukwu1/afmbridge'
const DEFAULT_VERSION = 'v1.3.0'
const DEFAULT_BINARY_NAME = 'afmbridge-server'
const KNOWN_CHECKSUMS = {
  'v1.3.0': '6ff0180daac24ec895a64cb86ac4da694f843657500e540a36b8274270a5cc2c',
}

function parseArgs(argv) {
  const out = {
    force: false,
    version: process.env.AFMBRIDGE_VERSION || DEFAULT_VERSION,
    dryRun: false,
  }
  for (const arg of argv) {
    if (arg === '--force') out.force = true
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg.startsWith('--version=')) out.version = arg.slice('--version='.length)
  }
  return out
}

function sha256OfFile(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function resolveBinaryUrl(version) {
  if (process.env.AFMBRIDGE_BINARY_URL) return process.env.AFMBRIDGE_BINARY_URL
  return `https://raw.githubusercontent.com/${AFMBRIDGE_REPO}/${version}/release/${DEFAULT_BINARY_NAME}`
}

async function downloadBinary(url, destinationTmp) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download afmbridge binary (${response.status} ${response.statusText})`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destinationTmp, bytes)
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  const shouldFetch = process.platform === 'darwin' && process.arch === 'arm64'
  if (!shouldFetch) {
    console.log('[afmbridge] Skipping binary download (only required for darwin arm64 builds).')
    return
  }

  const expectedSha =
    (process.env.AFMBRIDGE_SHA256 || KNOWN_CHECKSUMS[opts.version] || '').trim().toLowerCase()
  const sourceUrl = resolveBinaryUrl(opts.version)

  const destDir = path.resolve(process.cwd(), 'resources', 'bin')
  const destPath = path.join(destDir, DEFAULT_BINARY_NAME)
  const tmpPath = `${destPath}.tmp`

  fs.mkdirSync(destDir, { recursive: true })

  if (!opts.force && fs.existsSync(destPath)) {
    if (!expectedSha) {
      console.log('[afmbridge] Binary already present; checksum not configured, keeping existing file.')
      return
    }
    const existingSha = sha256OfFile(destPath)
    if (existingSha === expectedSha) {
      console.log(`[afmbridge] Binary already present and verified (${opts.version}).`)
      return
    }
    console.warn('[afmbridge] Existing binary checksum mismatch; refreshing file.')
  }

  console.log(`[afmbridge] Fetching ${DEFAULT_BINARY_NAME} (${opts.version})...`)
  console.log(`[afmbridge] Source: ${sourceUrl}`)

  if (opts.dryRun) {
    console.log('[afmbridge] Dry run enabled, not downloading.')
    return
  }

  await downloadBinary(sourceUrl, tmpPath)

  const downloadedSha = sha256OfFile(tmpPath)
  if (expectedSha && downloadedSha !== expectedSha) {
    fs.rmSync(tmpPath, { force: true })
    throw new Error(
      `Checksum verification failed. Expected ${expectedSha}, got ${downloadedSha}.`,
    )
  }

  fs.renameSync(tmpPath, destPath)
  fs.chmodSync(destPath, 0o755)
  console.log(`[afmbridge] Binary ready at ${destPath}`)
  console.log(`[afmbridge] SHA-256: ${downloadedSha}`)
}

main().catch((error) => {
  console.error(`[afmbridge] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
