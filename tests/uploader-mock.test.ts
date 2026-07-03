import type { SFTPWrapper, Client as SSHClient } from 'ssh2'
import type { ClientFactory } from '../src/core/connection'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SftpConnection } from '../src/core/connection'
import { SftpUploader } from '../src/core/uploader'

interface SftpMock {
  exists: ReturnType<typeof vi.fn>
  readdir: ReturnType<typeof vi.fn>
  mkdir: ReturnType<typeof vi.fn>
  fastPut: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

interface ClientMock {
  emit: (event: string, ...args: unknown[]) => boolean
  removeAllListeners: (event?: string) => unknown
  sftp: ReturnType<typeof vi.fn>
  connect: ReturnType<typeof vi.fn>
  exec: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  __sftp: SftpMock
}

/** Build a fake ssh2.Client backed by vitest mock functions. */
function makeMockClient(): ClientMock {
  const sftpMock: SftpMock = {
    exists: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    fastPut: vi.fn(),
    end: vi.fn()
  }
  const emitter = new EventEmitter() as unknown as ClientMock
  emitter.sftp = vi.fn((cb: (err: null, sftp: SFTPWrapper) => void) => {
    cb(null, sftpMock as unknown as SFTPWrapper)
  })
  emitter.connect = vi.fn()
  emitter.exec = vi.fn((_cmd: string, cb: (err: null, stream: EventEmitter & { stderr: EventEmitter }) => void) => {
    const stream = new EventEmitter() as EventEmitter & { stderr: EventEmitter }
    stream.stderr = new EventEmitter()
    process.nextTick(() => {
      stream.emit('close', 0)
    })
    cb(null, stream)
  })
  emitter.end = vi.fn()
  emitter.__sftp = sftpMock
  return emitter
}

let lastClient: ClientMock | undefined

const clientFactory: ClientFactory = () => {
  lastClient = makeMockClient()
  return lastClient as unknown as SSHClient
}

afterEach(() => {
  lastClient?.removeAllListeners()
  lastClient = undefined
})

describe('sftpConnection', () => {
  it('opens the SSH + SFTP channels and exposes the subsystem', async () => {
    const conn = new SftpConnection({ host: 'example.com', username: 'root' }, clientFactory)
    const promise = conn.connect()
    lastClient!.emit('ready')
    await promise
    expect(conn.isReady).toBe(true)
    conn.close()
    expect(lastClient!.__sftp.end).toHaveBeenCalledTimes(1)
  })

  it('rejects when the underlying client emits an error', async () => {
    const conn = new SftpConnection({ host: 'example.com', username: 'root' }, clientFactory)
    const promise = conn.connect()
    const err = new Error('boom')
    lastClient!.emit('error', err)
    await expect(promise).rejects.toBe(err)
  })
})

describe('sftpUploader', () => {
  it('throws when constructed without `localDir`', () => {
    expect(() => new SftpUploader({ connect: { host: 'x', username: 'y' } } as never))
      .toThrow(/localDir/)
  })

  it('uses the injected client factory and uploads a file', async () => {
    const uploader = new SftpUploader({
      localDir: process.cwd(),
      remoteDir: '/var/www',
      connect: { host: 'example.com', username: 'root' },
      clientFactory
    })

    const connectPromise = uploader.connect()
    lastClient!.emit('ready')
    await connectPromise

    const sftpMock = lastClient!.__sftp
    sftpMock.exists.mockImplementation((_p: string, cb: (v: boolean) => void) => cb(false))
    sftpMock.mkdir.mockImplementation((_p: string, _o: unknown, cb: () => void) => cb())
    sftpMock.fastPut.mockImplementation((_l: string, _r: string, cb: (e: null) => void) => cb(null))

    await uploader.uploadFile('a.txt', '/var/www/a.txt')

    expect(sftpMock.fastPut).toHaveBeenCalledWith('a.txt', '/var/www/a.txt', expect.any(Function))
    expect(sftpMock.mkdir).toHaveBeenCalled()
    uploader.close()
  })
})
