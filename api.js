async function fetchSimilarArtists(name) {
  return ["Artist A", "Artist B", "Artist C"];
}

async function fetchArtistImage(name) {
  return "https://via.placeholder.com/40?text=" + encodeURIComponent(name[0]);
}

window.fetchSimilarArtists = fetchSimilarArtists;
window.fetchArtistImage = fetchArtistImage;