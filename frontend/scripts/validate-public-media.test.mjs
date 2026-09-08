import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateImageHeader } from './validate-public-media.mjs';

test('accepts a binary WebP RIFF header', () => {
  const buffer = Buffer.from('RIFF0000WEBPVP8 ', 'ascii');
  assert.equal(validateImageHeader(buffer, '.webp'), null);
});

test('rejects Base64 text masquerading as a WebP file', () => {
  const buffer = Buffer.from('UklGRn6LAwBXRUJQVlA4IHKLAwAQPQmdASqoBS4D', 'ascii');
  assert.match(validateImageHeader(buffer, '.webp') ?? '', /Base64 text/i);
});

test('rejects a WebP file without RIFF/WEBP magic bytes', () => {
  const buffer = Buffer.from('not-a-real-webp', 'ascii');
  assert.match(validateImageHeader(buffer, '.webp') ?? '', /invalid WebP header/i);
});
