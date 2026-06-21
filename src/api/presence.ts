import * as path from 'path';
import { pathToFileURL } from 'url';

export type PresenceState = 'PLAYING' | 'ONLINE' | 'OFFLINE' | 'INACTIVE';

export interface PresenceGame {
  name: string;
  imageUri: string;
  sysDescription: string;
  totalPlayTime: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
}

export interface Presence {
  state: PresenceState;
  updatedAt: number;
  game: PresenceGame | null;
}

// Replicate env-paths('nxapi').data — env-paths appends '-nodejs' on all platforms.
function getNxapiDataDir(): string {
  if (process.env.NXAPI_DATA_PATH) return process.env.NXAPI_DATA_PATH;
  const name = 'nxapi-nodejs';
  if (process.platform === 'win32')
    return path.join(process.env.LOCALAPPDATA ?? '', name, 'Data');
  if (process.platform === 'darwin')
    return path.join(process.env.HOME ?? '', 'Library', 'Application Support', name, 'Data');
  const xdg = process.env.XDG_DATA_HOME ?? path.join(process.env.HOME ?? '', '.local', 'share');
  return path.join(xdg, name, 'Data');
}

// Must be called before any nxapi module loads so that when remote-config.js is
// dynamically imported (on Coral token expiry) it picks up our pinned config.
export function prepareNxapiEnv(): void {
  delete process.env['NXAPI_ENABLE_REMOTE_CONFIG'];
  process.env['NXAPI_CONFIG_URL'] = pathToFileURL(
    path.resolve(process.cwd(), 'nxapi-config.json')
  ).toString();
}

// Cached between polls — storage and session token don't change between polls.
let _storage: unknown = null;
let _sessionToken: string | null = null;
let _libInitialized = false;

// nxapi doesn't export these paths in its exports map, so import via file:// URL.
function nxapiUrl(subpath: string): string {
  return pathToFileURL(path.join(process.cwd(), 'node_modules/nxapi', subpath)).href;
}

// Replicate what nxapi's dist/cli.js does at startup: set a User-Agent string
// and configure the client assertion provider using the nxapi auth client ID.
async function initNxapiLibrary(): Promise<void> {
  if (_libInitialized) return;
  _libInitialized = true;

  const { addUserAgent } = await import(nxapiUrl('dist/util/useragent.js')) as
    { addUserAgent: (...ua: string[]) => void };
  addUserAgent('nxapi-cli');

  const { NxapiClientAssertionProvider, setClientAssertionProvider } =
    await import(nxapiUrl('dist/util/nxapi-auth.js')) as {
      NxapiClientAssertionProvider: new (clientId: string, iss: string | undefined, scope: string) => unknown;
      setClientAssertionProvider: (p: unknown) => void;
    };

  const { pkg } = await import(nxapiUrl('dist/util/product.js')) as
    { pkg: { __nxapi_auth?: { cli?: { client_id?: string } } } };

  const clientId = pkg.__nxapi_auth?.cli?.client_id ?? process.env['NXAPI_AUTH_CLIENT_ID'];
  if (!clientId) throw new Error('nxapi auth client_id not found — set NXAPI_AUTH_CLIENT_ID env var');

  setClientAssertionProvider(
    new NxapiClientAssertionProvider(clientId, undefined, 'ca:gf ca:er ca:dr ca:na')
  );
}

async function getStorageAndToken(): Promise<{ storage: unknown; sessionToken: string }> {
  if (!_storage || !_sessionToken) {
    const { initStorage } = await import(nxapiUrl('dist/util/storage.js')) as
      { initStorage: (dir: string) => Promise<unknown> };
    _storage = await initStorage(getNxapiDataDir());

    const s = _storage as Record<string, (k: string) => Promise<unknown>>;
    const selectedUser = (await s.getItem('SelectedUser')) as string | undefined;
    if (!selectedUser) throw new Error('No Nintendo account found. Run: npm run auth');
    _sessionToken = (await s.getItem('NintendoAccountToken.' + selectedUser)) as string | null;
    if (!_sessionToken) throw new Error('No Nintendo account found. Run: npm run auth');
  }
  return { storage: _storage, sessionToken: _sessionToken! };
}

export async function fetchPresence(): Promise<Presence> {
  await initNxapiLibrary();
  const { storage, sessionToken } = await getStorageAndToken();

  const { getToken } = await import(nxapiUrl('dist/common/auth/coral.js')) as
    { getToken: (s: unknown, t: string) => Promise<{ nso: unknown }> };
  const { nso } = await getToken(storage, sessionToken);

  const currentUser = await (nso as { getCurrentUser(): Promise<unknown> }).getCurrentUser();
  const { presence } = currentUser as { presence: Record<string, unknown> };

  return {
    state: presence['state'] as PresenceState,
    updatedAt: presence['updatedAt'] as number,
    game: (presence['game'] as Record<string, unknown> | null)?.['name']
      ? (presence['game'] as PresenceGame)
      : null,
  };
}
