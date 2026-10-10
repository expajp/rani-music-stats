import type { DayFile, YearsFile } from '@rani/core';
import { describe, expect, it } from 'vitest';
import { applyDraft, draftKeys } from './overrides';

const day = (date: string, plays: [string, string][]): DayFile => ({
  date,
  fetchedAt: 'x',
  plays: plays.map(([title, artist]) => ({ time: '08:00:00', title, artist })),
});

const entry = (year: number | null) => ({ year, lookedUpAt: 'x', itunes: null });

describe('draftKeys', () => {
  const days = [
    day('2026-10-08', [['Camera', 'Charli xcx'], ['Hero', 'Enrique Iglesias'], ['Rare', 'Someone']]),
    day('2026-10-09', [['Camera', 'Charli xcx'], ['Unsearched', 'Nobody']]),
  ];
  const years: YearsFile = {
    'camera\tcharli xcx': entry(null),
    'hero\tenrique iglesias': entry(2001),
    'rare\tsomeone': entry(null),
  };

  it('発表年が不明な曲を、オンエア回数の多い順に返す', () => {
    expect(draftKeys(days, years, {})).toEqual(['camera\tcharli xcx', 'rare\tsomeone']);
  });

  it('手で補完済みの曲と、まだ検索していない曲は含めない', () => {
    expect(draftKeys(days, years, { 'camera\tcharli xcx': 2026 })).toEqual(['rare\tsomeone']);
  });
});

describe('applyDraft', () => {
  it('年が書かれた曲だけを取り込み、残りは下書きに残す', () => {
    const result = applyDraft({ a: 2020, b: null, c: '1999' }, { z: 2000 }, 2027);
    expect(result.overrides).toEqual({ z: 2000, a: 2020, c: 1999 });
    expect(result.remaining).toEqual({ b: null });
    expect(result.applied).toBe(2);
  });

  it('年として読めない値は取り込まず、書かれた値のまま下書きに残す', () => {
    const result = applyDraft({ 'x\ty': 'ninety', 'p\tq': 2099, 'm\tn': 1985.5 }, {}, 2027);
    expect(result.overrides).toEqual({});
    expect(result.remaining).toEqual({ 'x\ty': 'ninety', 'p\tq': 2099, 'm\tn': 1985.5 });
    expect(result.invalid).toHaveLength(3);
  });

  it('既存の補完は、下書きの値で上書きする', () => {
    expect(applyDraft({ a: 1990 }, { a: 1980 }, 2027).overrides).toEqual({ a: 1990 });
  });
});
