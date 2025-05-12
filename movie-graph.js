// === CONFIG ===
const OMDB_API_KEY = "b5ff2cd6";
const YT_API_KEY = "AIzaSyDjTOBb4dzffxQpKvAPolZph4gHqyNbeVk";

// === D3 SETUP ===
const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

svg.append("defs").append("clipPath")
  .attr("id", "clip-circle")
  .append("circle")
  .attr("r", 36);

let nodeData = [], linkData = [];

const simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(40))
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

  // Caută film/actor/regizor
  let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(term)}`);
  let data = await res.json();
  if (data.Response !== "True") { alert("Nimic găsit!"); return; }
  let first = data.Search[0];
  let mainNode = await fetchMovieOrPerson(first.imdbID);
  nodeData.push(mainNode);

  svg.call(zoom.transform, d3.zoomIdentity);
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

function renderGraph() {
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join(
      enter => enter.append("line")
        .attr("class", "link")
        .attr("stroke", "#555")
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

        g.on("mouseover", function(e, d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          expandNode(e, d);
        });

        g.on("dblclick", (e, d) => {
          e.stopPropagation();
          showTrailer(d);
        });

        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 36)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        g.append("image")
          .attr("href", d => d.imageUrl)
          .attr("width", 72)
          .attr("height", 72)
          .attr("x", -36)
          .attr("y", -36)
          .attr("clip-path", "url(#clip-circle)")
          .style("filter", "drop-shadow(0px 1px 3px rgba(0,0,0,0.5))");

        g.append("text")
          .text(d => d.label)
          .attr("text-anchor", "middle")
          .attr("dy", 50)
          .style("font-size", "13px")
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

async function expandNode(event, clickedNode) {
  if (!clickedNode) return;

  const nodeEl = event.currentTarget ? d3.select(event.currentTarget) : null;
  if (nodeEl && !nodeEl.empty()) {
    rippleEffect(nodeEl, "#ffffff", 60, 700);
    nodeEl.select("image").style("opacity", 0.5);
    nodeEl.select(".outer-circle").style("stroke", "#f0f0f0");
  }

  try {
    // Dacă e film, adaugă actori și regizor ca noduri
    if (clickedNode.type === "movie") {
      let actorNodes = clickedNode.actors.map(name => ({
        id: clickedNode.id + "-actor-" + name,
        label: name,
        type: "actor",
        imageUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=222&color=fff"
      }));
      let directorNode = clickedNode.director ? [{
        id: clickedNode.id + "-director-" + clickedNode.director,
        label: clickedNode.director,
        type: "director",
        imageUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(clickedNode.director) + "&background=222&color=fff"
      }] : [];
      let newNodes = [...actorNodes, ...directorNode].filter(n => !nodeData.some(x => x.id === n.id));
      nodeData.push(...newNodes);
      newNodes.forEach(n => linkData.push({ source: clickedNode.id, target: n.id }));
      renderGraph();
    }
    // Dacă e actor sau regizor, caută filmele asociate
    if (clickedNode.type === "actor" || clickedNode.type === "director") {
      let res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(clickedNode.label)}`);
      let data = await res.json();
      if (data.Response === "True") {
        let movies = data.Search.slice(0, 5);
        for (let m of movies) {
          if (!nodeData.some(x => x.id === m.imdbID)) {
            let movieNode = await fetchMovieOrPerson(m.imdbID);
            nodeData.push(movieNode);
            linkData.push({ source: clickedNode.id, target: movieNode.id });
          }
        }
        renderGraph();
      }
    }
  } catch (err) {
    console.error("Expand error:", err);
  } finally {
    if (nodeEl) {
      nodeEl.select("image").style("opacity", 1);
      nodeEl.select(".outer-circle").style("stroke", "#aaa");
    }
  }
}

async function showTrailer(d) {
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

// Închide trailer la click pe overlay
document.getElementById("trailer-modal").onclick = function() {
  this.style.display = "none";
  this.innerHTML = "";
};
