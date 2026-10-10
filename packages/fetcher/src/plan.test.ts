import { describe, expect, it } from 'vitest';
import { dateRange } from './dates';
import { planFetch } from './fetch';
import { planYears } from './years';

describe('planFetch', () => {
  const today = '2026-10-09';
  const dates = dateRange('2026-10-03', '2026-10-11');

  it('未保存の日をすべて取得し、未来の日は除く', () => {
    const plan = planFetch(dates, () => false, today);
    expect(plan.map((t) => t.date)).toEqual(dateRange('2026-10-03', '2026-10-09'));
    expect(plan.every((t) => !t.refresh)).toBe(true);
  });

  it('保存済みの日は、直近2日だけ取り直す', () => {
    const plan = planFetch(dates, () => true, today);
    expect(plan).toEqual([
      { date: '2026-10-08', refresh: true },
      { date: '2026-10-09', refresh: true },
    ]);
  });

  it('保存済みと未保存が混ざっていても正しく判定する', () => {
    const saved = new Set(['2026-10-03', '2026-10-04', '2026-10-09']);
    const plan = planFetch(dates, (d) => saved.has(d), today);
    expect(plan.map((t) => `${t.date}:${t.refresh}`)).toEqual([
      '2026-10-05:false',
      '2026-10-06:false',
      '2026-10-07:false',
      '2026-10-08:false',
      '2026-10-09:true',
    ]);
  });
});

describe('planYears', () => {
  const years = {
    a: { year: 2020, lookedUpAt: 'x', itunes: null },
    b: { year: null, lookedUpAt: 'x', itunes: null },
  };

  it('未検索の曲だけを返す', () => {
    expect(planYears(['a', 'b', 'c'], years, false)).toEqual(['c']);
  });

  it('--retry-missing では、年が見つからなかった曲も返す', () => {
    expect(planYears(['a', 'b', 'c'], years, true)).toEqual(['b', 'c']);
  });
});
