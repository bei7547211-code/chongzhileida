import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const label = 'com.beixiao.reset-radar.tibo-monitor';
const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const uninstall = argumentsList.includes('--uninstall');
const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const runnerPath = resolve(websiteRoot, 'scripts/run-tibo-monitor.mjs');
const stateDirectory = resolve(homedir(), '.reset-radar');
const logDirectory = resolve(stateDirectory, 'logs');
const launchAgentPath = resolve(
  homedir(),
  `Library/LaunchAgents/${label}.plist`,
);
const launchDomain = `gui/${process.getuid()}`;
const scanHours = [11, 15, 21];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderPlist() {
  const nodeDirectory = dirname(process.execPath);
  const pathValue = `${nodeDirectory}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`;
  const calendarIntervals = scanHours
    .map(
      (hour) => `    <dict>
      <key>Hour</key>
      <integer>${hour}</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(runnerPath)}</string>
    <string>--publish</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(websiteRoot)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(pathValue)}</string>
  </dict>
  <key>StartCalendarInterval</key>
  <array>
${calendarIntervals}
  </array>
  <key>StandardOutPath</key>
  <string>${escapeXml(resolve(logDirectory, 'tibo-monitor.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(resolve(logDirectory, 'tibo-monitor-error.log'))}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}

function launchctl(args, allowFailure = false) {
  try {
    execFileSync('/bin/launchctl', args, { stdio: 'ignore' });
  } catch (error) {
    if (!allowFailure) throw error;
  }
}

if (uninstall) {
  if (!dryRun) {
    launchctl(['bootout', launchDomain, launchAgentPath], true);
    await rm(launchAgentPath, { force: true });
  }
  console.log(
    `${dryRun ? 'DRY_RUN ' : ''}UNINSTALLED ${label} (${launchAgentPath})`,
  );
  process.exit(0);
}

const plist = renderPlist();
if (dryRun) {
  console.log(plist);
  console.log(`DRY_RUN INSTALL_READY ${launchAgentPath}`);
  process.exit(0);
}

await mkdir(dirname(launchAgentPath), { recursive: true });
await mkdir(logDirectory, { recursive: true, mode: 0o700 });
await writeFile(launchAgentPath, plist, { encoding: 'utf8', mode: 0o644 });
launchctl(['bootout', launchDomain, launchAgentPath], true);
launchctl(['bootstrap', launchDomain, launchAgentPath]);
launchctl(['enable', `${launchDomain}/${label}`]);

let feishuConfigured = false;
try {
  feishuConfigured = Boolean(
    (
      await readFile(resolve(stateDirectory, 'feishu-webhook-url'), 'utf8')
    ).trim(),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log(`INSTALLED ${label} 每天 11:00、15:00、21:00（北京时间）`);
console.log(
  feishuConfigured
    ? 'FEISHU_CONFIGURED'
    : `FEISHU_NOT_CONFIGURED ${resolve(stateDirectory, 'feishu-webhook-url')}`,
);
