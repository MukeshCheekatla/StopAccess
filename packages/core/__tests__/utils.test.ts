import { fmtTime, escapeHtml } from '../src/utils';

describe('fmtTime', () => {
  it('formats milliseconds into hours, minutes, and seconds', () => {
    expect(fmtTime(3661000)).toBe('1h 1m 1s');
  });

  it('formats milliseconds into minutes and seconds when hours are zero', () => {
    expect(fmtTime(61000)).toBe('1m 1s');
  });

  it('formats milliseconds into seconds when minutes and hours are zero', () => {
    expect(fmtTime(1000)).toBe('1s');
  });
});

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
