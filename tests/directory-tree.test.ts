import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateDirectoryTree } from '../src/core/directory-tree'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sftp-uploader-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('generateDirectoryTree', () => {
  it('throws when the local directory does not exist', () => {
    expect(() => generateDirectoryTree(`${root}/missing`, '/remote'))
      .toThrow(/missing/)
  })

  it('returns an empty tree for an empty directory', () => {
    const tree = generateDirectoryTree(root, '/remote')
    expect(tree.local).toEqual([])
    expect(tree.remote).toEqual([])
  })

  it('walks nested files and mirrors them under the remote root', () => {
    writeFileSync(join(root, 'a.txt'), 'a')
    mkdirSync(join(root, 'sub'))
    writeFileSync(join(root, 'sub', 'b.txt'), 'b')
    mkdirSync(join(root, 'sub', 'deep'))
    writeFileSync(join(root, 'sub', 'deep', 'c.txt'), 'c')

    const tree = generateDirectoryTree(root, '/var/www')

    expect(tree.local.sort()).toEqual([
      join(root, 'a.txt').replace(/\\/g, '/'),
      join(root, 'sub/b.txt').replace(/\\/g, '/'),
      join(root, 'sub/deep/c.txt').replace(/\\/g, '/')
    ].sort())
    expect(tree.remote.sort()).toEqual([
      '/var/www/a.txt',
      '/var/www/sub/b.txt',
      '/var/www/sub/deep/c.txt'
    ].sort())
  })

  it('two consecutive calls do not share state (no module-level leakage)', () => {
    writeFileSync(join(root, 'first.txt'), '1')
    const first = generateDirectoryTree(root, '/first')
    const second = generateDirectoryTree(root, '/second')

    expect(first.remote[0]).toBe('/first/first.txt')
    expect(second.remote[0]).toBe('/second/first.txt')
    expect(first.remote).not.toEqual(second.remote)
  })
})
