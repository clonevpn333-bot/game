export default async ({ ev, log }) => { log('booted', await ev(() => !!window.__game)); };
