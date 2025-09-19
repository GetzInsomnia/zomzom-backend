#!/usr/bin/env node
/** Xray Lite v1.3 — repo inventory & health dump (backend + frontend)
 * Usage: node scripts/xray-lite.js [--out XRAY]
 * Outputs: INVENTORY.md, ROUTES.md, ENV.md, PRISMA.md, SEO.md, SECURITY.md,
 *          PERFORMANCE.md, I18N.md, ADMIN.md, BUILD.json,
 *          FASTIFY_TYPES.md, API_WIRING.md, PRISMA_STATE.md
 * No external deps.
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
  'node_modules','.git','.next','out','build','dist','.turbo','.vercel',
  '.vscode','.idea','.cache','.terraform'
]);

ensureDir(OUTDIR);
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function exists(p){ return fs.existsSync(p); }
function rel(p){ return path.relative(ROOT,p).replace(/\\/g,'/'); }
function read(p, max=1024*1024){ try{ const st=fs.statSync(p); if(st.isDirectory()) return null; if(st.size>max) return `/* skipped large file: ${st.size} bytes */`; return fs.readFileSync(p,'utf8'); }catch{ return null; } }
function write(n,c){ fs.writeFileSync(path.join(OUTDIR,n), c, 'utf8'); console.log('✔', path.join(ARG_OUT,n)); }
function readJSON(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return null; } }
function walk(dir, list=[]){
  let ents=[]; try{ ents=fs.readdirSync(dir,{withFileTypes:true}); }catch{ return list; }
  for(const e of ents){
    if(SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if(e.isDirectory()) walk(full, list);
    else list.push(full);
  }
  return list;
}

// detect
const isFrontend = exists(path.join(ROOT,'next.config.js')) || exists(path.join(ROOT,'pages')) || exists(path.join(ROOT,'app'));
const isBackend  = exists(path.join(ROOT,'prisma','schema.prisma')) || exists(path.join(ROOT,'src','server.ts')) || exists(path.join(ROOT,'src','server.js'));

const pkg = readJSON(path.join(ROOT,'package.json')) || {};
const tsconfig = readJSON(path.join(ROOT,'tsconfig.json')) || {};
const prismaSchemaPath = path.join(ROOT,'prisma','schema.prisma');
const serverTsPath = path.join(ROOT,'src','server.ts');
const envTsPath = path.join(ROOT,'src','env.ts');

// ---------- INVENTORY ----------
(function(){
  const files = walk(ROOT);
  const counts = {};
  files.forEach(f=>{ const ext=path.extname(f)||'(noext)'; counts[ext]=(counts[ext]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,20);
  const tree = buildTree(ROOT,3);

  const md = [
    `# INVENTORY`,
    ``,
    `**Repo**: ${pkg.name||path.basename(ROOT)}  |  **Version**: ${pkg.version||'-'}  |  **Type**: ${isFrontend?'Frontend(Next.js)':''} ${isBackend?'Backend(Fastify/Prisma)':''}`.trim(),
    ``,
    `## File type counts (top 20)`,
    ...top.map(([e,n])=>`- \`${e}\`: ${n}`),
    ``,
    `## Tree (depth=3)`,
    '```',
    tree,
    '```'
  ].join('\n');
  write('INVENTORY.md', md);
})();
function buildTree(dir, depth=3, prefix=''){
  if(depth<0) return '';
  let ents=[]; try{ ents=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!SKIP_DIRS.has(e.name))
    .sort((a,b)=> (a.isDirectory()===b.isDirectory()? a.name.localeCompare(b.name) : a.isDirectory()? -1:1)); }catch{ return ''; }
  let out='';
  for(let i=0;i<ents.length;i++){
    const e=ents[i], last=i===ents.length-1;
    out+=`${prefix}${last?'└─':'├─'} ${e.name}\n`;
    if(e.isDirectory() && depth>0) out+=buildTree(path.join(dir,e.name), depth-1, prefix+(last?'   ':'│  '));
  }
  return out;
}

// ---------- ROUTES ----------
(function(){
  const lines=['# ROUTES',''];

  if(isBackend){
    lines.push('## Backend (Fastify) — static scan');
    const routes = scanFastifyRoutes();
    if(routes.length){
      lines.push('\n| Method | Path/Url | File |');
      lines.push('|---|---|---|');
      routes.forEach(r=>lines.push(`| ${r.method} | \`${r.path}\` | \`${rel(r.file)}\` |`));
    }else lines.push('- No Fastify routes detected.');
  }

  if(isFrontend){
    lines.push('\n## Frontend (Next.js) pages & API');
    const pagesDir = ['pages','app'].map(d=>path.join(ROOT,d)).find(exists);
    const rows=[];
    if(pagesDir){
      const files = walk(pagesDir).filter(f=>/\.(tsx?|mdx?)$/.test(f));
      for(const f of files){
        const r = '/' + rel(f).replace(/^pages\//,'').replace(/^app\//,'')
          .replace(/index\.(tsx?|jsx|mdx?)$/,'').replace(/\.(tsx?|jsx|mdx?)$/,'')
          .replace(/\[\.{3}.+?\]/g,'*').replace(/\[.+?\]/g,':param');
        rows.push({ route: r.startsWith('/api')? r : r||'/', file: rel(f) });
      }
    }
    if(rows.length){
      lines.push('\n| Route | File |');
      lines.push('|---|---|');
      rows.sort((a,b)=>a.route.localeCompare(b.route)).forEach(r=>lines.push(`| \`${r.route}\` | \`${r.file}\` |`));
    } else lines.push('- No pages/app directory found.');
  }

  write('ROUTES.md', lines.join('\n'));
})();
function scanFastifyRoutes(){
  const srcDir = path.join(ROOT,'src');
  if(!exists(srcDir)) return [];
  const files = walk(srcDir).filter(f=>/\.(ts|js)$/.test(f));
  const out=[];
  const rx1 = /\b(app|fastify)\.(get|post|put|delete|patch|options|head)\s*\(\s*([`'"])(.+?)\3/ig;
  const rx2 = /\b(app|fastify)\.route\(\s*\{\s*method\s*:\s*([`'"])(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\2\s*,\s*url\s*:\s*([`'"])(.+?)\4/ig;
  for(const f of files){
    const s = read(f, 512*1024); if(!s) continue; let m;
    while((m=rx1.exec(s))) out.push({method: m[2].toUpperCase(), path: m[4], file:f});
    while((m=rx2.exec(s))) out.push({method: m[3].toUpperCase(), path: m[5], file:f});
  }
  return out;
}

// ---------- ENV ----------
(function(){
  const lines=['# ENV',''];
  const envFiles=['.env','.env.local','.env.example','.env.development','.env.production']
    .map(n=>({name:n, ok:exists(path.join(ROOT,n))}));
  lines.push('## Present env files');
  envFiles.forEach(e=>lines.push(`- ${e.ok?'✅':'❌'} ${e.name}`));
  lines.push('');

  if(exists(envTsPath)){
    const s=read(envTsPath)||'';
    lines.push('## src/env.ts keys (best-effort)');
    const ks = extractZodEnvKeys(s);
    if(ks.length){
      lines.push('\n| Key | Type/Default |'); lines.push('|---|---|');
      ks.forEach(k=>lines.push(`| \`${k.key}\` | ${k.typeDefault} |`));
    } else lines.push('- Could not parse zod env keys.');
  }
  write('ENV.md', lines.join('\n'));
})();
function extractZodEnvKeys(src){
  const out=[]; const m=src.match(/z\.object\s*\(\s*\{([\s\S]+?)\}\s*\)/m); if(!m) return out;
  const body=m[1]; const rx=/([A-Z0-9_]+)\s*:\s*z\.[a-zA-Z0-9_.]+(?:\([^)]+\))?(?:\.[a-zA-Z0-9_.()]+)*/g; let r;
  while((r=rx.exec(body))){
    const key=r[1], line=r[0]; const dm=line.match(/\.default\(([^)]+)\)/);
    out.push({key, typeDefault: line.replace(/\s+/g,' ').slice(line.indexOf(':')+1).trim() + (dm? ` (default=${dm[1].trim()})`: '')});
  }
  return out;
}

// ---------- PRISMA ----------
(function(){
  if(!exists(prismaSchemaPath)) return write('PRISMA.md','# PRISMA\n\n- prisma/schema.prisma not found.');
  const s=read(prismaSchemaPath)||'';
  const enums = Array.from(s.matchAll(/enum\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g)).map(m=>({name:m[1], values:m[2].split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('//'))}));
  const models= Array.from(s.matchAll(/model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g)).map(m=>({name:m[1], fields:m[2].split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('//')&&!l.startsWith('@@'))}));
  const md=['# PRISMA','',
    '## Enums', enums.length? enums.map(e=>`- **${e.name}**: ${e.values.join(', ')}`).join('\n'):'- (none)',
    '','## Models (raw)', ...models.map(m=>`\n### ${m.name}\n\`\`\`\n${m.fields.join('\n')}\n\`\`\``)
  ].join('\n');
  write('PRISMA.md', md);

  // State (folders)
  const migDir = path.join(ROOT,'prisma','migrations');
  const lines=['# PRISMA_STATE',''];
  if(exists(migDir)){
    const ents=fs.readdirSync(migDir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
    lines.push('## migrations directory'); lines.push(...ents.map(n=>`- ${n}`));
    lines.push('\n**Note:** this tool only lists folders; run `npx prisma migrate status` for live state.');
  } else lines.push('- prisma/migrations not found.');
  write('PRISMA_STATE.md', lines.join('\n'));
})();

// ---------- SEO ----------
(function(){
  const lines=['# SEO',''];
  const nextCfg = ['next.config.js','next.config.mjs'].map(f=>path.join(ROOT,f)).find(exists);
  const nextSitemap = path.join(ROOT,'next-sitemap.config.js');
  if(nextCfg){ lines.push('## next.config.* found'); lines.push(`- ${rel(nextCfg)}`); }
  else lines.push('- next.config.* not found.');
  lines.push('');
  if(exists(nextSitemap)){ lines.push('## next-sitemap.config.js (present)'); }
  else lines.push('- next-sitemap.config.js not found.');
  const robots=path.join(ROOT,'public','robots.txt'), sitemap=path.join(ROOT,'public','sitemap.xml');
  lines.push('\n## public assets');
  lines.push(`- robots.txt: ${exists(robots)?'✅':'❌'}`);
  lines.push(`- sitemap.xml: ${exists(sitemap)?'✅':'❌'}`);
  write('SEO.md', lines.join('\n'));
})();

// ---------- SECURITY ----------
(function(){
  const lines=['# SECURITY',''];
  if(isBackend){
    const s=exists(serverTsPath)? read(serverTsPath):'';
    const helmet=/@fastify\/helmet/.test(s||'');
    const cors=/@fastify\/cors/.test(s||'');
    const rate=/@fastify\/rate-limit/.test(s||'');
    const hasHealth=/\.get\s*\(\s*([`'"])\/health\1/.test(s||'') || /url\s*:\s*([`'"])\/health\1/.test(s||'');
    lines.push('## Backend hardening');
    lines.push(`- Helmet: ${helmet?'✅':'❌'}`);
    lines.push(`- CORS: ${cors?'✅':'❌'}`);
    lines.push(`- Rate limit: ${rate?'✅':'❌'}`);
    lines.push(`- /health route: ${hasHealth?'✅':'❌'}`);
  }
  write('SECURITY.md', lines.join('\n'));
})();

// ---------- PERFORMANCE ----------
(function(){
  const lines=['# PERFORMANCE',''];
  const files = walk(ROOT).filter(f=>/\.(tsx?|jsx|mdx?)$/.test(f) && !/node_modules/.test(f));
  let img=0,nextImg=0,dyn=0;
  files.forEach(f=>{ const s=read(f,512*1024)||''; img+=(s.match(/<img\b/gi)||[]).length; nextImg+=(s.match(/from\s+['"]next\/image['"]/g)||[]).length; dyn+=(s.match(/import\(\s*['"]/g)||[]).length; });
  lines.push(`- Raw <img>: **${img}**`);
  lines.push(`- next/image imports: **${nextImg}**`);
  lines.push(`- dynamic import(): **${dyn}**`);
  write('PERFORMANCE.md', lines.join('\n'));
})();

// ---------- I18N ----------
(function(){
  const lines=['# I18N',''];
  const cand=[ 'public/i18n','public/locales','locales','src/locales','public/data','public' ].map(p=>path.join(ROOT,p)).filter(exists);
  if(!cand.length) lines.push('- No common locales directories found.');
  else{
    lines.push('## Candidate locale/data directories:'); cand.forEach(d=>lines.push(`- ${rel(d)}`));
    const found=[]; for(const d of cand){ ['th','en','zh'].forEach(l=>{ const p=path.join(d,`${l}.json`); if(exists(p)) found.push(rel(p)); }); }
    if(found.length){ lines.push('\n### Found language files:'); found.forEach(f=>lines.push(`- ${f}`)); }
  }
  write('I18N.md', lines.join('\n'));
})();

// ---------- ADMIN ----------
(function(){
  const lines=['# ADMIN',''];
  const adminPage = path.join(ROOT,'pages','adminmanager.tsx');
  const adminBack = walk(path.join(ROOT,'src')).filter(f=>/admin/i.test(f)).slice(0,100);
  lines.push(`- Frontend page /adminmanager: ${exists(adminPage)?'✅':'❌'}`);
  lines.push('\n## Backend admin-related files (by name match)');
  lines.push(adminBack.length? adminBack.map(f=>`- ${rel(f)}`).join('\n'):'- (none)');
  write('ADMIN.md', lines.join('\n'));
})();

// ---------- FASTIFY_TYPES ----------
(function(){
  const lines=['# FASTIFY_TYPES',''];
  const typeFiles = walk(path.join(ROOT,'src')).filter(f=>/\.d\.ts$/.test(f));
  const aug = typeFiles.filter(f=>{ const s=read(f)||''; return /declare module ['"]fastify['"]/.test(s); });
  lines.push(`- Fastify augmentation files: ${aug.length? '✅' : '❌'}`);
  aug.forEach(f=>lines.push(`  - ${rel(f)}`));
  write('FASTIFY_TYPES.md', lines.join('\n'));
})();

// ---------- API_WIRING ----------
(function(){
  const lines=['# API_WIRING',''];
  // detect direct Prisma usage in non-backend contexts
  const files = walk(ROOT).filter(f=>/\.(tsx?|jsx?)$/.test(f) && !/node_modules/.test(f));
  const prismaImports = files.filter(f=>{ const s=read(f)||''; return /from\s+['"]@prisma\/client['"]/.test(s); });
  const nextPublicApi = files.filter(f=>{ const s=read(f)||''; return /process\.env\.NEXT_PUBLIC_API_URL/.test(s); });
  const fetchToLocal = files.filter(f=>{ const s=read(f)||''; return /fetch\(\s*['"]\/api\//.test(s); });

  lines.push('## Findings');
  lines.push(`- Files importing @prisma/client: ${prismaImports.length}`);
  prismaImports.slice(0,50).forEach(f=>lines.push(`  - ${rel(f)}`));
  lines.push(`- Files using NEXT_PUBLIC_API_URL: ${nextPublicApi.length}`);
  nextPublicApi.slice(0,50).forEach(f=>lines.push(`  - ${rel(f)}`));
  lines.push(`- Files calling Next API (/api/*): ${fetchToLocal.length}`);
  fetchToLocal.slice(0,50).forEach(f=>lines.push(`  - ${rel(f)}`));
  write('API_WIRING.md', lines.join('\n'));
})();

// ---------- BUILD.json ----------
(function(){
  const obj = {
    name: pkg.name || path.basename(ROOT),
    version: pkg.version || null,
    scripts: pkg.scripts || {},
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
    tsconfig: tsconfig.compilerOptions || {},
    detected: { frontend: !!isFrontend, backend: !!isBackend }
  };
  write('BUILD.json', JSON.stringify(obj,null,2));
})();
