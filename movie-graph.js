const OMDB_API_KEY = "b5ff2cd6";
const YT_API_KEY = "AIzaSyDjTOBb4dzffxQpKvAPolZph4gHqyNbeVk";

const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

let nodeData = [], linkData = [];
let simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width/2, height/2))
  .force("collide", d3.forceCollide().radius(40))
  .on("tick", ticked);

const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

document.getElementById("search-btn").onclick = handleSearch;
document.getElementById("search").addEventListener("keypress", e => { if (e.key === 'Enter') handleSearch(); });

async function handleSearch() {
  const term = document.getElementById("search").value.trim();
  if (!term) return;
  nodeData = []; linkData = []; simulation.stop(); container.selectAll("*").remove();

  // 1. Caută film, actor sau regizor
  let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(term)}`);
  let data = await res.json();
  if (data.Response !== "True") { alert("Nimic găsit!"); return; }
  let first = data.Search[0];
  let mainNode = await fetchMovieOrPerson(first.imdbID);
  nodeData.push(mainNode);

  renderGraph();
  simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
}

async function fetchMovieOrPerson(imdbID) {
  let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=short`);
  let data = await res.json();
  return {
    id: data.imdbID,
    label: data.Title || data.Name,
    type: data.Type || "movie",
    imageUrl: data.Poster && data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/150x220?text=No+Image",
    year: data.Year,
    actors: data.Actors ? data.Actors.split(",").map(a => a.trim()) : [],
    director: data.Director || "",
    genre: data.Genre || "",
    trailer: null // completăm la click
  };
}

function ticked() {
  link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

function renderGraph() {
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id}-${d.target.id}`)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#555")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.4);

  nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "node");
        g.append("circle")
          .attr("r", 36)
          .attr("fill", "#222")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 2);
        g.append("image")
          .attr("href", d => d.imageUrl)
          .attr("width", 72).attr("height", 72)
          .attr("x", -36).attr("y", -36)
          .attr("clip-path", "circle(36px at 36px 36px)");
        g.append("text")
          .text(d => d.label)
          .attr("text-anchor", "middle")
          .attr("dy", 50)
          .style("font-size", "13px")
          .style("fill", "#fff");
        g.on("click", expandNode);
        g.on("dblclick", showTrailer);
        return g;
      },
      update => update,
      exit => exit.remove()
    );
  simulation.nodes(nodeData); simulation.force("link").links(linkData);
  if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

async function expandNode(e, d) {
  // Dacă e film, adaugă actori și regizor ca noduri
  if (d.type === "movie") {
    let actorNodes = d.actors.map(name => ({
      id: d.id + "-actor-" + name,
      label: name,
      type: "actor",
      imageUrl: "https://via.placeholder.com/72?text=" + encodeURIComponent(name)
    }));
    let directorNode = d.director ? [{
      id: d.id + "-director-" + d.director,
      label: d.director,
      type: "director",
      imageUrl: "https://via.placeholder.com/72?text=" + encodeURIComponent(d.director)
    }] : [];
    let newNodes = [...actorNodes, ...directorNode].filter(n => !nodeData.some(x => x.id === n.id));
    nodeData.push(...newNodes);
    newNodes.forEach(n => linkData.push({ source: d.id, target: n.id }));
    renderGraph();
  }
  // Dacă e actor sau regizor, caută filmele asociate
  if (d.type === "actor" || d.type === "director") {
    let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(d.label)}`);
    let data = await res.json();
    if (data.Response === "True") {
      let movies = data.Search.slice(0, 5);
      for (let m of movies) {
        if (!nodeData.some(x => x.id === m.imdbID)) {
          let movieNode = await fetchMovieOrPerson(m.imdbID);
          nodeData.push(movieNode);
          linkData.push({ source: d.id, target: movieNode.id });
        }
      }
      renderGraph();
    }
  }
}

async function showTrailer(e, d) {
  // Caută trailer pe YouTube
  let q = d.label + " trailer";
  let yt = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=${YT_API_KEY}&type=video&maxResults=1`);
  let ytData = await yt.json();
  if (ytData.items && ytData.items.length > 0) {
    let videoId = ytData.items[0].id.videoId;
    let modal = document.getElementById("trailer-modal");
    modal.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allowfullscreen></iframe>`;
    modal.style.display = "flex";
  } else {
    alert("Trailer indisponibil.");
  }
}
