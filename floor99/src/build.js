// Build flavour. The single-file builder defines __FLOOR99_FAST__ (performance vs cinematic build);
// when running from source, add ?fast to the URL for the performance profile.
/* global __FLOOR99_FAST__ */
const fast = typeof __FLOOR99_FAST__ !== 'undefined'
  ? __FLOOR99_FAST__
  : (typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast'));
export const BUILD = { fast, name: fast ? 'Performance' : 'Cinematic' };
