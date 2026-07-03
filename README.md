# simple-sftp-uploader

> Upload the `dist/` of your project to a remote server via SFTP. **Bundler-agnostic unplugin** for vite, rollup, rolldown, webpack, rspack and esbuild.

Built on top of [unplugin](https://unplugin.unjs.io), so the same package works across every mainstream bundler — and can also be used as a plain SFTP client.

## Features

- ✅ One package, six bundler integrations (`vite`, `rollup`, `rolldown`, `webpack`, `rspack`, `esbuild`)
- ✅ Subpath imports so consumers can opt into a single bundler: `simple-sftp-uploader/vite`
- ✅ Standalone `SftpUploader` class for scripting / CI use
- ✅ Strict TypeScript, fully async/await, no `any`
- ✅ Automatic production gate (skips dev / watch builds)
- ✅ Backed by `ssh2` — supports private key + password auth

## Install

```bash
pnpm add -D simple-sftp-uploader
# or
npm install -D simple-sftp-uploader
```

## Configuration

```ts
import fs from 'node:fs'

const sftpUploaderConfig = {
  localDir: 'dist', // local directory to mirror
  remoteDir: '/var/www/example.com', // remote target
  connect: {
    host: '1.2.3.4',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('C:/Users/you/.ssh/id_rsa')
  },
  rmExclude: ['favicon.ico'] // files in remoteDir to keep when clearing
  // production: true,        // force-run even in dev (default: auto)
}
```

## Usage

### Pick the right subpath for your bundler

| Bundler  | Import                                |
| -------- | ------------------------------------- |
| vite     | `simple-sftp-uploader/vite`           |
| rollup   | `simple-sftp-uploader/rollup`         |
| rolldown | `simple-sftp-uploader/rolldown`       |
| webpack  | `simple-sftp-uploader/webpack`        |
| rspack   | `simple-sftp-uploader/rspack`         |
| esbuild  | `simple-sftp-uploader/esbuild`        |
| any      | `simple-sftp-uploader` (multi-export) |

### Vite

```ts
import SftpUploader from 'simple-sftp-uploader/vite'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    SftpUploader({
      localDir: 'dist',
      remoteDir: '/var/www/example.com',
      connect: { host: '1.2.3.4', username: 'root', privateKey: '<your-private-key>' }
    })
  ]
})
```

### Webpack

```js
// webpack.config.js
const SftpUploader = require('simple-sftp-uploader/webpack').default

module.exports = {
  plugins: [
    new SftpUploader({
      localDir: 'dist',
      remoteDir: '/var/www/example.com',
      connect: { host: '1.2.3.4', username: 'root', privateKey: '<your-private-key>' }
    })
  ]
}
```

### Rspack

```ts
// rspack.config.ts
import SftpUploader from 'simple-sftp-uploader/rspack'

export default {
  plugins: [
    SftpUploader({ /* same options */ })
  ]
}
```

### Rollup

```ts
// rollup.config.ts
import SftpUploader from 'simple-sftp-uploader/rollup'

export default {
  plugins: [
    SftpUploader({ /* same options */ })
  ]
}
```

### Esbuild

```ts
import { build } from 'esbuild'
import SftpUploader from 'simple-sftp-uploader/esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    SftpUploader({ /* same options */ })
  ]
})
```

### Multi-bundler (default export)

If you don't know which bundler your consumer is on, the default export resolves to the right shape automatically.

```ts
import SftpUploader from 'simple-sftp-uploader'

// Use as a vite plugin
SftpUploader.vite({ /* options */ })

// Use as a webpack plugin
const Plugin = SftpUploader.webpack({ /* options */ })
```

### Standalone uploader (CI / scripts)

```ts
import { SftpUploader } from 'simple-sftp-uploader'

const uploader = new SftpUploader({
  localDir: 'dist',
  remoteDir: '/var/www/example.com',
  connect: { host: '1.2.3.4', username: 'root', privateKey: fs.readFileSync('key') }
})

await uploader.start()
// or drive it manually:
await uploader.connect()
await uploader.uploadFile('local.txt', '/var/www/example.com/local.txt')
await uploader.close()
```

### Public API on `SftpUploader`

```ts
class SftpUploader {
  constructor(options: SftpUploaderOptions)

  // Bulk mirror (used by the unplugin writeBundle hook)
  start(): Promise<void>

  // Low-level
  connect(): Promise<void>
  uploadFile(local: string, remote: string): Promise<void>
  exists(remote: string): Promise<boolean>
  readdir(remote: string): Promise<string[]>
  deleteFiles(remote: string, exclude?: RegExp): Promise<void>
  exec(command: string): Promise<{ stdout: string, stderr: string, code: number }>
  mkdir(remote: string): Promise<void>
  close(): void
}
```

## Configuration reference

| Field         | Type                  | Required | Default        | Description |
| ------------- | --------------------- | -------- | -------------- | ----------- |
| `localDir`    | `string`              | ✅       | —              | Local directory to mirror. |
| `remoteDir`   | `string`              | ❌       | `/`            | Remote target directory. Optional when used as a low-level uploader. |
| `connect`     | `ssh2.ConnectConfig`  | ✅       | —              | SSH connection settings (`host`, `username`, `privateKey` or `password`, etc.). |
| `rmExclude`   | `string[]`            | ❌       | `[]`           | Filenames in `remoteDir` to keep when clearing it. |
| `production`  | `boolean`             | ❌       | `auto (NODE_ENV)` | `true` forces upload in any env, `false` requires `NODE_ENV=production`. |

## Development

```bash
pnpm install      # install deps (allowBuilds: esbuild, simple-git-hooks)
pnpm stub         # build .ts entries in-place for local testing
pnpm build        # produce dist/ (ESM + dts)
pnpm test         # vitest run
pnpm lint         # eslint (uses @antfu/eslint-config)
pnpm typecheck    # tsc --noEmit
```

`pnpm release` runs [`bumpp`](https://github.com/antfu/bumpp) to bump the version, commit, tag, and push — the [release workflow](.github/workflows/release.yaml) takes over from there to publish on npm and generate the GitHub release via `changelogithub`.

## License

[MIT](./LICENSE)
