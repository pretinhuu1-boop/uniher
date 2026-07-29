import type { CompanyModuleNavigationRecord } from '@/types/modules';

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

export function isNr1RuntimeEntitled(
  companyModules: readonly CompanyModuleNavigationRecord[] | undefined,
): boolean {
  const nr1 = companyModules?.find((module) => module.module_slug === 'nr1');
  return nr1?.visible === 1 && nr1.module_state === 'enabled';
}
