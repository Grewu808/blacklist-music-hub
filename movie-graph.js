// === CONFIG ===
const OMDB_API_KEY = "b5ff2cd6";
const YT_API_KEY = "AIzaSyDjTOBb4dzffxQpKvAPolZph4gHqyNbeVk";

// === D3 SETUP ===
const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

let nodeData = [], linkData = [];

const simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(220).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-700))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(d => d.type === "movie" ? 90 : 50))
  .on("tick", ticked);

const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// === SEARCH HANDLERS ===
document.getElementById("search-btn").onclick = handleSearch;
document.getElementById("search").addEventListener("keypress", e => { if (e.key === 'Enter') handleSearch(); });

async function handleSearch() {
  const term = document.getElementById("search").value.trim();
  if (!term) return;
  nodeData = []; linkData = []; simulation.stop(); container.selectAll("*").remove();

  // 1. Caută film exact
  let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(term)}`);
  let data = await res.json();

  if (data.Response === "True" && (data.Type === "movie" || data.Type === "series")) {
    let mainNode = await fetchMovie(data.imdbID);
    nodeData.push(mainNode);
    svg.call(zoom.transform, d3.zoomIdentity);
    renderGraph();
    simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
    return;
  }

  // 2. Dacă nu găsește film exact, caută după actor
  res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(term)}`);
  data = await res.json();
  if (data.Response === "True") {
    // Dacă primul rezultat e film, îl afișăm
    let first = data.Search[0];
    if (first.Type === "movie" || first.Type === "series") {
      let mainNode = await fetchMovie(first.imdbID);
      nodeData.push(mainNode);
      svg.call(zoom.transform, d3.zoomIdentity);
      renderGraph();
      simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
      return;
    }
  }

  // 3. Dacă nu e film, presupunem că e actor
  let mainNode = fetchActor(term);
  nodeData.push(mainNode);
  svg.call(zoom.transform, d3.zoomIdentity);
  renderGraph();
  simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
}

async function fetchMovie(imdbID) {
  let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=short`);
  let data = await res.json();
  return {
    id: data.imdbID,
    label: data.Title,
    type: "movie",
    imageUrl: data.Poster && data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/200x300?text=No+Image",
    year: data.Year,
    genre: data.Genre || "",
    plot: data.Plot || "",
  };
}

function fetchActor(name) {
  return {
    id: "actor-" + name,
    label: name,
    type: "actor",
    imageUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=222&color=fff"
  };
}

function ticked() {
  link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

function rippleEffect(selection, color = "#ffffff", maxRadius = 80, duration = 700) {
  selection.each(function() {
    const g = d3.select(this);
    const ripple = g.insert("rect", ":first-child")
      .attr("x", -60).attr("y", -90)
      .attr("width", 120).attr("height", 180)
      .attr("rx", 16)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 3)
      .attr("opacity", 0.7);
    ripple.transition()
      .duration(duration)
      .attr("x", -80).attr("y", -120)
      .attr("width", 160).attr("height", 240)
      .attr("opacity", 0)
      .remove();
  });
}

function renderGraph() {
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join(
      enter => enter.append("line")
        .attr("class", "link")
        .attr("stroke", "#00cc66")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.5),
      update => update,
      exit => exit.remove()
    );

  nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "node").style("cursor", "pointer");

        g.each(function(d) {
          if (d.type === "movie") {
            rippleEffect(d3.select(this), "#00cc66", 80, 700);
          }
        });

        g.on("mouseover", function(e, d) {
          if (d.type === "movie") rippleEffect(d3.select(this), "#00cc66", 80, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          expandNode(e, d);
        });

        g.on("dblclick", (e, d) => {
          e.stopPropagation();
          if (d.type === "movie") showTrailer(d);
        });

        // Noduri filme: dreptunghi poster
        g.filter(d => d.type === "movie")
          .append("rect")
          .attr("x", -60).attr("y", -90)
          .attr("width", 120).attr("height", 180)
          .attr("rx", 16)
          .attr("fill", "#222")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 2);

        g.filter(d => d.type === "movie")
          .append("image")
          .attr("href", d => d.imageUrl)
          .attr("x", -60).attr("y", -90)
          .attr("width", 120).attr("height", 180)
          .attr("clip-path", null);

        g.filter(d => d.type === "movie")
          .append("text")
          .text(d => d.label)
          .attr("text-anchor", "middle")
          .attr("y", 105)
          .style("font-size", "15px")
          .style("font-weight", "bold")
          .style("fill", "#fff")
          .style("pointer-events", "none");

        g.filter(d => d.type === "movie")
          .append("text")
          .text(d => d.year || "")
          .attr("text-anchor", "middle")
          .attr("y", 125)
          .style("font-size", "13px")
          .style("fill", "#aaa")
          .style("pointer-events", "none");

        // Noduri actori: cerc
        g.filter(d => d.type === "actor")
          .append("circle")
          .attr("r", 50)
          .attr("fill", "#222")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 2);

        g.filter(d => d.type === "actor")
          .append("image")
          .attr("href", d => d.imageUrl)
          .attr("x", -40).attr("y", -40)
          .attr("width", 80).attr("height", 80)
          .attr("clip-path", null);

        g.filter(d => d.type === "actor")
          .append("text")
          .text(d => d.label)
          .attr("text-anchor", "middle")
          .attr("y", 65)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#fff")
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

        g.attr("transform", d => `translate(${d.x || width/2},${d.y || height/2})`);

        return g;
      },
      update => update,
      exit => exit.transition().duration(300).attr("opacity", 0).remove()
    );

  // Asigură-te că liniile sunt sub postere
  container.selectAll("line.link").lower();
  container.selectAll("g.node").raise();

  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

async function expandNode(event, clickedNode) {
  if (!clickedNode) return;
  if (clickedNode.expanded) return;
  clickedNode.expanded = true;

  // Filme: adaugă filme din același gen
  if (clickedNode.type === "movie") {
    let genres = clickedNode.genre ? clickedNode.genre.split(",").map(g => g.trim()) : [];
    let mainGenre = genres[0] || clickedNode.label.split(" ")[0];

    let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(mainGenre)}`);
    let data = await res.json();
    if (data.Response === "True") {
      let movies = [];
      for (let m of data.Search) {
        if (m.imdbID !== clickedNode.id && (m.Type === "movie" || m.Type === "series")) {
          let det = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${m.imdbID}`);
          let detData = await det.json();
          if (detData.Genre && genres.some(g => detData.Genre.includes(g))) {
            movies.push(m);
          }
        }
        if (movies.length >= 5) break;
      }
      for (let m of movies) {
        if (!nodeData.some(x => x.id === m.imdbID)) {
          let movieNode = await fetchMovie(m.imdbID);
          let angle = Math.random() * 2 * Math.PI;
          movieNode.x = clickedNode.x + 250 * Math.cos(angle);
          movieNode.y = clickedNode.y + 250 * Math.sin(angle);
          nodeData.push(movieNode);
          linkData.push({ source: clickedNode.id, target: movieNode.id });
        }
      }
      renderGraph();
    }
  }

  // Actori: adaugă actori cu care a jucat împreună
  if (clickedNode.type === "actor") {
    let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(clickedNode.label)}`);
    let data = await res.json();
    if (data.Response === "True") {
      let movies = data.Search.slice(0, 5);
      for (let m of movies) {
        let movieNode = await fetchMovie(m.imdbID);
        let res2 = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${m.imdbID}`);
        let data2 = await res2.json();
        let actors = data2.Actors ? data2.Actors.split(",").map(a => a.trim()) : [];
        for (let name of actors) {
          if (name !== clickedNode.label && !nodeData.some(x => x.id === "actor-" + name)) {
            let actorNode = fetchActor(name);
            let angle = Math.random() * 2 * Math.PI;
            actorNode.x = clickedNode.x + 200 * Math.cos(angle);
            actorNode.y = clickedNode.y + 200 * Math.sin(angle);
            nodeData.push(actorNode);
            linkData.push({ source: clickedNode.id, target: actorNode.id });
          }
        }
      }
      renderGraph();
    }
  }
}

async function showTrailer(d) {
  let q = d.label + " " + (d.year || "") + " trailer";
  let yt = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=${YT_API_KEY}&type=video&maxResults=1`);
  let ytData = await yt.json();
  if (ytData.items && ytData.items.length > 0 && ytData.items[0].id && ytData.items[0].id.videoId) {
    let videoId = ytData.items[0].id.videoId;
    let modal = document.getElementById("trailer-modal");
    modal.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allowfullscreen></iframe>`;
    modal.style.display = "flex";
  } else {
    alert("Trailer indisponibil.");
  }
}

// Închide trailer la click pe overlay
document.getElementById("trailer-modal").onclick = function() {
  this.style.display = "none";
  this.innerHTML = "";
};
