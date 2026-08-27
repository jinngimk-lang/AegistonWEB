// @vitest-environment node

import { describe, expect, it } from 'vitest';

// JS helper is shared with the font-generation script; it intentionally stays runtime-native ESM.
// @ts-expect-error -- the helper is a plain .mjs build script module without TypeScript declarations.
import { collectCriticalFirstScreenText } from '../../scripts/lib/critical-font-text.mjs';

describe('critical font first-screen text', () => {
  it('covers direct-entry inner-page hero text without requiring body copy', async () => {
    const text = await collectCriticalFirstScreenText();

    expect(text).toContain('七个核心技术模块，三十余项关键机制');
    expect(text).toContain('与智瞳安宇一起，构建值得信任的智能未来');
    expect(text).toContain('AragonTeam 企业 AI 原生人机协同工作站');
  });
});
