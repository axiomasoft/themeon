export interface PackManifestPackage {
  name: string
  version: string
  tarball: string
  sha256: string
  dir: string
}

export interface PackManifest {
  schema_version: string
  generated_at: string
  pack_destination: string
  packages: PackManifestPackage[]
}

export interface TarballOverride {
  packageName: string
  tarballPath: string
}
