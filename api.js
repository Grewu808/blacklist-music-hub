const API_KEY = "fe14d9e2ae87da47a1642aab12b6f52b";

export async function fetchSimilarArtists(artistName) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json&limit=5`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.similarartists?.artist?.map(a => a.name) || [];
}

export async function fetchArtistImage(artistName) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const images = data?.artist?.image || [];
  const largeImage = images.find(img => img.size === "large");
  return largeImage?.["#text"] || "";
}