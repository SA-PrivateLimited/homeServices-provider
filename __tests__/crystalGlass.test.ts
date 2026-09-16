import {mixColor, crystalFillColors} from '../src/components/CrystalSurface';

describe('crystal glass color-mix (Partner web parity)', () => {
  it('mixes primary 6% into white like CSS color-mix', () => {
    expect(mixColor('#34C759', '#FFFFFF', 0.06).toUpperCase()).toBe('#F3FCF5');
  });

  it('uses 6% / 10% primary wash for default glass', () => {
    const fill = crystalFillColors({
      primary: '#34C759',
      card: '#FFFFFF',
    });
    expect(fill.base.toUpperCase()).toBe('#F3FCF5');
    expect(fill.wash?.toUpperCase()).toBe('#EBF9EE');
  });

  it('uses richer wash for job cards', () => {
    const fill = crystalFillColors({
      primary: '#34C759',
      card: '#FFFFFF',
      intensity: 'job',
    });
    expect(fill.base.toUpperCase()).toBe(
      mixColor('#34C759', '#FFFFFF', 0.1).toUpperCase(),
    );
    expect(fill.wash?.toUpperCase()).toBe(
      mixColor('#34C759', '#FFFFFF', 0.22).toUpperCase(),
    );
  });

  it('uses a diagonal history wash, not Active job saturation', () => {
    const fill = crystalFillColors({
      primary: '#34C759',
      card: '#FFFFFF',
      statusColor: '#34C759',
      intensity: 'history',
    });
    expect(fill.base.toUpperCase()).toBe(
      mixColor('#34C759', '#FFFFFF', 0.12).toUpperCase(),
    );
    expect(fill.wash?.toUpperCase()).toBe(
      mixColor('#34C759', '#FFFFFF', 0.2).toUpperCase(),
    );
  });

  it('uses 10% primary for online accent', () => {
    const fill = crystalFillColors({
      primary: '#34C759',
      card: '#FFFFFF',
      accent: true,
    });
    expect(fill.base.toUpperCase()).toBe('#EBF9EE');
  });
});
