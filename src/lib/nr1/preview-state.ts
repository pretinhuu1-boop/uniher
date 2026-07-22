export type Nr1PreviewState =
  | 'preview_available'
  | 'contract_required'
  | 'unavailable'
  | 'real_integration';

export interface Nr1PreviewStateInput {
  previewEnabled: boolean;
  entitled: boolean;
  realIntegration: boolean;
}

export function getNr1PreviewState({
  previewEnabled,
  entitled,
  realIntegration,
}: Nr1PreviewStateInput): Nr1PreviewState {
  if (realIntegration) return 'real_integration';
  if (!previewEnabled) return 'unavailable';
  if (!entitled) return 'contract_required';
  return 'preview_available';
}
