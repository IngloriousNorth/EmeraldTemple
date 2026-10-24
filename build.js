import { build } from 'esbuild';
import path from 'path';

await build({
  entryPoints: ['public/js/src/main.js'],
  bundle: true,
  outfile: 'public/js/bundle.js',
  target: 'es2020',
  format: 'iife',
  define: {
    'process.env.NODE_ENV': '"development"',
    'global': 'window',
  },
  alias: {
    'path': 'path-browserify',
    'jquery_module_default' : '$'
  },
  inject: ["public/js/src/jquery-shim.js"]
}).catch(() => process.exit(1));