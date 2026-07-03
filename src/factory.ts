import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { SftpUploaderOptions } from './core/types'
import process from 'node:process'
import { createUnplugin } from 'unplugin'
import { SftpUploader } from './core/uploader'

export type { SftpUploaderOptions } from './core/types'
export { SftpUploader } from './core/uploader'

/**
 * Single unplugin factory. Used by `index.ts` (default import) and re-exposed
 * by every per-bundler subpath entry (`vite`, `webpack`, `rollup`, `rolldown`,
 * `rspack`, `esbuild`).
 */
export const factory: UnpluginFactory<SftpUploaderOptions, false> = (rawOptions) => {
  if (!rawOptions.localDir)
    throw new Error('[simple-sftp-uploader] `localDir` is required')

  return {
    name: 'simple-sftp-uploader',
    enforce: 'post',

    /**
     * Unified "after the bundle is written" hook. unplugin wires this to:
     *
     * - rollup / vite / rolldown → `writeBundle`
     * - webpack / rspack         → `compiler.hooks.afterEmit.tapPromise`
     * - esbuild                  → `build.onEnd`
     *
     * Run unless the caller explicitly opted out via `production: false` and
     * `NODE_ENV` isn't `production`.
     */
    async writeBundle() {
      if (rawOptions.production !== true && process.env.NODE_ENV !== 'production')
        return

      const uploader = new SftpUploader(rawOptions)
      try {
        // eslint-disable-next-line no-console
        console.log(`[simple-sftp-uploader]: uploading to ${rawOptions.remoteDir ?? '(default)'}`)
        await uploader.start()
      }
      finally {
        uploader.close()
      }
    },

    /**
     * On Vite dev server, `writeBundle` never fires. We opt out of dev to
     * avoid surprising uploads while the user is iterating.
     */
    vite: {
      apply: 'build'
    }
  }
}

/** Cached unplugin instance — shared by the root entry and every subpath. */
export const unplugin: UnpluginInstance<SftpUploaderOptions> = createUnplugin(factory)
export default unplugin
