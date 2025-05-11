// Ripple effect (Copiat din graph.js)
function rippleEffect(selection, color = "#ffffff", maxRadius = 60, duration = 600) {
  selection.each(function() {
    const g = d3.select(this);
    const ripple = g.insert("circle", ":first-child")
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);
    ripple.transition()
      .duration(duration)
      .attr("r", maxRadius)
      .attr("opacity", 0)
      .remove();
  });
}

// OMDB API Key și Poster API URL
const omdbApiKey = 'b5ff2cd6';
const omdbApiUrl = 'http://www.omdbapi.com/';
const omdbPosterApiUrl = 'http://img.omdbapi.com/';

// YouTube API Key
const youtubeApiKey = 'AIzaSyDjTOBb4dzffxQpKvAPolZph4gHqyNbeVk';
const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/search';

// Dimensiunile vizualizării
const width = window.innerWidth;
const height = window.innerHeight;

// Selectăm SVG-ul și creăm containerul pentru grafic
const svg = d3.select("#movie-viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

// Definim clipPath pentru imaginile nodurilor
svg.append("defs").append("clipPath")
  .attr("id", "clip-circle")
  .append("circle")
  .attr("r", 28);

// Datele pentru noduri și legături
let nodeData = [];
let linkData = [];

// Simularea forțelor D3.js
const simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(35))
  .on("tick", ticked);

// Zoom
const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

// Selectăm legăturile și nodurile
let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// Funcții de căutare
async function handleMovieSearch(searchTerm) {
  nodeData = [];
  linkData = [];
  simulation.stop();
  container.selectAll("*").remove();

  try {
    const res = await fetch(`${omdbApiUrl}?s=${encodeURIComponent(searchTerm)}&apikey=${omdbApiKey}`);
    const data = await res.json();
    const movies = data?.Search ?? [];

    if (movies && movies.length > 0) { // Verifică dacă 'movies' există și are elemente
      for (const movie of movies) {
        const movieDetails = await fetchMovieDetails(movie.imdbID);
        if (movieDetails) {
          nodeData.push({
            id: movie.imdbID,
            title: movie.Title,
            poster: movie.Poster,
            year: movie.Year,
            director: movieDetails.Director,
            actors: movieDetails.Actors,
            plot: movieDetails.Plot,
            trailerUrl: await fetchYoutubeTrailer(movie.Title),
          });
        }
      }

      svg.call(zoom.transform, d3.zoomIdentity);
      renderGraph();
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      simulation.alpha(0.3).restart();
    } else {
      alert("Nu am găsit filme pentru căutarea ta.");
    }
  } catch (error) {
    console.error("Eroare la căutarea filmelor:", error);
    alert("A apărut o eroare la căutarea filmelor.");
  }
}

async function handleActorSearch(searchTerm) {
  nodeData = [];
  linkData = [];
  simulation.stop();
  container.selectAll("*").remove();

  try {
    const res = await fetch(`${omdbApiUrl}?s=${encodeURIComponent(searchTerm)}&type=movie&apikey=${omdbApiKey}`);
    const data = await res.json();
    const movies = data?.Search ?? [];

    if (movies && movies.length > 0) { // Verifică dacă 'movies' există și are elemente
      for (const movie of movies) {
        const movieDetails = await fetchMovieDetails(movie.imdbID);
        if (movieDetails && movieDetails.Actors && movieDetails.Actors.includes(searchTerm)) {
          nodeData.push({
            id: movie.imdbID,
            title: movie.Title,
            poster: movie.Poster,
            year: movie.Year,
            director: movieDetails.Director,
            actors: movieDetails.Actors,
            plot: movieDetails.Plot,
            trailerUrl: await fetchYoutubeTrailer(movie.Title),
          });
        }
      }

      svg.call(zoom.transform, d3.zoomIdentity);
      renderGraph();
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      simulation.alpha(0.3).restart();
    } else {
      alert("Nu am găsit filme cu acest actor.");
    }
  } catch (error) {
    console.error("Eroare la căutarea filmelor:", error);
    alert("A apărut o eroare la căutarea filmelor.");
  }
}

// Funcție para a prelua detalhes do filme
async function fetchMovieDetails(movieId) {
  try {
    const res = await fetch(`${omdbApiUrl}?i=${movieId}&apikey=${omdbApiKey}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Eroare ao buscar detalhes do filme:", error);
    return null;
  }
}

// Função para buscar o trailer do filme no YouTube
async function fetchYoutubeTrailer(movieTitle) {
  try {
    const res = await fetch(`${youtubeApiUrl}?part=snippet&q=${encodeURIComponent(movieTitle)} trailer&type=video&key=${youtubeApiKey}&maxResults=1`);
    const data = await res.json();
    const videoId = data?.items?.[0]?.id?.videoId;
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  } catch (error) {
    console.error("Eroare ao buscar trailer no YouTube:", error);
    return null;
  }
}

// Funcție para resetar o gráfico
function resetMovieGraph() {
  nodeData = [];
  linkData = [];
  simulation.stop();
  container.selectAll("*").remove();
  svg.call(zoom.transform, d3.zoomIdentity);
}

// Funcții de desenare e atualização do gráfico
function ticked() {
  link
    .attr("x1", d => adjustEdge(d.source, d.target).x1)
    .attr("y1", d => adjustEdge(d.source, d.target).y1)
    .attr("x2", d => adjustEdge(d.source, d.target).x2)
    .attr("y2", d => adjustEdge(d.source, d.target).y2);

  nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

function adjustEdge(source, target, radius = 28) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
  const ratio = (dist - radius) / dist;
  const x1 = source.x + dx * (radius / dist);
  const y1 = source.y + dy * (radius / dist);
  const x2 = source.x + dx * ratio;
  const y2 = source.y + dy * ratio;
  return { x1, y1, x2, y2 };
}

function renderGraph() {
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join(
      enter => enter.append("line")
        .attr("class", "link")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.4),
      update => update,
      exit => exit.remove()
    );

  nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "node");

        g.each(function() {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("mouseover", function(event, d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          showMovieDetails(d);
        });

        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 35)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        g.append("image")
          .attr("href", d => d.poster || "default.jpg") // Afișează posterul filmului
          .attr("width", 70)
          .attr("height", 100)
          .attr("x", -35)
          .attr("y", -50)
          .style("filter", "drop-shadow(0px 1px 3px rgba(0,0,0,0.5))");

        g.append("text")
          .text(d => d.title) // Afișează titlul filmului
          .attr("text-anchor", "middle")
          .attr("dy", 55)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("pointer-events", "none");

        g.call(d3.drag()
          .on("start", (e, d) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            svg.on(".zoom", null);
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            svg.call(zoom);
          })
        );

        g.attr("transform", d => `translate(${d.x},${d.y})`);

        return g;
      },
      update => update,
      exit => exit.transition().duration(300).attr("opacity", 0).remove()
    );

  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

// Funcție de afișare a detaliilor filmului
async function showMovieDetails(movie) {
  console.log("Detalii film:", movie);
  // Implementează aici logica pentru a afișa detaliile filmului (modal, div, etc.)
  // Poți folosi datele din obiectul 'movie' (movie.title, movie.poster, movie.year)
  // și, eventual, să faci o cerere suplimentară la OMDB pentru mai multe detalii.
}

// Funcții placeholder pentru căutarea actorilor (va trebui implementată)
async function handleActorSearch(searchTerm) {
  console.log("Căutare actor:", searchTerm);
}
