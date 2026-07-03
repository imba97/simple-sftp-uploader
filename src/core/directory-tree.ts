import fs from 'node:fs'

export interface DirectoryTree {
  /** Absolute/relative local file paths, POSIX-style. */
  local: string[]
  /** Mirroring remote file paths, joined onto `remote`. */
  remote: string[]
}

/**
 * Recursively walk a local directory and produce the parallel list of remote
 * paths, mirroring the directory structure onto `remote`.
 *
 * @throws when the local source directory does not exist.
 */
export function generateDirectoryTree(local: string, remote: string): DirectoryTree {
  if (!fs.existsSync(local))
    throw new Error(`${local} 不存在`)

  const tree: DirectoryTree = { local: [], remote: [] }
  walk(local, { local, remote }, tree)
  return tree
}

interface BasePath {
  local: string
  remote: string
}

function walk(src: string, basePath: BasePath, tree: DirectoryTree): void {
  const entries = fs.readdirSync(src)
  for (const entry of entries) {
    const filePath = `${src}/${entry}`
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      const posix = filePath.replace(/\\/g, '/')
      tree.local.push(posix)
      tree.remote.push(`${basePath.remote}${filePath.replace(basePath.local, '').replace(/\\/g, '/')}`)
    }
    else if (stat.isDirectory()) {
      walk(filePath, basePath, tree)
    }
  }
}
