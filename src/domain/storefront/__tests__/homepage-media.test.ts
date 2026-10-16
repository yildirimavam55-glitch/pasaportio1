import { describe, expect, it } from 'vitest';
import { defaultV2Page, sanitizeV2Page, collectV2MediaIds } from '../v2';
import { homepageImageId, uniqueDestinations, uniqueRegions, imageUploadError } from '../homepage-media';

const MEDIA = '313c57a0-0fa4-46bc-9b19-3003be181bd8';
describe('Homepage presentation media', () => {
  it('retains individual country ISO assignments through a CMS round trip', () => {
    const page = defaultV2Page('esim');
    const section = page.sections.find(s => s.type === 'DESTINATION_CAROUSEL');
    if (!section) throw new Error('Missing destinations');
    section.imageOverrides = { TR: MEDIA };
    const saved = sanitizeV2Page(JSON.parse(JSON.stringify(page)), 'esim');
    const destination = saved.sections.find(s => s.id === section.id);
    if (!destination) throw new Error('Missing saved destinations');
    expect(homepageImageId(destination, 'TR')).toBe(MEDIA);
    expect(collectV2MediaIds(saved)).toContain(MEDIA);
  });
  it('retains stable region and Global media IDs and rejects unrelated IDs', () => {
    const page = defaultV2Page('esim');
    const section = page.sections.find(s => s.type === 'REGION_DISCOVERY');
    if (!section) throw new Error('Missing regions');
    section.imageOverrides = { EUROPE: MEDIA, MIDDLE_EAST: MEDIA, GLOBAL: MEDIA, RANDOM: MEDIA };
    const saved = sanitizeV2Page(page, 'esim').sections.find(s => s.id === section.id);
    expect(saved?.imageOverrides).toEqual({ EUROPE: MEDIA, MIDDLE_EAST: MEDIA, GLOBAL: MEDIA });
  });
  it('keeps the existing Global image as a legacy fallback', () => {
    const section = defaultV2Page('esim').sections.find(s => s.type === 'REGION_DISCOVERY');
    if (!section) throw new Error('Missing regions');
    section.mediaId = MEDIA;
    expect(homepageImageId(section, 'GLOBAL')).toBe(MEDIA);
    expect(homepageImageId(section, 'ASIA')).toBeNull();
  });
  it('does not duplicate countries', () => {
    expect(uniqueDestinations([{ iso: 'TR' }, { iso: 'DE' }, { iso: 'TR' }])).toEqual([{ iso: 'TR' }, { iso: 'DE' }]);
  });
  it('includes Global once without requiring unlimited products', () => {
    expect(uniqueRegions([{ region: 'EUROPE' }, { region: 'GLOBAL' }, { region: 'GLOBAL' }])).toEqual([{ region: 'EUROPE' }, { region: 'GLOBAL' }]);
  });
  it('rejects uploads above the 10 MB limit', () => {
    expect(imageUploadError({ type: 'image/webp', size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(imageUploadError({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBeNull();
  });
  it('rejects non-image files', () => {
    expect(imageUploadError({ type: 'text/html', size: 100 })).not.toBeNull();
    expect(imageUploadError({ type: 'image/jpeg', size: 100 })).toBeNull();
  });
});