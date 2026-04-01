import { getRootDomain, resolveIconUrl, getCategoryBadge } from '../src/iconography';

describe('getRootDomain', () => {
  it('extracts root domain from standard domains', () => {
    expect(getRootDomain('www.facebook.com')).toBe('facebook.com');
    expect(getRootDomain('sub.example.co.uk')).toBe('example.co.uk');
  });

  it('handles multi-part TLDs correctly', () => {
    expect(getRootDomain('app.google.com.br')).toBe('google.com.br');
    expect(getRootDomain('api.github.io')).toBe('github.io');
  });
});

describe('resolveIconUrl', () => {
  it('resolves known brands to simple icons or favicon', () => {
    const url = resolveIconUrl('facebook.com');
    expect(url).toContain('cdn.simpleicons.org');
    expect(url).toContain('facebook');
  });

  it('falls back to favicon for unknown domains', () => {
    const url = resolveIconUrl('my-random-blog.net');
    expect(url).toContain('google.com/s2/favicons');
    expect(url).toContain('my-random-blog.net');
  });

  it('handles subdomains correctly by favoring root brand', () => {
    const url = resolveIconUrl('images.instagram.com');
    expect(url).toContain('instagram');
  });
});

describe('getCategoryBadge', () => {
  it('returns emoji for known categories', () => {
    expect(getCategoryBadge({ id: 'games' })).toBe('🎮');
    expect(getCategoryBadge({ id: 'social-networks' })).toBe('🌐');
  });

  it('returns uppercase initials for unknown categories', () => {
    expect(getCategoryBadge({ id: 'productivity' })).toBe('PR');
  });
});
