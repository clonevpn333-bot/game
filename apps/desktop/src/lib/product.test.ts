import { describe, expect, it } from 'vitest';
import { PRODUCT_NAME as WEBSITE_PRODUCT_NAME } from '../../../web/site.config.ts';
import tauriConfig from '../../src-tauri/tauri.conf.json' with { type: 'json' };
import { PRODUCT_NAME } from './product.ts';

describe('product name', () => {
  it('matches the website, the window title and the installers', () => {
    expect(PRODUCT_NAME).toBe(WEBSITE_PRODUCT_NAME);
    expect(tauriConfig.app.windows.every((w) => w.title === PRODUCT_NAME)).toBe(true);
  });
});
