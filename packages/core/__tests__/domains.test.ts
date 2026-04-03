import {
  sanitizeDomain,
  findServiceIdByDomain,
  resolveTargetInput,
} from '../src/engine/domains';

describe('sanitizeDomain', () => {
  it('removes protocol and www', () => {
    expect(sanitizeDomain('https://www.facebook.com/path')).toBe(
      'facebook.com',
    );
  });

  it('trims whitespace and converts to lowercase', () => {
    expect(sanitizeDomain('  Reddit.COM  ')).toBe('reddit.com');
  });

  it('returns empty string for invalid domains', () => {
    expect(sanitizeDomain('invalid')).toBe('');
  });
});

describe('findServiceIdByDomain', () => {
  it('finds service ID for exact domain match', () => {
    expect(findServiceIdByDomain('facebook.com')).toBe('facebook');
  });

  it('finds service ID for subdomain match', () => {
    expect(findServiceIdByDomain('m.facebook.com')).toBe('facebook');
  });

  it('handles aliases (x.com -> twitter)', () => {
    expect(findServiceIdByDomain('x.com')).toBe('twitter');
  });

  it('returns null for unknown domains', () => {
    expect(findServiceIdByDomain('example.org')).toBe(null);
  });
});

describe('resolveTargetInput', () => {
  it('resolves as service for known domains', () => {
    const result = resolveTargetInput('instagram.com');
    expect(result.kind).toBe('service');
    expect(result.normalizedId).toBe('instagram');
  });

  it('resolves as domain for unknown inputs', () => {
    const result = resolveTargetInput('my-secret-site.io');
    expect(result.kind).toBe('domain');
    expect(result.normalizedId).toBe('my-secret-site.io');
  });
});
