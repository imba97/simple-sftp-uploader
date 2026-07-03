import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/vite',
    'src/webpack',
    'src/rollup',
    'src/rolldown',
    'src/rspack',
    'src/esbuild'
  ],
  rollup: {
    emitCJS: false,
    esbuild: {
      minify: true,
      target: 'es2022'
    },
    inlineDependencies: true,
    dts: {
      respectExternal: false
    }
  },
  clean: true,
  declaration: true
})
