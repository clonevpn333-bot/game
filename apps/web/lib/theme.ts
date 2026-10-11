'use client';

import { createThemeStore } from '@binderready/design';
import { themeOptions } from './theme-options';

/** Website theme. Dark is the showcase default until the visitor picks something else. */
export const themeStore = createThemeStore(themeOptions);
