#!/usr/bin/env node
/** Xray Lite — repo inventory & health dump (backend + frontend)
 * Usage: node scripts/xray-lite.js [--out XRAY]
 * Outputs: XRAY/INVENTORY.md, ROUTES.md, ENV.md, PRISMA.md, SEO.md, SECURITY.md,
 *          PERFORMANCE.md, I18N.md, ADMIN.md, BUILD.json
 * No external deps. Works on Windows/PowerShell.
 */

const fs = require('fs');
const path = require('path');

const ARG_OUT = (() => {
  const i = process.argv.indexOf('--out');
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : 'XRAY';
})();

const ROOT = process.cwd();
const OUTDIR = path.resolve(ROOT, ARG_OUT);
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'out', 'build', 'dist', '.turbo', '.vercel',
  '.vscode', '.idea', '.cache', '.terraform'
]);

ensureDir(OUTDIR);

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function safeRead(p, max = 1024 * 1024) {
  try {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) return null;
    if (stat.size > max) return `/* skipped large file: ${stat.size} bytes */`;
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function exists(p) { return fs.existsSync(p); }
function walk(dir, list = []) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of ents) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, list);
    else list.push(full);
  }
  return list;
}
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }
function write(name, content) {
  fs.writeFileSync(path.join(OUTDIR, name), content, 'utf8');
  console.log('✔ wrote', path.join(ARG_OUT, name));
}

// Heuristics: detect frontend/backend
const isFrontend = exists(path.join(ROOT, 'next.config.js')) || exists(path.join(ROOT, 'pages')) || exists(path.join(ROOT, 'app'));
const isBackend  = exists(path.join(ROOT, 'prisma', 'schema.prisma')) || exists(path.join(ROOT, 'src', 'server.ts')) || exists(path.join(ROOT, 'src', 'server.js'));

// Gather basics
const pkg = readJSON(path.join(ROOT, 'package.json')) || {};
const tsconfig = readJSON(path.join(ROOT, 'tsconfig.json')) || {};
const nextConfigPath = ['next.config.js', 'next.config.mjs'].map(f => path.join(ROOT, f)).find(exists);
const nextSitemapPath = path.join(ROOT, 'next-sitemap.config.js');
const prismaSchemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
const envTsPath = path.join(ROOT, 'src', 'env.ts');
const serverTsPath = path.join(ROOT, 'src', 'server.ts');

// 1) INVENTORY
(function makeInventory() {
  const files = walk(ROOT);
  const counts = {};
  for (const f of files) {
    const ext = path.extname(f) || '(noext)';
    counts[ext] = (counts[ext] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,20);
  // Tree (depth 3)
  const tree = buildTree(ROOT, 3);

  const md = [
    `# INVENTORY`,
    ``,
    `**Repo**: ${pkg.name || path.basename(ROOT)}  |  **Version**: ${pkg.version || '-'}  |  **Type**: ${isFrontend ? 'Frontend(Next.js)' : ''} ${isBackend ? 'Backend(Fastify/Prisma)' : ''}`.trim(),
    ``,
    `## File type counts (top 20)`,
    '',
    ...top.map(([ext, n]) => `- \`${ext}\`: ${n}`),
    '',
    `## Tree (depth=3)`,
    '```',
    tree,
    '```',
  ].join('\n');
  write('INVENTORY.md', md);
})();

function buildTree(dir, depth = 3, prefix = '') {
  if (depth < 0) return '';
  const ents = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !SKIP_DIRS.has(e.name))
    .sort((a,b)=> (a.isDirectory()===b.isDirectory()? a.name.localeCompare(b.name) : a.isDirectory()? -1:1));
  let out = '';
  for (let i=0;i<ents.length;i++){
    const e = ents[i];
    const last = i === ents.length - 1;
    const line = `${prefix}${last? '└─':'├─'} ${e.name}`;
    out += line + '\n';
    if (e.isDirectory() && depth > 0) {
      out += buildTree(path.join(dir, e.name), depth-1, prefix + (last? '   ':'│  '));
    }
  }
  return out;
}

// 2) ROUTES
(function makeRoutes() {
  let lines = ['# ROUTES', ''];

  if (isBackend) {
    lines.push('## Backend (Fastify) routes (static scan)');
    const routes = scanFastifyRoutes();
    if (routes.length) {
      lines.push('\n| Method | Path | File |');
      lines.push('|---|---|---|');
      for (const r of routes) {
        lines.push(`| ${r.method} | \`${r.path}\` | \`${rel(r.file)}\` |`);
      }
    } else {
      lines.push('- No Fastify routes detected.');
    }
  }

  if (isFrontend) {
    lines.push('\n## Frontend (Next.js) pages & API');
    const pagesDir = ['pages','app'].map(d=>path.join(ROOT,d)).find(exists);
    const rows = [];
    if (pagesDir) {
      const files = walk(pagesDir).filter(f=>/\.(tsx?|mdx?)$/.test(f));
      for (const f of files) {
        const r = '/' + rel(f)
          .replace(/^pages\//,'')
          .replace(/^app\//,'')
          .replace(/index\.(tsx?|jsx|mdx?)$/,'')
          .replace(/\.(tsx?|jsx|mdx?)$/,'')
          .replace(/\[\.{3}.+?\]/g,'*')
          .replace(/\[.+?\]/g,':param');
        rows.push({ route: r.startsWith('/api')? r : r || '/', file: rel(f) });
      }
    }
    if (rows.length) {
      lines.push('\n| Route | File |');
      lines.push('|---|---|');
      for (const r of rows.sort((a,b)=>a.route.localeCompare(b.route))) {
        lines.push(`| \`${r.route}\` | \`${r.file}\` |`);
      }
    } else {
      lines.push('- No pages/app directory found.');
    }
  }

  write('ROUTES.md', lines.join('\n'));
})();

function scanFastifyRoutes() {
  const srcDir = path.join(ROOT, 'src');
  if (!exists(srcDir)) return [];
  const files = walk(srcDir).filter(f=>/\.(ts|js)$/.test(f));
  const out = [];
  const rx = /\b(app|fastify)\.(get|post|put|delete|patch|options|head)\s*\(\s*([`'"])(.+?)\3/ig;
  for (const f of files) {
    const s = safeRead(f);
    if (!s) continue;
    let m;
    while ((m = rx.exec(s))) {
      out.push({ method: m[2].toUpperCase(), path: m[4], file: f });
    }
  }
  // register(...) pattern (common in routes modules)
  const rxReg = /\bregister\(\s*([a-zA-Z0-9_$]+)\s*(?:,|\))/g;
  for (const f of files) {
    const s = safeRead(f);
    if (!s) continue;
    let m;
    while ((m = rxReg.exec(s))) {
      out.push({ method: 'REGISTER', path: m[1], file: f });
    }
  }
  return out;
}

// 3) ENV
(function makeEnv() {
  const lines = ['# ENV', ''];
  const envFiles = ['.env', '.env.local', '.env.example', '.env.development', '.env.production']
    .map(f => ({ name: f, path: path.join(ROOT, f), ok: exists(path.join(ROOT, f)) }));
  lines.push('## Present env files');
  for (const e of envFiles) lines.push(`- ${e.ok? '✅':'❌'} ${e.name}`);
  lines.push('');

  if (exists(envTsPath)) {
    const s = safeRead(envTsPath) || '';
    lines.push('## src/env.ts (detected)');
    const keys = extractZodEnvKeys(s);
    if (keys.length) {
      lines.push('\n| Key | Type/Default |');
      lines.push('|---|---|');
      for (const k of keys) {
        lines.push(`| \`${k.key}\` | ${k.typeDefault} |`);
      }
    } else {
      lines.push('- Could not parse zod env keys.');
    }
  } else {
    lines.push('## src/env.ts not found.');
  }

  write('ENV.md', lines.join('\n'));
})();

function extractZodEnvKeys(src) {
  // naive parse: find z.object({ ... })
  const out = [];
  const objMatch = src.match(/z\.object\s*\(\s*\{([\s\S]+?)\}\s*\)/m);
  if (!objMatch) return out;
  const body = objMatch[1];
  const rxLine = /([A-Z0-9_]+)\s*:\s*z\.[a-zA-Z0-9_.]+(?:\([^)]+\))?(?:\.[a-zA-Z0-9_.()]+)*/g;
  let m;
  while ((m = rxLine.exec(body))) {
    const key = m[1];
    // Try capture default()
    const line = m[0];
    let def = '';
    const dm = line.match(/\.default\(([^)]+)\)/);
    if (dm) def = `default=${dm[1].trim()}`;
    out.push({ key, typeDefault: line.replace(/\s+/g,' ').slice(line.indexOf(':')+1).trim() + (def? ` (${def})`:'') });
  }
  return out;
}

// 4) PRISMA (backend)
(function makePrisma() {
  if (!exists(prismaSchemaPath)) {
    write('PRISMA.md', '# PRISMA\n\n- prisma/schema.prisma not found.');
    return;
  }
  const s = safeRead(prismaSchemaPath) || '';
  const enums = Array.from(s.matchAll(/enum\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g)).map(m => ({
    name: m[1], values: m[2].split('\n').map(l=>l.trim()).filter(l=>l && !l.startsWith('//'))
  }));
  const models = Array.from(s.matchAll(/model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g)).map(m => ({
    name: m[1],
    fields: m[2].split('\n').map(l=>l.trim()).filter(l=> l && !l.startsWith('//') && !l.startsWith('@@'))
  }));

  const md = [
    '# PRISMA',
    '',
    '## Enums',
    enums.length ? enums.map(e=>`- **${e.name}**: ${e.values.join(', ')}`).join('\n') : '- (none)',
    '',
    '## Models & fields (raw)',
    ...models.map(m => `\n### ${m.name}\n\`\`\`\n${m.fields.join('\n')}\n\`\`\``),
  ].join('\n');
  write('PRISMA.md', md);
})();

// 5) SEO (frontend)
(function makeSEO() {
  const lines = ['# SEO', ''];
  const siteMapCfg = exists(nextSitemapPath) ? safeRead(nextSitemapPath) : null;
  if (siteMapCfg) {
    lines.push('## next-sitemap.config.js (present)\n');
    lines.push('```js');
    lines.push(siteMapCfg.trim().slice(0, 2000));
    lines.push('```');
  } else {
    lines.push('- next-sitemap.config.js not found.');
  }

  const robotsPublic = path.join(ROOT, 'public', 'robots.txt');
  const sitemapPublic = path.join(ROOT, 'public', 'sitemap.xml');
  lines.push('\n## public assets');
  lines.push(`- robots.txt: ${exists(robotsPublic) ? '✅' : '❌'}`);
  lines.push(`- sitemap.xml: ${exists(sitemapPublic) ? '✅ (generated?)' : '❌'}`);

  write('SEO.md', lines.join('\n'));
})();

// 6) SECURITY
(function makeSecurity() {
  const lines = ['# SECURITY', ''];
  if (isBackend) {
    const s = serverTsPath && exists(serverTsPath) ? safeRead(serverTsPath) : '';
    const helmet = s && /@fastify\/helmet/.test(s);
    const cors   = s && /@fastify\/cors/.test(s);
    const rate   = s && /@fastify\/rate-limit/.test(s);
    lines.push('## Backend hardening');
    lines.push(`- Helmet: ${helmet? '✅':'❌'}`);
    lines.push(`- CORS: ${cors? '✅':'❌'}`);
    lines.push(`- Rate limit: ${rate? '✅':'❌'}`);
  }
  if (isFrontend && nextConfigPath) {
    const nx = safeRead(nextConfigPath) || '';
    const headers = /headers\s*\(\)\s*\{[\s\S]+?\}/m.test(nx);
    lines.push('\n## Frontend headers() in next.config.js');
    lines.push(`- Custom headers(): ${headers? '✅':'❌'}`);
  }
  write('SECURITY.md', lines.join('\n'));
})();

// 7) PERFORMANCE
(function makePerf() {
  const lines = ['# PERFORMANCE', ''];
  const files = walk(ROOT).filter(f=>/\.(tsx?|jsx|mdx?)$/.test(f) && !/node_modules/.test(f));
  let imgCount = 0, nextImageCount = 0, dynamicImport = 0;
  for (const f of files) {
    const s = safeRead(f, 512*1024) || '';
    imgCount += (s.match(/<img\b/gi) || []).length;
    nextImageCount += (s.match(/from\s+['"]next\/image['"]/g) || []).length;
    dynamicImport += (s.match(/import\(\s*['"]/g) || []).length;
  }
  lines.push(`- Raw <img> occurrences: **${imgCount}**`);
  lines.push(`- next/image imports: **${nextImageCount}**`);
  lines.push(`- dynamic import() count: **${dynamicImport}**`);
  write('PERFORMANCE.md', lines.join('\n'));
})();

// 8) I18N
(function makeI18N() {
  const lines = ['# I18N', ''];
  // common locations
  const cand = [
    path.join(ROOT, 'public', 'i18n'),
    path.join(ROOT, 'public', 'locales'),
    path.join(ROOT, 'locales'),
    path.join(ROOT, 'src', 'locales'),
    path.join(ROOT, 'public', 'data'),
    path.join(ROOT, 'public')
  ];
  const found = cand.filter(exists);
  if (!found.length) {
    lines.push('- No common locales directories found.');
  } else {
    lines.push('## Candidate locale/data directories:');
    for (const d of found) lines.push(`- ${rel(d)}`);
    // list th/en/zh.json if present in any
    const trios = [];
    for (const d of found) {
      ['th','en','zh'].forEach(lang => {
        const p = path.join(d, `${lang}.json`);
        if (exists(p)) trios.push(rel(p));
      });
    }
    if (trios.length) {
      lines.push('\n### Found language files:');
      trios.forEach(t => lines.push(`- ${t}`));
    }
  }
  write('I18N.md', lines.join('\n'));
})();

// 9) ADMIN
(function makeAdmin() {
  const lines = ['# ADMIN', ''];
  const adminPage = path.join(ROOT, 'pages', 'adminmanager.tsx');
  const adminRouteFiles = walk(path.join(ROOT, 'src')).filter(f=>/admin/i.test(f)).slice(0,100);
  lines.push(`- Frontend page /adminmanager: ${exists(adminPage)? '✅':'❌'}`);
  lines.push('\n## Backend admin-related files (by name match)');
  lines.push(adminRouteFiles.length? adminRouteFiles.map(f=>`- ${rel(f)}`).join('\n') : '- (none)');
  write('ADMIN.md', lines.join('\n'));
})();

// 10) BUILD.json
(function makeBuildJson() {
  const obj = {
    name: pkg.name || path.basename(ROOT),
    version: pkg.version || null,
    scripts: pkg.scripts || {},
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    tsconfig: tsconfig.compilerOptions || {},
    detected: { frontend: !!isFrontend, backend: !!isBackend }
  };
  write('BUILD.json', JSON.stringify(obj, null, 2));
})();
