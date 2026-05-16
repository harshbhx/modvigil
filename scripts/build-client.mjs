import { build } from 'esbuild';

await build({
  entryPoints: ['src/client/main.tsx'],
  bundle: true,
  outfile: 'webroot/bundle.js',
  format: 'iife',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  logLevel: 'info',
});
