import { constants } from 'node:fs';
import { access } from 'node:fs/promises';

const providers = [
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    login: 'claude',
  },
  {
    id: 'grok',
    name: 'Grok CLI',
    command: 'grok',
    login: 'grok login',
  },
];

async function findExecutable(command) {
  const pathEntries = (process.env.PATH ?? '').split(':').filter(Boolean);
  for (const directory of pathEntries) {
    const candidate = `${directory}/${command}`;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue searching without reading any credential files.
    }
  }
  return null;
}

const checkedAt = new Date().toISOString();
const results = await Promise.all(
  providers.map(async (provider) => {
    const executable = await findExecutable(provider.command);
    return {
      id: provider.id,
      name: provider.name,
      installed: Boolean(executable),
      executable,
      nextStep: executable ? provider.login : `先安装 ${provider.name}`,
    };
  }),
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checkedAt, providers: results }, null, 2));
} else {
  console.log(`本机额度接入检查 ${checkedAt}`);
  for (const result of results) {
    console.log(
      `${result.installed ? 'READY' : 'MISSING'} ${result.name} · ${result.nextStep}`,
    );
  }
  console.log('本检查只确认命令是否存在，不读取账号凭证。');
}
