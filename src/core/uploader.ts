import type { SftpUploaderOptions } from './types'
import { SftpConnection } from './connection'
import { generateDirectoryTree } from './directory-tree'
import { exists, mkdir, readdir, uploadFile } from './file-ops'

export type { SftpUploaderOptions } from './types'

/**
 * Build a SFTP uploader and run `start()` to mirror a local directory onto
 * the remote. Can also be used as a low-level uploader by calling the exposed
 * `connect / uploadFile / exists / readdir / deleteFiles / exec / mkdir / close`
 * methods directly.
 */
export class SftpUploader {
  private readonly connection: SftpConnection
  private readonly localDir: string
  private readonly remoteDir: string
  private readonly rmExclude: string[]

  constructor(options: SftpUploaderOptions) {
    if (!options.localDir)
      throw new Error('[simple-sftp-uploader] `localDir` is required')
    if (!options.connect)
      throw new Error('[simple-sftp-uploader] `connect` is required')

    this.connection = new SftpConnection(options.connect, options.clientFactory)
    this.localDir = options.localDir
    this.remoteDir = options.remoteDir ?? '/'
    this.rmExclude = options.rmExclude ?? []
  }

  /** Mirror `localDir` onto `remoteDir`. */
  async start(): Promise<void> {
    await this.connection.connect()
    const sftp = this.connection.getSftp()
    const tree = generateDirectoryTree(this.localDir, this.remoteDir)

    if (await exists(sftp, this.remoteDir)) {
      const files = await readdir(sftp, this.remoteDir)
      for (const filename of files) {
        if (this.rmExclude.includes(filename))
          continue
        await this.connection.exec(`rm -rf ${this.remoteDir}/${filename}`)
      }
    }

    for (let i = 0; i < tree.local.length; i++) {
      const local = tree.local[i]
      const remote = tree.remote[i]
      await mkdir(sftp, remote)
      await uploadFile(sftp, local, remote)
    }

    this.close()
  }

  /** Close the connection. Safe to call multiple times. */
  close(): void {
    this.connection.close()
  }

  /** Open the connection and resolve once ready. */
  connect(): Promise<void> {
    return this.connection.connect()
  }

  /** Upload a single file. */
  async uploadFile(local: string, remote: string): Promise<void> {
    const sftp = this.connection.getSftp()
    await mkdir(sftp, remote)
    await uploadFile(sftp, local, remote)
  }

  /** Whether a remote file or directory exists. */
  exists(remote: string): Promise<boolean> {
    return exists(this.connection.getSftp(), remote)
  }

  /** Read a remote directory's entries. */
  readdir(remote: string): Promise<string[]> {
    return readdir(this.connection.getSftp(), remote)
  }

  /**
   * Delete every file under `remote` except those matching `exclude` (RegExp)
   * or listed in the constructor's `rmExclude` array.
   */
  async deleteFiles(remote: string, exclude?: RegExp): Promise<void> {
    const sftp = this.connection.getSftp()
    if (!(await exists(sftp, remote)))
      return

    const files = await readdir(sftp, remote)
    for (const filename of files) {
      if (exclude?.test(filename))
        continue
      if (this.rmExclude.includes(filename))
        continue
      await this.connection.exec(`rm -rf ${remote}/${filename}`)
    }
  }

  /** Run a shell command on the remote. */
  exec(command: string): Promise<{ stdout: string, stderr: string, code: number }> {
    return this.connection.exec(command)
  }

  /** Recursively create a remote directory. */
  mkdir(remote: string): Promise<void> {
    return mkdir(this.connection.getSftp(), remote)
  }
}
