import { aggregate } from '@rani/core';
import { readAllDays, readOverrides, readYears, SITE_DATA_DIR, writeSiteData } from './store';

/** サイトが読み込む集計データ（songs.json, plays.json）を生成する */
export async function runBuildData(): Promise<void> {
  const { songs, plays } = aggregate(
    await readAllDays(),
    await readYears(),
    await readOverrides(),
    new Date().toISOString(),
  );
  await writeSiteData('songs.json', songs);
  await writeSiteData('plays.json', plays);
  console.log(`${SITE_DATA_DIR} に出力しました：${songs.songs.length}曲、${plays.length}回のオンエア`);
}
