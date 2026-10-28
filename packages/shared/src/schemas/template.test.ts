import { describe, expect, it } from 'vitest';
import { templateDesignSchema } from './template.js';

const valid = {
  layout: 'centered',
  frame: 'thin',
  ornament: 'floral',
  pattern: 'none',
  font: 'elegant',
  palette: {
    background: '#ffffff',
    surface: '#fffdf8',
    text: '#222222',
    muted: '#777777',
    accent: '#b08446',
  },
};

describe('templateDesignSchema', () => {
  it('accepts a valid design', () => {
    expect(templateDesignSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown layouts and non-hex colours', () => {
    expect(templateDesignSchema.safeParse({ ...valid, layout: 'free-html' }).success).toBe(false);
    const bad = { ...valid, palette: { ...valid.palette, accent: 'red; background:url(x)' } };
    expect(templateDesignSchema.safeParse(bad).success).toBe(false);
  });
});
