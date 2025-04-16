require('esbuild').build({
  entryPoints: ['src/client/client.ts'],
  bundle: true,
  outfile: 'raycasle/bundle.js',
  format: 'esm',
  loader: {
    '.glb': 'file',
  },
  assetNames: 'models/[name]',
}).catch(() => process.exit(1))
