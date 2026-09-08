#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WEBP_RIFF = 'RIFF';
const WEBP_TAG = 'WEBP';

export function validateImageHeader(buffer, extension) {
  const ext = extension.toLowerCase();
  if (ext !== '.webp') return null;

  const prefix = buffer.subarray(0, 48).toString('ascii').trimStart();
  if (prefix.startsWith('UklG')) {
    return 'Base64 text detected in a .webp file; decode it to binary WebP bytes before committing';
  }

  if (
    buffer.length < 12 ||
    buffer.subarray(0, 4).toString('ascii') !== WEBP_RIFF ||
    buffer.subarray(8, 12).toString('ascii') !== WEBP_TAG
  ) {
    return 'invalid WebP header; expected RIFF....WEBP magic bytes';
  }

  return null;
}

async function collectWebpFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectWebpFiles(absolute)));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.webp') {
      files.push(absolute);
    }
  }
  return files;
}

export async function validatePublicMedia(root) {
  const files = await collectWebpFiles(root);
  const problems = [];

  for (const file of files) {
    const buffer = await readFile(file);
    const problem = validateImageHeader(buffer, path.extname(file));
    if (problem) problems.push(`${path.relative(root, file)}: ${problem}`);
  }

  return { filesChecked: files.length, problems };
}

async function main() {
  const root = path.resolve(process.argv[2] ?? 'public/media');
  const { filesChecked, problems } = await validatePublicMedia(root);

  if (problems.length > 0) {
    console.error(`[media-check] FAIL ${problems.length} invalid WebP file(s):`);
    for (const problem of problems) console.error(`[media-check]   - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[media-check] PASS ${filesChecked} WebP file(s) have valid binary headers`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(`[media-check] FATAL ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
