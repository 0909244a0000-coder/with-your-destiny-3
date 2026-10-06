// run-tests.js から読み込む。各テストの Chromium に、file:// の iframe を読めるフラグを足す。
// （DPSテスト・アリーナは iframe で戦闘を動かすため、ファイルを直接開くと止まる）
const pw = require('playwright');
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = (options = {}) => launch({
  ...options,
  executablePath: options.executablePath || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: [...(options.args || []), '--allow-file-access-from-files', '--disable-web-security'],
});
