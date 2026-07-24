import { describe, expect, it } from 'vitest';
import { getNr1PreviewState, isNr1RuntimeEntitled } from '@/lib/nr1/preview-state';

describe('getNr1PreviewState', () => {
  it('allows the controlled preview only when enabled and entitled', () => {
    expect(getNr1PreviewState({ previewEnabled: true, entitled: true, realIntegration: false })).toBe('preview_available');
  });

  it('keeps a disabled preview unavailable', () => {
    expect(getNr1PreviewState({ previewEnabled: false, entitled: true, realIntegration: false })).toBe('unavailable');
  });

  it('distinguishes missing entitlement from an unavailable preview', () => {
    expect(getNr1PreviewState({ previewEnabled: true, entitled: false, realIntegration: false })).toBe('contract_required');
  });

  it('prioritizes the real integration state', () => {
    expect(getNr1PreviewState({ previewEnabled: false, entitled: false, realIntegration: true })).toBe('real_integration');
  });

  it('requires an explicit visible enabled company module for runtime entitlement', () => {
    expect(isNr1RuntimeEntitled(undefined)).toBe(false);
    expect(isNr1RuntimeEntitled([
      { module_slug: 'nr1', module_state: 'requires_contract', visible: 1 },
    ])).toBe(false);
    expect(isNr1RuntimeEntitled([
      { module_slug: 'nr1', module_state: 'enabled', visible: 0 },
    ])).toBe(false);
    expect(isNr1RuntimeEntitled([
      { module_slug: 'nr1', module_state: 'enabled', visible: 1 },
    ])).toBe(true);
  });
});
