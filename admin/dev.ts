// Local dev: `bun --hot admin/dev.ts` (run from admin/ so bunfig.toml loads the Tailwind plugin) → http://localhost:5174
import index from './index.html';

const port = Number(process.env.PORT ?? 5174);
Bun.serve({ port, routes: { '/*': index }, development: { hmr: true, console: true } });
console.log(`admin on http://localhost:${port}`);
