import 'dotenv/config';
import * as childProcess from 'child_process';
import { NXAPI_BIN, getNxapiEnv } from './nintendo';

console.log('━━━ Nintendo Switch Online — Authentication Setup ━━━\n');
console.log('nxapi will open a login page in your browser.');
console.log('Right-click "Select this account" → Copy link address → paste when prompted.\n');

const result = childProcess.spawnSync(process.execPath, [NXAPI_BIN, 'nso', 'auth'], {
  stdio: 'inherit',
  timeout: 300_000,
  env: getNxapiEnv(),
});

process.exit(result.status ?? 0);
