#!/usr/bin/env node
/**
 * Generates the initial Prisma migration by reproducing the manual workflow:
 *   1. mkdir -p prisma/migrations/<timestamp>_init
 *   2. npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_init/migration.sql
 *
 * Run via `npm run migrate:init` to keep the required mkdir + diff sequence in sync.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const migrationsRoot = path.join(projectRoot, 'prisma', 'migrations');

if (!fs.existsSync(migrationsRoot)) {
  console.error('The prisma/migrations directory does not exist.');
  process.exit(1);
}

const now = new Date();
const timestamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, '0'),
  String(now.getUTCDate()).padStart(2, '0'),
  String(now.getUTCHours()).padStart(2, '0'),
  String(now.getUTCMinutes()).padStart(2, '0'),
  String(now.getUTCSeconds()).padStart(2, '0')
].join('');

const migrationFolderName = `${timestamp}_init`;
const migrationDir = path.join(migrationsRoot, migrationFolderName);

if (fs.existsSync(migrationDir)) {
  console.error(`Migration directory ${migrationFolderName} already exists.`);
  process.exit(1);
}

fs.mkdirSync(migrationDir, { recursive: true });

const prismaArgs = [
  'prisma',
  'migrate',
  'diff',
  '--from-empty',
  '--to-schema-datamodel',
  'prisma/schema.prisma',
  '--script'
];

const result = spawnSync('npx', prismaArgs, {
  cwd: projectRoot,
  encoding: 'utf-8'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.status ?? 1);
}

const migrationSqlPath = path.join(migrationDir, 'migration.sql');
fs.writeFileSync(migrationSqlPath, result.stdout, 'utf-8');

if (result.stderr) {
  process.stderr.write(result.stderr);
}

console.log(`Initial migration written to ${path.relative(projectRoot, migrationSqlPath)}`);

