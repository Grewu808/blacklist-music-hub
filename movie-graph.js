window.onload = () => {
  const input = document.getElementById("search");
  const resultsDiv = document.getElementById("results");

  input.addEventListener("keyup", async function (e) {
    if (e.key === "Enter") {
      const term = input.value.trim();
      if (term === "") return;
      resultsDiv.innerHTML = "Se caută...";
      try {
        const res = await fetch(`https://www.omdbapi.com/?apikey=b5ff2cd6&s=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (data.Response === "True") {
          resultsDiv.innerHTML = "";
          data.Search.forEach(movie => {
            const div = document.createElement("div");
            div.className = "movie";
            div.innerHTML = `
              <img src="${movie.Poster !== "N/A" ? movie.Poster : 'https://via.placeholder.com/150x220?text=No+Image'}" alt="${movie.Title}">
              <div class="movie-title">${movie.Title} (${movie.Year})</div>
            `;
            resultsDiv.appendChild(div);
          });
        } else {
          resultsDiv.innerHTML = "Nu s-au găsit rezultate.";
        }
      } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = "Eroare la căutare.";
      }
    }
  });
};