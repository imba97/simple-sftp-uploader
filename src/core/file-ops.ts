import type { SFTPWrapper } from 'ssh2'
import path from 'node:path'

/** Check whether a file or directory exists on the remote. */
export function exists(sftp: SFTPWrapper, target: string): Promise<boolean> {
  return new Promise((resolve) => {
    sftp.exists(target, (isExists) => {
      resolve(isExists)
    })
  })
}

/** List the entries inside a remote directory. Returns `[]` if missing. */
export async function readdir(sftp: SFTPWrapper, target: string): Promise<string[]> {
  if (!(await exists(sftp, target)))
    return []

  return new Promise((resolve, reject) => {
    sftp.readdir(target, (err, handle) => {
      if (err) {
        reject(err)
        return
      }
      resolve(handle.map(item => item.filename))
    })
  })
}

/**
 * Recursively create the remote directory tree leading up to `dirPath`.
 * Resolves immediately when the path already exists.
 */
export async function mkdir(sftp: SFTPWrapper, dirPath: string): Promise<void> {
  const parts = path.dirname(dirPath).replace(/^\//, '').split('/').filter(Boolean)
  let acc = ''
  for (const segment of parts) {
    acc += `/${segment}`
    // Single round-trip: try to create and treat "already exists" as success.
    // ssh2's mkdir is not recursive, so we walk one segment at a time.
    await new Promise<void>((resolve, reject) => {
      sftp.mkdir(acc, { mode: 0o755 }, (err) => {
        if (!err || /exist/i.test(String(err?.message ?? err)))
          resolve()
        else
          reject(err)
      })
    })
  }
}

/** Upload a single file from local to remote. Rejects on SFTP error. */
export function uploadFile(sftp: SFTPWrapper, local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => {
      if (err)
        reject(err)
      else
        resolve()
    })
  })
}
