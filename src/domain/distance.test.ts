import { formatDistance } from './distance';

describe('formatDistance', () => {
  it('renders kilometers with one decimal', () => {
    expect(formatDistance(1600)).toBe('1.6 km');
  });

  it('rounds to the nearest tenth of a kilometer', () => {
    expect(formatDistance(1650)).toBe('1.7 km');
  });

  it('handles sub-kilometer distances', () => {
    expect(formatDistance(400)).toBe('0.4 km');
  });

  it('renders zero', () => {
    expect(formatDistance(0)).toBe('0.0 km');
  });
});
