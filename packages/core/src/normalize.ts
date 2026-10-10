/** 表記ゆれを吸収するための正規化。曲キーと、サイトの部分一致検索で使う */
export function normalizeText(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 曲名とアーティストを正規化してタブでつないだ文字列。同じ曲かどうかの判定に使う */
export function songKey(title: string, artist: string): string {
  return `${normalizeText(title)}\t${normalizeText(artist)}`;
}
