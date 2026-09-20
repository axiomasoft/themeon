export function packConsumerTarballs(destDir: string): Array<{
  name: string
  version: string
  tarball: string
  sha256: string
  dir: string
}>

export function writePackManifest(
  destDir: string,
  packages: ReturnType<typeof packConsumerTarballs>,
): string
