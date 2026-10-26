import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('vendor', { recursive: true });
await build({ entryPoints: ['node_modules/@supabase/supabase-js/dist/index.mjs'], bundle: true, format: 'esm', platform: 'browser', minify: true, outfile: 'vendor/supabase.js', legalComments: 'eof' });
// Static deployments may keep serving the repository root; build output works too.
await mkdir('dist/vendor', { recursive: true });
for (const file of ['index.html', 'styles.css', 'src.js', 'workflows.js', 'vendor/supabase.js']) await copyFile(file, `dist/${file}`);
console.log('Static application built in dist/; repository-root hosting remains supported.');
