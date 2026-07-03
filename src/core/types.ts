import type { ConnectConfig } from 'ssh2'
import type { ClientFactory } from './connection'

/**
 * SFTP uploader options shared by the unplugin factory and the standalone
 * `SftpUploader` class.
 */
export interface SftpUploaderOptions {
  /**
   * Local directory whose contents will be uploaded.
   */
  localDir: string

  /**
   * Remote directory the files will be uploaded to.
   * Optional when used as a standalone uploader (e.g. `uploadFile` / `exec`).
   */
  remoteDir?: string

  /**
   * SSH connection settings passed straight to `ssh2.ConnectConfig`.
   */
  connect: ConnectConfig

  /**
   * Filenames in the remote directory to keep when clearing it before upload.
   */
  rmExclude?: string[]

  /**
   * Skip upload when not running in production.
   *
   * - `true`:  always upload (no production gate).
   * - `false`: only upload when `NODE_ENV === 'production'`.
   * - `undefined` (default): auto-detect via `NODE_ENV`.
   */
  production?: boolean

  /**
   * Factory for the `ssh2.Client` instance. Mostly useful for tests — leave
   * unset in production.
   */
  clientFactory?: ClientFactory
}
