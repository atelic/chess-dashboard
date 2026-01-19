const BASE_URL = 'https://lichess.org/api';

export async function validateLichessUser(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/user/${username}`);
    return response.ok;
  } catch {
    return false;
  }
}
