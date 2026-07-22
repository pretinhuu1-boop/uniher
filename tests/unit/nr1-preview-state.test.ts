import { describe, expect, it } from 'vitest';
import { getNr1PreviewState } from '@/lib/nr1/preview-state';

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
});
