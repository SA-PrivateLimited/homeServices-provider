import {serviceCategoryIcon, toMaterialSymbolName} from '../src/utils/serviceIcons';

describe('serviceCategoryIcon', () => {
  it('maps service display names without treating them as icon ids', () => {
    expect(serviceCategoryIcon(undefined, 'Painter')).toBe('format_paint');
    expect(serviceCategoryIcon(undefined, 'Driver')).toBe('local_taxi');
    expect(serviceCategoryIcon(undefined, 'Bike Repair')).toBe('two_wheeler');
    expect(serviceCategoryIcon(undefined, 'SIM Supplier')).toBe('sim_card');
    expect(serviceCategoryIcon(undefined, 'AC Repair')).toBe('ac_unit');
  });

  it('accepts a single category-looking argument', () => {
    expect(serviceCategoryIcon('Painter')).toBe('format_paint');
  });

  it('falls back to build for unknown icons', () => {
    expect(toMaterialSymbolName('not_a_real_icon_xyz')).toBe('build');
  });
});
