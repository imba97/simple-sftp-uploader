import type { UnpluginContextMeta } from 'unplugin'
import { describe, expect, it } from 'vitest'
import unplugin, { factory, SftpUploader } from '../src/factory'

const meta = {} as UnpluginContextMeta

const baseOptions = {
  localDir: process.cwd(),
  remoteDir: '/var/www',
  connect: { host: 'example.com', username: 'root' }
}

describe('unplugin factory', () => {
  it('exposes a default unplugin instance with the six bundler adapters', () => {
    expect(typeof unplugin).toBe('object')
    expect(typeof unplugin.vite).toBe('function')
    expect(typeof unplugin.webpack).toBe('function')
    expect(typeof unplugin.rollup).toBe('function')
    expect(typeof unplugin.rolldown).toBe('function')
    expect(typeof unplugin.rspack).toBe('function')
    expect(typeof unplugin.esbuild).toBe('function')
  })

  it('re-exports the SftpUploader class for standalone use', () => {
    expect(typeof SftpUploader).toBe('function')
  })

  it('produces a plugin definition with name, enforce and writeBundle', () => {
    const plugin = factory(baseOptions, meta)
    expect(plugin.name).toBe('simple-sftp-uploader')
    expect(plugin.enforce).toBe('post')
    expect(typeof plugin.writeBundle).toBe('function')
    expect(plugin.vite?.apply).toBe('build')
  })

  it('throws when `localDir` is missing', () => {
    expect(() => factory({ ...baseOptions, localDir: '' as string }, meta))
      .toThrow(/localDir/)
  })

  it('skips the upload when not running in production (default)', async () => {
    const prev = process.env.NODE_ENV
    delete process.env.NODE_ENV
    const plugin = factory({ ...baseOptions, production: false }, meta)
    await expect(plugin.writeBundle?.call({} as never)).resolves.toBeUndefined()
    process.env.NODE_ENV = prev
  })
})
