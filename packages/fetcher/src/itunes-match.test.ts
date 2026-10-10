import type { ItunesHit } from '@rani/core';
import { describe, expect, it } from 'vitest';
import { artistMatches, baseTitle, pickBestHit, titleScore } from './itunes-match';

const hit = (trackName: string, artistName: string, releaseDate: string): ItunesHit => ({
  trackId: 1,
  trackName,
  artistName,
  releaseDate,
});

describe('baseTitle', () => {
  it('括弧の副題、ハイフン以降、feat. を除く', () => {
    expect(baseTitle('SOUVENIR (BUMP OF CHICKEN TOUR 2022)')).toBe('souvenir');
    expect(baseTitle('Hello - 2015 Remaster')).toBe('hello');
    expect(baseTitle('The Way feat. Mac Miller')).toBe('the way');
  });
});

describe('titleScore', () => {
  it('括弧の有無だけの違いは完全一致とみなす', () => {
    expect(titleScore('You feat. UMI', 'You (feat. UMI)')).toBe(3);
  });

  it('副題を除けば一致する曲は2点', () => {
    expect(titleScore('SOUVENIR', 'SOUVENIR (Live)')).toBe(2);
  });

  it('前方一致は1点、無関係な曲名は0点', () => {
    expect(titleScore("I'll Be There", "I'll Be There For You")).toBe(1);
    expect(titleScore('Camera', 'party 4 u')).toBe(0);
  });
});

describe('artistMatches', () => {
  it('共演者を並べた表記にも一致する', () => {
    expect(artistMatches('HUNTR/X', 'HUNTR/X, EJAE & REI AMI')).toBe(true);
  });

  it('カタカナ表記とは一致しない', () => {
    expect(artistMatches('Maroon 5', 'マルーン5')).toBe(false);
  });
});

describe('pickBestHit', () => {
  it('ライブ版より、曲名が完全に一致する原曲を選ぶ', () => {
    const picked = pickBestHit('SOUVENIR', 'BUMP OF CHICKEN', [
      hit('SOUVENIR (TOUR 2022 at Zepp Haneda)', 'BUMP OF CHICKEN', '2023-05-24'),
      hit('SOUVENIR', 'BUMP OF CHICKEN', '2022-04-18'),
    ]);
    expect(picked?.releaseDate).toBe('2022-04-18');
  });

  it('曲名が同点なら、アーティストが一致するものを選ぶ', () => {
    const picked = pickBestHit('Have a nice day', 'imase', [
      hit('Have a Nice Day', 'Stereophonics', '2006-01-01'),
      hit('Have a nice day', 'imase', '2021-12-14'),
    ]);
    expect(picked?.artistName).toBe('imase');
  });

  it('曲名もアーティストも同点なら、発売日が古いものを選ぶ', () => {
    const picked = pickBestHit('メリッサ', 'ポルノグラフィティ', [
      hit('メリッサ', 'ポルノグラフィティ', '2013-11-27'),
      hit('メリッサ', 'ポルノグラフィティ', '2003-08-27'),
    ]);
    expect(picked?.releaseDate).toBe('2003-08-27');
  });

  it('曲名が一致する候補がなければ null を返す', () => {
    expect(pickBestHit('Camera', 'Charli xcx', [hit('party 4 u', 'Charli xcx', '2020-01-01')])).toBeNull();
    expect(pickBestHit('Camera', 'Charli xcx', [])).toBeNull();
  });
});
