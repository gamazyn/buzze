import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['../server/dist/server.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'resources/server-bundle.mjs',
  external: ['fsevents', 'bufferutil', 'utf-8-validate', 'canvas'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
})
