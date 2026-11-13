// electron-builder afterPack hook: ad-hoc sign the .app so it launches on Apple Silicon without a paid
// Developer ID. (Gatekeeper still asks once: right-click the app → Open.)
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(ctx) {
  if (ctx.electronPlatformName !== 'darwin') return;
  // universal builds pack x64 and arm64 into *-temp folders first and merge them afterwards;
  // only sign the merged app, otherwise the two halves no longer match
  if (/-temp$/.test(ctx.appOutDir)) return;
  const appPath = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};
