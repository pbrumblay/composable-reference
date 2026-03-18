#!/usr/bin/env node
/**
 * Build (Next.js with Turbopack), pack the app into a gzip-compressed tarball
 * (.tar.gz) including .next and node_modules, then deploy to Harper via
 * deploy_component with payload (prebuilt: true).
 *
 * Usage:
 *   node scripts/build-pack-deploy.mjs [--build-only] [--pack-only] [--deploy-only]
 *
 * Env (for deploy): HARPER_OPERATIONS_URL, HARPER_USERNAME, HARPER_PASSWORD
 *   (or CLI_TARGET_USERNAME / CLI_TARGET_PASSWORD as per Harper CLI)
 */

import { createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'cbor-x';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_NAME = 'composable-reference';
const TARBALL_DIR = join(ROOT, '.deploy');
const TARBALL_PATH = join(TARBALL_DIR, `${PROJECT_NAME}.tar.gz`);

const args = process.argv.slice(2);
const buildOnly = args.includes('--build-only');
const packOnly = args.includes('--pack-only');
const deployOnly = args.includes('--deploy-only');

async function runBuild() {
  if (packOnly || deployOnly) return;
  console.log('Building Next.js app (Turbopack)...');
  execSync('next build', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_DEPLOY_MARKER: new Date().toISOString() } });
}

function runPack() {
  if (deployOnly) {
    if (!existsSync(TARBALL_PATH)) {
      console.error('No tarball found. Run without --deploy-only first, or run pack.');
      process.exit(1);
    }
    return;
  }
  if (buildOnly) return;

  if (!existsSync(join(ROOT, '.next'))) {
    console.error('No .next folder. Run build first.');
    process.exit(1);
  }

  console.log('Creating compressed tarball (project + .next + node_modules)...');
  if (!existsSync(TARBALL_DIR)) mkdirSync(TARBALL_DIR, { recursive: true });
  if (existsSync(TARBALL_PATH)) rmSync(TARBALL_PATH);

  const exclude = [
    '.git',
    '.env',
    '.env.*',
    '.cursor',
    '.deploy',
    '*.tar',
    '*.tar.gz',
    'node_modules/.cache',
    'node_modules/harperdb',  // runtime provided by target; do not package
  ];
  const excludeArgs = exclude.flatMap((e) => ['--exclude', e]);

  // -h = dereference symlinks (e.g. in node_modules) so server gets real files
  execFileSync(
    'tar',
    ['-czhf', TARBALL_PATH, '-C', ROOT, ...excludeArgs, '.'],
    { cwd: ROOT, stdio: 'inherit', maxBuffer: 50 * 1024 * 1024 }
  );
  console.log('Tarball written to', TARBALL_PATH);
}

async function runDeploy() {
  if (buildOnly || packOnly) return;

  const url = process.env.HARPER_OPERATIONS_URL || process.env.CLI_TARGET;
  const username = process.env.HARPER_USERNAME || process.env.CLI_TARGET_USERNAME;
  const password = process.env.HARPER_PASSWORD || process.env.CLI_TARGET_PASSWORD;
  console.log('url:', url);
  console.log('username:', username);
  
  if (!url || !username || !password) {
    console.error('Set HARPER_OPERATIONS_URL, HARPER_USERNAME, HARPER_PASSWORD (or CLI_TARGET, CLI_TARGET_USERNAME, CLI_TARGET_PASSWORD).');
    process.exit(1);
  }

  const operationsUrl = url.replace(/\/+$/, '');
  const deployUrl = operationsUrl.includes('://') ? operationsUrl : `https://${operationsUrl}`;

  console.log('Reading compressed tarball and encoding...');
  const chunks = [];
  for await (const chunk of createReadStream(TARBALL_PATH)) chunks.push(chunk);
  const payload = Buffer.concat(chunks);

  const body = {
    operation: 'deploy_component',
    project: PROJECT_NAME,
    payload,
    replicated: true,
  };

  const cborBody = encode(body);

  console.log('Deploying to', deployUrl, '...');
  const res = await fetch(deployUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    },
    body: cborBody,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Deploy failed:', res.status, res.statusText, text);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));
  console.log('Deployed:', data.message || data);
}

async function main() {
  await runBuild();
  runPack();
  await runDeploy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
