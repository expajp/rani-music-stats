import { describe, expect, it } from 'vitest';
import { addDays, dateRange, isValidDate, isWeekday, todayJst } from './dates';

describe('todayJst', () => {
  it('UTC の15時以降は翌日になる', () => {
    expect(todayJst(new Date('2026-10-09T14:59:59Z'))).toBe('2026-10-09');
    expect(todayJst(new Date('2026-10-09T15:00:00Z'))).toBe('2026-10-10');
  });
});

describe('addDays', () => {
  it('月と年をまたいで計算する', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('dateRange', () => {
  it('両端を含む', () => {
    expect(dateRange('2026-10-08', '2026-10-10')).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
  });

  it('from が to より後なら空になる', () => {
    expect(dateRange('2026-10-10', '2026-10-09')).toEqual([]);
  });
});

describe('isWeekday', () => {
  it('月〜金を平日とする', () => {
    expect(isWeekday('2026-10-09')).toBe(true); // 金
    expect(isWeekday('2026-10-10')).toBe(false); // 土
    expect(isWeekday('2026-10-11')).toBe(false); // 日
    expect(isWeekday('2026-10-12')).toBe(true); // 月（祝日だが放送する）
  });
});

describe('isValidDate', () => {
  it('YYYY-MM-DD 以外を受け付けない', () => {
    expect(isValidDate('2026-10-09')).toBe(true);
    expect(isValidDate('20261009')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
  });
});
