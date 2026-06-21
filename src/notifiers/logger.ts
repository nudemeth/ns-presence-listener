import * as fs from 'fs';
import { config } from '../config';
import type { PresenceGame } from '../api/presence';

function ts(): string {
  return new Date().toISOString();
}

function writeLine(line: string): void {
  process.stdout.write(line + '\n');
  fs.appendFileSync(config.logFile, line + '\n', 'utf-8');
}

export function logGameStarted(game: PresenceGame): void {
  writeLine(`[${ts()}] STARTED  ${game.name}`);
}

export function logGameStopped(game: PresenceGame): void {
  writeLine(`[${ts()}] STOPPED  ${game.name}`);
}

export function logInfo(message: string): void {
  writeLine(`[${ts()}] INFO     ${message}`);
}

export function logError(message: string): void {
  process.stderr.write(`[${ts()}] ERROR    ${message}\n`);
  fs.appendFileSync(config.logFile, `[${ts()}] ERROR    ${message}\n`, 'utf-8');
}
