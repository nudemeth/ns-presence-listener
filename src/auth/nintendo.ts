import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as childProcess from 'child_process';
import { pathToFileURL } from 'url';

export const NXAPI_BIN = path.join(process.cwd(), 'node_modules', 'nxapi', 'bin', 'nxapi.js');

// Builds the subprocess environment for nxapi: points NXAPI_CONFIG_URL at our
// local nxapi-config.json (pinned znca_version) and strips NXAPI_ENABLE_REMOTE_CONFIG
// so the file:// config is actually loaded regardless of what's in .env.
export function getNxapiEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env['NXAPI_ENABLE_REMOTE_CONFIG'];
  const configPath = path.resolve(process.cwd(), 'nxapi-config.json');
  env['NXAPI_CONFIG_URL'] = pathToFileURL(configPath).toString();
  return env;
}

// Replicates env-paths('nxapi').data — the suffix '-nodejs' is added by env-paths on all platforms.
function getNxapiPersistDir(): string {
  if (process.env.NXAPI_DATA_PATH) {
    return path.join(process.env.NXAPI_DATA_PATH, 'persist');
  }

  const name = 'nxapi-nodejs';
  let dataDir: string;
  if (process.platform === 'win32') {
    dataDir = path.join(process.env.LOCALAPPDATA ?? '', name, 'Data');
  } else if (process.platform === 'darwin') {
    dataDir = path.join(process.env.HOME ?? '', 'Library', 'Application Support', name, 'Data');
  } else {
    const xdg = process.env.XDG_DATA_HOME ?? path.join(process.env.HOME ?? '', '.local', 'share');
    dataDir = path.join(xdg, name, 'Data');
  }
  return path.join(dataDir, 'persist');
}

function md5(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

function readPersistValue(persistDir: string, key: string): unknown {
  try {
    const file = path.join(persistDir, md5(key));
    const entry = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return entry.value ?? null;
  } catch {
    return null;
  }
}

function listPersistEntries(persistDir: string): Array<{ key: string; value: unknown }> {
  try {
    return fs.readdirSync(persistDir)
      .flatMap(f => {
        try {
          const entry = JSON.parse(fs.readFileSync(path.join(persistDir, f), 'utf-8'));
          return entry.key ? [{ key: entry.key as string, value: entry.value }] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function getStoredCoralToken(): string {
  const persistDir = getNxapiPersistDir();
  const entries = listPersistEntries(persistDir);

  const naEntry = entries.find(e => e.key.startsWith('NintendoAccountToken.'));
  if (!naEntry) throw new Error('No Nintendo account found. Run: npm run auth');

  const sessionToken = naEntry.value as string;
  const nsoData = readPersistValue(persistDir, 'NsoToken.' + sessionToken) as
    | { credential: { accessToken: string } }
    | null;

  if (!nsoData?.credential?.accessToken) {
    throw new Error('No Coral token found in nxapi storage. Run: npm run auth');
  }
  return nsoData.credential.accessToken;
}

// Spawns `nxapi nso user` which forces nxapi to refresh the Coral token if expired.
export function refreshNxapiToken(): void {
  const result = childProcess.spawnSync(process.execPath, [NXAPI_BIN, 'nso', 'user'], {
    encoding: 'utf-8',
    timeout: 60_000,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: getNxapiEnv(),
  });
  if (result.error) throw new Error('Token refresh failed: ' + result.error.message);
}
