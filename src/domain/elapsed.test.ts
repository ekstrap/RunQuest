import { formatElapsed } from './elapsed';

describe('formatElapsed', () => {
  it('formats zero as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('zero-pads minutes and seconds', () => {
    expect(formatElapsed(65)).toBe('01:05');
  });

  it('formats whole minutes', () => {
    expect(formatElapsed(600)).toBe('10:00');
  });

  it('counts past an hour as minutes (no hours field for a calm short session)', () => {
    expect(formatElapsed(3661)).toBe('61:01');
  });
});
