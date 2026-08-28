import { describe, expect, it } from 'vitest';
import { newId, newPathSegment } from '../src/domain/ids.js';

describe('ids', () => {
  it('generates prefixed ids', () => {
    expect(newId('wi')).toMatch(/^wi_[0-9a-f]{8}$/);
    expect(newId('pr')).toMatch(/^pr_[0-9a-f]{8}$/);
    expect(newId('esc')).toMatch(/^esc_[0-9a-f]{8}$/);
  });

  it('generates 4-hex path segments', () => {
    expect(newPathSegment()).toMatch(/^[0-9a-f]{4}$/);
  });

  it('does not repeat ids in a small sample', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId('wi')));
    expect(ids.size).toBe(100);
  });
});
