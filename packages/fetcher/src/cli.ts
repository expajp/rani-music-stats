import { parseArgs } from 'node:util';
import { runBuildData } from './build-data';
import { addDays, dateRange, isValidDate, todayJst } from './dates';
import { runFetch } from './fetch';
import { runYears } from './years';

const USAGE = `使い方：
  cli fetch --days N                         直近 N 日（今日を含む）を取得する
  cli fetch --from YYYY-MM-DD --to YYYY-MM-DD 期間を指定して取得する
  cli years [--max N] [--retry-missing]       発表年が未検索の曲を iTunes で検索する
  cli build-data                              サイト用の集計データを生成する`;

function fail(message: string): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(2);
}

function positiveInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) fail(`--${name} には1以上の整数を指定してください`);
  return n;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'fetch': {
    const { values } = parseArgs({
      args: rest,
      options: { days: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' } },
    });
    const today = todayJst();
    let dates: string[];
    if (values.days) {
      dates = dateRange(addDays(today, -(positiveInt(values.days, 'days')! - 1)), today);
    } else if (values.from && values.to) {
      if (!isValidDate(values.from) || !isValidDate(values.to)) fail('日付は YYYY-MM-DD で指定してください');
      dates = dateRange(values.from, values.to);
    } else {
      fail('--days か、--from と --to を指定してください');
    }
    const ok = await runFetch(dates, today);
    if (!ok) {
      console.error('::error::今日のオンエアデータを取得できませんでした');
      process.exitCode = 1;
    }
    break;
  }
  case 'years': {
    const { values } = parseArgs({
      args: rest,
      options: { max: { type: 'string' }, 'retry-missing': { type: 'boolean', default: false } },
    });
    await runYears({ max: positiveInt(values.max, 'max'), retryMissing: values['retry-missing'] });
    break;
  }
  case 'build-data':
    await runBuildData();
    break;
  default:
    fail(command ? `不明なコマンドです：${command}` : 'コマンドを指定してください');
}
