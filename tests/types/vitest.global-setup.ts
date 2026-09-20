import { join } from 'node:path'
import { packConsumerTarballs, writePackManifest } from '../../scripts/pack-consumer-tarballs.mjs'

const PACK_DIR =
  process.env.THEMEON_CONSUMER_PACK_DIR ??
  join(import.meta.dirname, '..', '..', '.tmp-consumer-packs')

export async function setup() {
  if (!process.env.THEMEON_CONSUMER_PACK_DIR) {
    const packages = packConsumerTarballs(PACK_DIR)
    writePackManifest(PACK_DIR, packages)
  }
  process.env.THEMEON_CONSUMER_PACK_DIR = PACK_DIR
}

export async function teardown() {
  // Tarballs are reused across local runs; directory is gitignored.
}
