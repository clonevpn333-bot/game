import tauriConfig from '../../src-tauri/tauri.conf.json' with { type: 'json' };

/**
 * The product name for the desktop app. Its one source is `productName` in
 * tauri.conf.json (which also names the installers); product.test.ts keeps it equal
 * to the website's PRODUCT_NAME.
 */
export const PRODUCT_NAME: string = tauriConfig.productName;
