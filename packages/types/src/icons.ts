/**
 * Strategy for fetching brand assets
 */
export type BrandSource = 'simpleicon' | 'favicon';

/**
 * Definition of a service brand for UI display
 */
export interface BrandDefinition {
  color?: string;
  slug?: string;
  domain?: string;
  source?: BrandSource;
}

/**
 * Result of resolving a service or component icon
 */
export type ServiceIconResult =
  | {
      kind: 'remote';
      url: string;
      fallbackUrl: string | null;
      domain: string | null;
      accent: string;
      label: string;
    }
  | {
      kind: 'fallback';
      url?: null;
      fallbackUrl: null;
      domain: null;
      accent: string;
      label: string;
    };
