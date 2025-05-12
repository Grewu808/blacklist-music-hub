// CONFIGURARE
const TMDB_API_KEY = 'TMDB_API_KEY_AICI'; // http://www.omdbapi.com/?i=tt1630029&apikey=b5ff2cd6
const YOUTUBE_API_KEY = 'YOUTUBE_API_KEY_AICI'; // AIzaSyDjTOBb4dzffxQpKvAPolZph4gHqyNbeVk

// ELEMENTE INTERFAȚĂ
const input = document.getElementById("search");
const resultsDiv = document.getElementById("results");

// FUNCȚII UTILITARE
async function fetchMoviePoster(movieTitle) {
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`);
  const data = await res.json();
  return data.results[0]?.poster_path 
    ? `https://image.tmdb.org/t/p/w300${data.results[0].poster_path}` 
    : 'https://via.placeholder.com/150x220?text=No+Poster';
}

async function fetchMovieTrailer(movieTitle) {
  // 1. Caută ID-ul filmului
  const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`);
  const searchData = await searchRes.json();
  const movieId = searchData.results[0]?.id;
  if (!movieId) return null;

  // 2. Obține trailer-ul de pe YouTube
  const videosRes = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);
  const videosData = await videosRes.json();
  const trailer = videosData.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

// CĂUTARE FILME
if (input && resultsDiv) {
  input.addEventListener("keyup", async (e) => {
    if (e.key === "Enter") {
      const term = input.value.trim();
      if (!term) return;

      resultsDiv.innerHTML = "Se caută...";
      try {
        // 1. Caută filme pe TMDB
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}`);
        const data = await res.json();

        // 2. Afișează rezultatele
        resultsDiv.innerHTML = "";
        if (data.results && data.results.length > 0) {
          data.results.slice(0, 5).forEach(async (movie) => {
            const div = document.createElement("div");
            div.className = "movie-card";
            div.innerHTML = `
              <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : 'https://via.placeholder.com/150x220?text=No+Poster'}" 
                   alt="${movie.title}" 
                   style="width:150px; height:220px; object-fit:cover; border-radius:8px;">
              <div class="movie-info">
                <h3>${movie.title} (${movie.release_date?.split('-')[0] || 'N/A'})</h3>
                <p>${movie.overview?.slice(0, 100)}...</p>
                <button class="trailer-btn" data-title="${movie.title}">▶ Trailer</button>
              </div>
            `;
            resultsDiv.appendChild(div);

            // 3. Eveniment pentru trailer
            div.querySelector('.trailer-btn').addEventListener('click', async () => {
              const trailerUrl = await fetchMovieTrailer(movie.title);
              if (trailerUrl) window.open(trailerUrl, '_blank');
              else alert('Trailer indisponibil');
            });
          });
        } else {
          resultsDiv.innerHTML = "Nu s-au găsit filme.";
        }
      } catch (err) {
        console.error("Eroare:", err);
        resultsDiv.innerHTML = "Eroare la căutare.";
      }
    }
  });
} else {
  console.error("Eroare: Elementele 'search' sau 'results' lipsesc.");
}

// STILURI RECOMANDATE (adaugă în <head>)
const style = document.createElement('style');
style.textContent = `
  .movie-card {
    display: flex;
    gap: 15px;
    margin: 15px 0;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    align-items: center;
  }
  .movie-info {
    color: white;
    max-width: 60%;
  }
  .trailer-btn {
    background: #E50914;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 8px;
  }
`;
document.head.appendChild(style);
