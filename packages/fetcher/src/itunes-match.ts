import { normalizeText, type ItunesHit } from '@rani/core';

/** 括弧を無視した曲名。「You feat. UMI」と「You (feat. UMI)」を同じとみなすため */
function looseTitle(title: string): string {
  return normalizeText(title)
    .replace(/[()[\]【】「」]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 副題・バージョン表記・feat. を除いた曲名。「SOUVENIR (… TOUR 2022 …)」を「souvenir」とみなすため */
export function baseTitle(title: string): string {
  return normalizeText(title)
    .replace(/[([【].*?[)\]】]/g, ' ')
    .replace(/\s+-\s+.*$/, ' ')
    .replace(/\s(feat|ft)\.?\s.*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 検索した曲名と候補の曲名の近さ。3：括弧を除けば一致、2：副題などを除けば一致、1：前方一致、0：不一致 */
export function titleScore(query: string, candidate: string): number {
  if (looseTitle(query) === looseTitle(candidate)) return 3;
  const q = baseTitle(query);
  const c = baseTitle(candidate);
  if (!q || !c) return 0;
  if (q === c) return 2;
  if (c.startsWith(q) || q.startsWith(c)) return 1;
  return 0;
}

/**
 * アーティストが一致するか。iTunes は共演者を「A, B & C」のように並べるので、包含関係で判定する。
 * 洋楽のアーティスト名はカタカナで返ることがあり、その場合は一致しない
 */
export function artistMatches(query: string, candidate: string): boolean {
  const q = normalizeText(query);
  const c = normalizeText(candidate);
  return !!q && !!c && (c.includes(q) || q.includes(c));
}

/**
 * 検索結果から、曲名がいちばん近い候補を選ぶ。曲名が同点なら、アーティストが一致するものを優先し、
 * それも同じなら発売日が古いものを選ぶ（再発盤やベスト盤より、オリジナルの年を取るため）。
 * 曲名が一致する候補がなければ null を返す。
 */
export function pickBestHit(title: string, artist: string, hits: ItunesHit[]): ItunesHit | null {
  let best: { hit: ItunesHit; rank: [number, number] } | null = null;
  for (const hit of hits) {
    const rank: [number, number] = [titleScore(title, hit.trackName), artistMatches(artist, hit.artistName) ? 1 : 0];
    if (rank[0] === 0) continue;
    const better =
      !best ||
      rank[0] > best.rank[0] ||
      (rank[0] === best.rank[0] &&
        (rank[1] > best.rank[1] || (rank[1] === best.rank[1] && hit.releaseDate < best.hit.releaseDate)));
    if (better) best = { hit, rank };
  }
  return best?.hit ?? null;
}
