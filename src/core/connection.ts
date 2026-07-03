import type { Buffer } from 'node:buffer'
import type { ConnectConfig, SFTPWrapper } from 'ssh2'
import { Client as SSHClient } from 'ssh2'

/** Factory that returns a fresh `ssh2.SSHClient`. Replace in tests. */
export type ClientFactory = () => SSHClient

const defaultClientFactory: ClientFactory = () => new SSHClient()

/**
 * Thin Promise-friendly wrapper around an `ssh2.SSHClient` and its SFTP
 * subsystem. Owns the connection lifecycle and exposes a single channel for
 * higher-level file operations.
 */
export class SftpConnection {
  private readonly client: SSHClient
  private sftp?: SFTPWrapper

  constructor(
    private readonly config: ConnectConfig,
    private readonly clientFactory: ClientFactory = defaultClientFactory
  ) {
    this.client = this.clientFactory()
  }

  /** Open the SSH + SFTP channels. Resolves once both are ready. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = (): void => {
        this.client.sftp((err, sftp) => {
          if (err) {
            reject(err)
            return
          }
          this.sftp = sftp
          resolve()
        })
      }

      this.client.once('ready', onReady)
      this.client.once('error', reject)
      this.client.connect(this.config)
    })
  }

  /** Run a command on the remote shell. Resolves once the stream closes. */
  exec(command: string): Promise<{ stdout: string, stderr: string, code: number }> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err)
          return
        }
        let stdout = ''
        let stderr = ''
        stream
          .on('close', (code: number) => {
            resolve({ stdout, stderr, code: code ?? 0 })
          })
          .on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
          })
        stream.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString()
        })
      })
    })
  }

  /** Return whether the connection is currently open. */
  get isReady(): boolean {
    return Boolean(this.sftp)
  }

  /** Expose the underlying SFTP subsystem (throws if not connected). */
  getSftp(): SFTPWrapper {
    if (!this.sftp)
      throw new Error('SFTP channel is not open. Call connect() first.')
    return this.sftp
  }

  /** Close the SFTP + SSH channels. Safe to call multiple times. */
  close(): void {
    this.sftp?.end()
    this.client.end()
  }
}
