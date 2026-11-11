// Build: `bun admin/build.ts`. Deploy: `bunx wrangler deploy --config admin/wrangler.jsonc`.
import tailwind from 'bun-plugin-tailwind';

const out = `${import.meta.dir}/dist`;
await Bun.$`rm -rf ${out}`;
const res = await Bun.build({ entrypoints: [`${import.meta.dir}/index.html`], outdir: out, minify: true, plugins: [tailwind], define: { 'process.env.BUN_PUBLIC_SUPABASE_URL': '""', 'process.env.BUN_PUBLIC_SUPABASE_KEY': '""' } });
if (!res.success) { console.error(res.logs); process.exit(1); }
console.log(`built ${out}`);
