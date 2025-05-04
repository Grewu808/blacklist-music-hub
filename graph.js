// Ripple effect
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

// Spotify credentials
const spotifyClientId = '38d179166ca140e498c596340451c1b5';
const spotifyClientSecret = '8bf8f530ca544c0dae7df204d2531bf1';
const lastFmApiKey = 'fe14d9e2ae87da47a1642aab12b6f52b';

let spotifyAccessToken = null;
let spotifyTokenExpiryTime = 0;

async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiryTime) return spotifyAccessToken;
  const base64 = btoa(`${spotifyClientId}:${spotifyClientSecret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  spotifyAccessToken = data.access_token;
  spotifyTokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyAccessToken;
}

async function fetchArtistImage(artistName) {
  try {
    const token = await getSpotifyAccessToken();
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const artist = data?.artists?.items?.[0];
    return artist?.images?.[0]?.url || "default.jpg";
  } catch {
    return "default.jpg";
  }
}

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

svg.append("defs").append("clipPath")
  .attr("id", "clip-circle")
  .append("circle")
  .attr("r", 28);

let nodeData = [];
let linkData = [];

const simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(35))
  .on("tick", ticked);

const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

document.getElementById("artist-search-button").addEventListener("click", handleSearch);
document.getElementById("artist-search-input").addEventListener("keypress", e => {
  if (e.key === 'Enter') handleSearch();
});

async function handleSearch() {
  const artistName = document.getElementById("artist-search-input").value.trim();
  if (!artistName) return;

  nodeData = [];
  linkData = [];
  simulation.stop();
  container.selectAll("*").remove();

  const imageUrl = await fetchArtistImage(artistName);
  nodeData.push({
    id: artistName,
    x: width / 2 + Math.random() * 5,
    y: height / 2 + Math.random() * 5,
    imageUrl: imageUrl
  });

  svg.call(zoom.transform, d3.zoomIdentity);
  renderGraph();
  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  simulation.alpha(0.3).restart();
}


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

        g.on("mouseover", function() {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        
          playArtistPreview(d.id);});

        g.on("click", (e, d) => {
          e.stopPropagation();
          playArtistPreview(d.id);
          expandNode(e, d);
        });

        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 28)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        g.append("image")
          .attr("href", d => d.imageUrl || "default.jpg")
          .attr("width", 56)
          .attr("height", 56)
          .attr("x", -28)
          .attr("y", -28)
          .attr("clip-path", "url(#clip-circle)")
          .style("filter", "drop-shadow(0px 1px 3px rgba(0,0,0,0.5))");

        g.append("text")
        // Play button pe nod
        g.append("circle")
          .attr("class", "play-button")
          .attr("r", 6)
          .attr("cx", 20)
          .attr("cy", -20)
          .style("fill", "#00ff00")
          .style("stroke", "#fff")
          .style("stroke-width", "1px")
          .style("cursor", "pointer")
          .on("click", (e, d) => {
            e.stopPropagation();
            playArtistPreview(d.id);
          });

          .text(d => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", 42)
          .style("font-size", "12px")
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
  const artistName = clickedNode.id;
  if (!artistName) return;

  const nodeEl = event.currentTarget ? d3.select(event.currentTarget) : null;
  if (nodeEl && !nodeEl.empty()) {
    rippleEffect(nodeEl, "#ffffff", 60, 700);
    nodeEl.select("image").style("opacity", 0.5);
    nodeEl.select(".outer-circle").style("stroke", "#f0f0f0");
  }

  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${lastFmApiKey}&limit=6&format=json`);
    const data = await res.json();
    const similar = data?.similarartists?.artist ?? [];
    const names = similar.filter(a => a.name && a.name.toLowerCase() !== artistName.toLowerCase()).slice(0, 6).map(a => a.name);

    const existingIds = new Set(nodeData.map(n => n.id));
    const existingLinks = new Set(linkData.map(d => `${d.source}-${d.target}`));
    const cx = clickedNode.x ?? width / 2;
    const cy = clickedNode.y ?? height / 2;
    const radius = 130;

    clickedNode.fx = cx;
    clickedNode.fy = cy;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];

      if (!existingIds.has(name)) {
        const imageUrl = await fetchArtistImage(name);
        const angle = (2 * Math.PI / names.length) * i;
        nodeData.push({
          id: name,
          imageUrl,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle)
        });
      }

      const keyA = `${clickedNode.id}-${name}`;
      const keyB = `${name}-${clickedNode.id}`;
      if (!existingLinks.has(keyA) && !existingLinks.has(keyB)) {
        linkData.push({ source: clickedNode.id, target: name });
      }
    }

    renderGraph();
    simulation.alpha(0.6).restart();

    setTimeout(() => {
      delete clickedNode.fx;
      delete clickedNode.fy;
    }, 1500);

  } catch (err) {
    console.error("Expand error:", err);
  } finally {
    if (nodeEl) {
      nodeEl.select("image").style("opacity", 1);
      nodeEl.select(".outer-circle").style("stroke", "#aaa");
    }
  }
}


// Preview audio player using iTunes API
const audioPlayer = new Audio();
audioPlayer.volume = 1.0;

async function playArtistPreview(artistName) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&limit=10`);
    const data = await res.json();
    const tracks = data?.results?.filter(track => track.previewUrl);
    if (tracks && tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      const previewUrl = randomTrack.previewUrl;

      audioPlayer.pause();
      audioPlayer.src = previewUrl;
      audioPlayer.play().catch(e => console.warn("Audio play error:", e));
    }
  } catch (err) {
    console.error("iTunes fetch failed:", err);
  }
}

// Stop audio on background tap/click
document.body.addEventListener("click", (e) => {
  const isNode = e.target.closest(".node");
  if (!isNode) {
    audioPlayer.pause();
    d3.selectAll(".play-button").remove();
  }
}, true);
