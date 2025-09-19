#!/usr/bin/env node
/** Xray Lite v1.4 — repo inventory & health dump (backend + frontend)
 * Usage: node scripts/xray-lite.js [--out XRAY]
 * Adds: CHECKS.md (pre-dev checklist verification)
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

// ---------- helpers ----------
function parseDotEnvFile(p){
  const out = {};
  if(!exists(p)) return out;
  const s = read(p, 256*1024) || '';
  s.split(/\r?\n/).forEach(line=>{
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if(!m) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1,-1);
    }
    out[m[1]] = v;
  });
  return out;
}
function addCheck(lines, label, ok, info=''){
  lines.push(`- ${ok? '✅':'❌'} ${label}${info? ` — ${info}`:''}`);
}
function posBefore(s, a, b){
  const ia = s.indexOf(a), ib = s.indexOf(b);
  if(ia === -1 || ib === -1) return null;
  return ia < ib;
}

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

  const migDir = path.join(ROOT,'prisma','migrations');
  const lines=['# PRISMA_STATE',''];
  if(exists(migDir)){
    const ents=fs.readdirSync(migDir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
    lines.push('## migrations directory'); lines.push(...ents.map(n=>`- ${n}`));
    lines.push('\n**Note:** run `npx prisma migrate status` for live state.');
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
  lines.push(`- sitemap.xml: ${exists(sitemap)?'✅ (maybe generated)':'❌'}`);
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
  const srcDir = path.join(ROOT,'src');
  const adminBack = exists(srcDir) ? walk(srcDir).filter(f=>/admin/i.test(f)).slice(0,200) : [];
  lines.push(`- Frontend page /adminmanager: ${exists(adminPage)?'✅':'❌'}`);
  lines.push('\n## Backend admin-related files (name match)');
  lines.push(adminBack.length? adminBack.map(f=>`- ${rel(f)}`).join('\n'):'- (none)');
  write('ADMIN.md', lines.join('\n'));
})();

// ---------- FASTIFY_TYPES ----------
(function(){
  const lines=['# FASTIFY_TYPES',''];
  const srcDir = path.join(ROOT,'src');
  const typeFiles = exists(srcDir) ? walk(srcDir).filter(f=>/\.d\.ts$/.test(f)) : [];
  const aug = typeFiles.filter(f=>{ const s=read(f)||''; return /declare module ['"]fastify['"]/.test(s); });
  lines.push(`- Fastify augmentation files: ${aug.length? '✅' : '❌'}`);
  aug.forEach(f=>lines.push(`  - ${rel(f)}`));
  write('FASTIFY_TYPES.md', lines.join('\n'));
})();

// ---------- ROUTES_AUTH_GUARD ----------
(function () {
  const lines = ['# ROUTES_AUTH_GUARD', ''];
  const srcDir = path.join(ROOT, 'src');
  const routeFiles = exists(srcDir) ? walk(srcDir).filter(f => /\/routes\.ts$/.test(f)) : [];

  const badImports = [];
  const missingAuth = [];
  const good = [];

  for (const f of routeFiles) {
    const s = read(f) || '';
    const hasBad = /import\s*\{\s*authenticate\s*\}\s*from\s*['"][.\/\w-]+authGuard['"]/.test(s);
    const usesAppAuth = /preHandler\s*:\s*\[\s*app\.authenticate\s*\]/.test(s);
    if (hasBad) badImports.push(rel(f));
    if (!usesAppAuth && /auth\/routes\.ts$/.test(f) === false) {
      // อนุโลมไฟล์ที่ไม่ได้ต้อง auth ทุก handler แต่เตือนให้เช็คเอง
      missingAuth.push(rel(f));
    }
    if (!hasBad) good.push(rel(f));
  }

  lines.push(`- files scanned: ${routeFiles.length}`);
  lines.push(`- no "import { authenticate } ...authGuard": ${badImports.length === 0 ? '✅' : '❌'}`);
  badImports.forEach(f => lines.push(`  - remove bad import in ${f}`));

  if (missingAuth.length) {
    lines.push('- ⚠ routes that do not use app.authenticate anywhere (manual review):');
    missingAuth.slice(0,50).forEach(f => lines.push(`  - ${f}`));
  }

  write('ROUTES_AUTH_GUARD.md', lines.join('\n'));
})();

// ---------- ROUTE_GUARDS ----------
(function(){
  const lines=['# ROUTE_GUARDS',''];
  const srcDir = path.join(ROOT,'src');
  const files = exists(srcDir) ? walk(srcDir).filter(f => /[\\/]modules[\\/].+?[\\/]routes\.ts$/.test(f)) : [];
  const badImports = [];
  const bareAuth = [];

  for(const f of files){
    const s = read(f) || '';
    if (/import\s*\{\s*authenticate\s*\}\s*from\s*['"][^'"]*authGuard['"]/.test(s)) {
      badImports.push(f);
    }
    if (/\bpreHandler\s*:\s*\[?\s*authenticate\b/.test(s)) {
      bareAuth.push(f);
    }
  }

  lines.push(`- No route file imports { authenticate } from authGuard: ${badImports.length===0?'✅':'❌'}`);
  badImports.forEach(f => lines.push('  - ' + rel(f)));

  lines.push(`- Use app.authenticate (not bare "authenticate") in preHandler: ${bareAuth.length===0?'✅':'❌'}`);
  bareAuth.forEach(f => lines.push('  - ' + rel(f)));

  write('ROUTE_GUARDS.md', lines.join('\n'));
})();


// ---------- API_WIRING ----------
(function(){
  const lines=['# API_WIRING',''];
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

// ---------- CHECKS (pre-dev checklist) ----------
(function(){
  const lines = ['# CHECKS (pre-dev)', ''];

  // .env checks
  const envPath = path.join(ROOT,'.env');
  const envObj = parseDotEnvFile(envPath);
  addCheck(lines, '.env file present', exists(envPath));
  addCheck(lines, 'DATABASE_URL present', !!envObj.DATABASE_URL, envObj.DATABASE_URL ? '' : 'add to .env');
  const jwtLen = (envObj.JWT_SECRET||'').length;
  addCheck(lines, 'JWT_SECRET present (>=32 chars)', !!envObj.JWT_SECRET && jwtLen>=32, envObj.JWT_SECRET? `length=${jwtLen}`:'missing');
  addCheck(lines, 'CORS_ORIGIN present', !!envObj.CORS_ORIGIN, envObj.CORS_ORIGIN || 'missing');

  // server.ts checks
  const s = exists(serverTsPath) ? read(serverTsPath, 1024*1024) : '';
  addCheck(lines, 'server.ts exists', !!s, s? '' : 'src/server.ts missing');
  if(s){
    addCheck(lines, 'helmet/cors/rate-limit registered',
      /@fastify\/helmet/.test(s) && /@fastify\/cors/.test(s) && /@fastify\/rate-limit/.test(s)
    );
    const hasJwtReg = /register\(\s*jwtPlugin/.test(s);
    addCheck(lines, 'jwtPlugin registered', hasJwtReg);
    const jwtBeforeAuth = posBefore(s, 'register(jwtPlugin', 'registerAuthRoutes(');
    addCheck(lines, 'jwtPlugin BEFORE registerAuthRoutes', jwtBeforeAuth===true, jwtBeforeAuth===null? 'unable to verify order':'');
    const hasHealth = /\.get\s*\(\s*([`'"])\/health\1/.test(s) || /url\s*:\s*([`'"])\/health\1/.test(s);
    addCheck(lines, '/health route exists', hasHealth);
    const listen0 = /listen\(\s*\{\s*[^}]*host\s*:\s*['"]0\.0\.0\.0['"]/s.test(s);
    addCheck(lines, "app.listen host '0.0.0.0'", listen0);
  }

  // Fastify type augmentation
  const typesDir = path.join(ROOT,'src','types');
  const dtsFiles = exists(typesDir) ? walk(typesDir).filter(f=>/\.d\.ts$/.test(f)) : [];
  const hasFastifyAug = dtsFiles.some(f => /declare module ['"]fastify['"]/.test(read(f)||''));
  addCheck(lines, 'src/types/*.d.ts with fastify augmentation', hasFastifyAug);

  // tsconfig include
  const include = (tsconfig && tsconfig.include) || [];
  const hasTypesInclude = include.some(p => /src\/types\/\*\*\/\*\.d\.ts/.test(p) || /src\/\*\*\/\*\.d\.ts/.test(p));
  addCheck(lines, 'tsconfig.include includes .d.ts', hasTypesInclude, include.length? `include=${JSON.stringify(include)}`:'no include array');

  // Prisma migration & seed
  const migDir = path.join(ROOT,'prisma','migrations');
  const hasMigDir = exists(migDir);
  const migFolders = hasMigDir? fs.readdirSync(migDir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name) : [];
  addCheck(lines, 'prisma/migrations present', hasMigDir, hasMigDir? `${migFolders.length} folders`:'');
  addCheck(lines, 'has 000_init migration folder', migFolders.includes('000_init'));
  addCheck(lines, 'prisma/seed.light.ts present', exists(path.join(ROOT,'prisma','seed.light.ts')));

  // package.json scripts
  const scripts = (pkg && pkg.scripts) || {};
  addCheck(lines, 'package.json script: dev', !!scripts.dev);
  addCheck(lines, 'package.json script: seed:light', !!scripts['seed:light']);
  addCheck(lines, 'package.json script: generate', !!scripts['generate']);

  write('CHECKS.md', lines.join('\n'));
})();

// ---------- CHECKS (pre-dev) ----------
(function () {
  const lines = ['# CHECKS (pre-dev)', ''];

  // .env existence & keys
  const envPath = path.join(ROOT, '.env');
  const hasEnv = exists(envPath);
  lines.push(`- ${hasEnv ? '✅' : '❌'} .env file present`);
  let envContent = hasEnv ? read(envPath, 256 * 1024) : '';
  const needKeys = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'];
  for (const k of needKeys) {
    const ok = hasEnv && new RegExp(`^${k}=`, 'm').test(envContent || '');
    if (k === 'JWT_SECRET' && ok) {
      const m = (envContent || '').match(/^JWT_SECRET=(.+)$/m);
      const len = m ? (m[1] || '').trim().length : 0;
      lines.push(`- ${len >= 32 ? '✅' : '❌'} JWT_SECRET present (>=32 chars) — length=${len}`);
    } else {
      lines.push(`- ${ok ? '✅' : '❌'} ${k} present`);
    }
  }

  // server.ts presence & plugin order
  const serverSrc = exists(serverTsPath) ? read(serverTsPath, 512 * 1024) : '';
  lines.push(`- ${serverSrc ? '✅' : '❌'} src/server.ts exists`);
  if (serverSrc) {
    const hasImportAug = /import\s+['"]\.\/types\/fastify['"]/.test(serverSrc || '');
    lines.push(`- import './types/fastify' in server.ts: ${hasImportAug ? '✅' : '❌'}`);

    const hasHelmet = /@fastify\/helmet/.test(serverSrc || '');
    const hasCors = /@fastify\/cors/.test(serverSrc || '');
    const hasRate = /@fastify\/rate-limit/.test(serverSrc || '');
    const hasHealth = /\/health/.test(serverSrc || '');
    lines.push(`- helmet/cors/rate-limit registered: ${hasHelmet && hasCors && hasRate ? '✅' : '❌'}`);
    lines.push(`- /health route exists: ${hasHealth ? '✅' : '❌'}`);

    const idxJwt = (serverSrc || '').indexOf('register(jwtPlugin');
    const idxAuthRoutes = (serverSrc || '').indexOf('registerAuthRoutes');
    const orderOk = idxJwt !== -1 && idxAuthRoutes !== -1 && idxJwt < idxAuthRoutes;
    lines.push(`- jwtPlugin BEFORE registerAuthRoutes: ${orderOk ? '✅' : '❌'}`);
  }

  // tsconfig include .d.ts
  const tsconf = readJSON(path.join(ROOT, 'tsconfig.json')) || {};
  const includes = (tsconf.include || []).join(' | ');
  const hasDts = /src\/\*\*\/\*\.d\.ts/.test(includes);
  lines.push(`- tsconfig.include includes .d.ts — include=${hasDts ? '✅' : '❌'} "${includes || '-'}"`);

  // prisma/migrations presence
  const migDir = path.join(ROOT, 'prisma', 'migrations');
  const migOk = exists(migDir) && fs.readdirSync(migDir).some(n => n !== 'migration_lock.toml');
  lines.push(`- prisma/migrations present — ${migOk ? '✅' : '❌'}`);

  // seed.light
  const seedLight = path.join(ROOT, 'prisma', 'seed.light.ts');
  lines.push(`- prisma/seed.light.ts present: ${exists(seedLight) ? '✅' : '❌'}`);

  // scripts
  const pkgJson = readJSON(path.join(ROOT, 'package.json')) || {};
  const scripts = pkgJson.scripts || {};
  lines.push(`- package.json script: dev ${scripts.dev ? '✅' : '❌'}`);
  lines.push(`- package.json script: seed:light ${scripts['seed:light'] ? '✅' : '❌'}`);
  lines.push(`- package.json script: generate ${scripts.generate ? '✅' : '❌'}`);

  write('CHECKS.md', lines.join('\n'));
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

// ---------- CHECKLIST (preflight) ----------
(function () {
  const lines = ['# CHECKLIST (preflight)', ''];

  // A) ห้าม import .d.ts แบบ runtime
  const server = path.join(ROOT, 'src', 'server.ts');
  const serverSrc = exists(server) ? read(server) : '';
  const badImport = serverSrc && /import\s+['"]\.\/types\/fastify['"]/.test(serverSrc);
  const typeImport = serverSrc && /import\s+type\s+['"]\.\/types\/fastify['"]/.test(serverSrc);

  lines.push(`- server.ts uses runtime import of .d.ts: ${badImport ? '❌ (fix to import type or remove)' : '✅'}`);
  lines.push(`- server.ts uses \`import type './types/fastify'\`: ${typeImport ? '✅' : (badImport ? '❌' : '–')}`);

  // B) tsconfig include .d.ts
  const ts = readJSON(path.join(ROOT, 'tsconfig.json')) || {};
  const include = (ts.include || []).join(' ');
  const seesDts = /src\/\*\*\/\*\.d\.ts/.test(include);
  lines.push(`- tsconfig includes src/**/*.d.ts: ${seesDts ? '✅' : '❌'}`);

  // C) jwtPlugin registered before routes
  const jwtFirst = serverSrc && /register\(jwtPlugin\)[\s\S]+register\(/.test(serverSrc);
  lines.push(`- jwtPlugin registered before routes: ${jwtFirst ? '✅' : '❌'}`);

  // D) health route
  const hasHealth = serverSrc && (/\.get\(\s*['"]\/health['"]/.test(serverSrc) || /url\s*:\s*['"]\/health['"]/.test(serverSrc));
  lines.push(`- /health route present: ${hasHealth ? '✅' : '❌'}`);

  write('CHECKLIST.md', lines.join('\n'));
})();

// ---------- FASTIFY_AUGMENTATION_GUARD ----------
(function(){
  const lines=['# FASTIFY_AUGMENTATION_GUARD',''];
  const srcDir = path.join(ROOT, 'src');
  const globalDts = path.join(srcDir, 'global.d.ts');
  lines.push(`- src/global.d.ts present: ${exists(globalDts) ? '✅' : '❌'}`);

  const tsFiles = exists(srcDir) ? walk(srcDir).filter(f => /\.(ts|tsx)$/.test(f)) : [];
  const bad = tsFiles.filter(f => /import\s+['"][.\/]types\/fastify['"]/.test(read(f)||''));
  lines.push(`- no runtime imports of ./types/fastify: ${bad.length===0 ? '✅' : '❌'}`);
  bad.forEach(f => lines.push(`  - ${rel(f)}`));

  // triple-slash reference ต้องชี้ไปที่ ../global.d.ts เท่านั้น (ถ้ามีใช้)
  const jwtFile = path.join(srcDir, 'auth', 'jwt.ts');
  const jwtSrc = exists(jwtFile) ? read(jwtFile) : '';
  const hasTriple = /\/\/\/\s*<reference\s+path="(\.\.\/)+global\.d\.ts"\s*\/>/.test(jwtSrc||'');
  lines.push(`- jwt.ts has triple-slash reference to ../global.d.ts (optional): ${hasTriple ? '✅' : '–'}`);

  write('FASTIFY_AUGMENTATION.md', lines.join('\n'));
})();

