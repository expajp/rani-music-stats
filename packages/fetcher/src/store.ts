import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DayFile, YearOverrides, YearsFile } from '@rani/core';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const DATA_DIR = join(REPO_ROOT, 'data');
export const ONAIR_DIR = join(DATA_DIR, 'onair');
export const YEARS_FILE = join(DATA_DIR, 'years.json');
export const OVERRIDES_FILE = join(DATA_DIR, 'year-overrides.json');
export const SITE_DATA_DIR = join(REPO_ROOT, 'packages/site/public/data');

export function dayFilePath(date: string): string {
  return join(ONAIR_DIR, date.slice(0, 4), `${date}.json`);
}

export function dayFileExists(date: string): boolean {
  return existsSync(dayFilePath(date));
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function writeJson(path: string, value: unknown, pretty = true): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, pretty ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value));
}

export function readDay(date: string): Promise<DayFile | null> {
  return readJson<DayFile | null>(dayFilePath(date), null);
}

export function writeDay(day: DayFile): Promise<void> {
  return writeJson(dayFilePath(day.date), day);
}

export async function readAllDays(): Promise<DayFile[]> {
  if (!existsSync(ONAIR_DIR)) return [];
  const files = (await readdir(ONAIR_DIR, { recursive: true }))
    .filter((f) => f.endsWith('.json'))
    .sort();
  return Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(ONAIR_DIR, f), 'utf8')) as DayFile),
  );
}

export function readYears(): Promise<YearsFile> {
  return readJson<YearsFile>(YEARS_FILE, {});
}

/** 差分が読みやすいよう、曲キーの順に並べて書く */
export function writeYears(years: YearsFile): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(years).sort(([a], [b]) => a.localeCompare(b)));
  return writeJson(YEARS_FILE, sorted);
}

export function readOverrides(): Promise<YearOverrides> {
  return readJson<YearOverrides>(OVERRIDES_FILE, {});
}

export function writeSiteData(name: string, value: unknown): Promise<void> {
  return writeJson(join(SITE_DATA_DIR, name), value, false);
}
