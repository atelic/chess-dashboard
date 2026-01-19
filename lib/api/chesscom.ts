const BASE_URL = 'https://api.chess.com/pub';

export async function validateChessComUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/player/${username.toLowerCase()}`);
    return response.ok;
  } catch {
    return false;
  }
}
