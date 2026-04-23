export interface BggGame {
  id: number;
  name: string;
  nameKo?: string;
  yearPublished?: number;
  minPlayers?: number;
  maxPlayers?: number;
  playingTime?: number;
  thumbnail?: string;
  image?: string;
  description?: string;
  rating?: number;
  boardlifeUrl?: string;
}

export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished?: number;
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  try {
    const res = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`,
      { next: { revalidate: 3600 } }
    );
    const xml = await res.text();
    const items = [...xml.matchAll(/<item type="boardgame" id="(\d+)"[\s\S]*?<name[^>]*value="([^"]*)"[\s\S]*?(?:<yearpublished[^>]*value="(\d+)")?[\s\S]*?<\/item>/g)];
    return items.slice(0, 20).map(m => ({
      id: parseInt(m[1]),
      name: m[2],
      yearPublished: m[3] ? parseInt(m[3]) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getBggGame(id: number): Promise<BggGame | null> {
  try {
    const res = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`,
      { next: { revalidate: 86400 } }
    );
    const xml = await res.text();

    const nameMatch = xml.match(/<name type="primary"[^>]*value="([^"]*)"/);
    const yearMatch = xml.match(/<yearpublished[^>]*value="(\d+)"/);
    const minPMatch = xml.match(/<minplayers[^>]*value="(\d+)"/);
    const maxPMatch = xml.match(/<maxplayers[^>]*value="(\d+)"/);
    const timeMatch = xml.match(/<playingtime[^>]*value="(\d+)"/);
    const thumbMatch = xml.match(/<thumbnail>([\s\S]*?)<\/thumbnail>/);
    const imgMatch = xml.match(/<image>([\s\S]*?)<\/image>/);
    const ratingMatch = xml.match(/<average[^>]*value="([\d.]+)"/);

    if (!nameMatch) return null;

    return {
      id,
      name: nameMatch[1],
      yearPublished: yearMatch ? parseInt(yearMatch[1]) : undefined,
      minPlayers: minPMatch ? parseInt(minPMatch[1]) : undefined,
      maxPlayers: maxPMatch ? parseInt(maxPMatch[1]) : undefined,
      playingTime: timeMatch ? parseInt(timeMatch[1]) : undefined,
      thumbnail: thumbMatch?.[1]?.trim(),
      image: imgMatch?.[1]?.trim(),
      rating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
      boardlifeUrl: `https://boardlife.co.kr/board_game.php?board_id=${id}`,
    };
  } catch {
    return null;
  }
}
