// Build script for Vercel / local dev.
// Flat project layout: the web files live next to this script (no src/ folder needed).
// It copies the static files to public/, vendors supabase-js, and writes public/config.js from environment variables.
// Only PUBLIC values go to the browser: the Supabase project URL and the anon (public) key. Never put a service_role key here.
const fs = require('fs'), path = require('path');
const root = __dirname, out = path.join(root, 'public');

// Where the web files live: ./src if someone adds that folder, otherwise the project root.
const src = fs.existsSync(path.join(root, 'src')) && fs.statSync(path.join(root, 'src')).isDirectory() ? path.join(root, 'src') : root;
const FILES = ['index.html', 'style.css', 'game.js', 'net-adapter.js'];

// minimal .env loader for local development (Vercel injects real env vars)
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch (e) {}

const missing = FILES.filter(f => !fs.existsSync(path.join(src, f)));
if (missing.length) { console.error('Missing files in ' + src + ': ' + missing.join(', ')); process.exit(1); }

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(src, f), path.join(out, f));

const lib = path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
if (!fs.existsSync(lib)) { console.error('Missing @supabase/supabase-js. Run: npm install'); process.exit(1); }
fs.copyFileSync(lib, path.join(out, 'vendor', 'supabase.js'));

const cfg = { SUPABASE_URL: process.env.SUPABASE_URL || '', SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '' };
fs.writeFileSync(path.join(out, 'config.js'), 'window.CPB_CONFIG=' + JSON.stringify(cfg) + ';\n');
if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) console.warn('WARNING: SUPABASE_URL / SUPABASE_ANON_KEY not set. Local play works, online rooms are disabled.');
console.log('Build OK -> public/ (' + FILES.length + ' files + vendor/supabase.js + config.js)');
