// ------------ graph.js (Hybrid Last.fm + Spotify) - Versiune Completă și Funcțională ------------

// ATENȚIE: NU folosi acest cod pe un site public! Secretul Spotify e expus aici!
const spotifyClientId = '38d179166ca140e498c596340451c1b5';
const spotifyClientSecret = '8bf8f530ca544c0dae7df204d2531bf1';
const lastFmApiKey = 'fe14d9e2ae87da47a1642aab12b6f52b';

let spotifyAccessToken = null;
let spotifyTokenExpiryTime = 0;

async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiryTime) return spotifyAccessToken;
  const authString = `${spotifyClientId}:${spotifyClientSecret}`;
  const base64AuthString = btoa(authString);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64AuthString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) throw new Error("Spotify auth failed");

  const data = await response.json();
  spotifyAccessToken = data.access_token;
  spotifyTokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyAccessToken;
}

const spotifyApiBaseUrl = 'https://api.spotify.com/v1';
const lastFmApiBaseUrl = 'https://ws.audioscrobbler.com/2.0';

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

let simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(35))
  .on("tick", ticked);

const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

const searchInput = document.getElementById('artist-search-input');
const searchButton = document.getElementById('artist-search-button');

if (searchButton && searchInput) {
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  });
}

function handleSearch() {
  const artistName = searchInput.value.trim();
  if (!artistName) {
    alert("Introdu un nume de artist.");
    return;
  }

  nodeData = [];
  linkData = [];
  simulation.stop();
  container.selectAll("*").remove();
  link = container.selectAll("line.link");
  nodeGroup = container.selectAll("g.node");

  nodeData.push({
    id: artistName,
    x: width / 2 + (Math.random() - 0.5) * 5,
    y: height / 2 + (Math.random() - 0.5) * 5,
    imageUrl: null
  });

  svg.call(zoom.transform, d3.zoomIdentity);
  renderGraph();
  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  simulation.alpha(0.3).restart();
}

function ticked() {
  if (link) link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  if (nodeGroup) nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
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
        g.on("click", (e, d) => {
          e.stopPropagation();
          expandNode(e, d);
        });
        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 28)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);
        g.append("image")
          .attr("href", d => d.imageUrl || "")
          .attr("width", 56)
          .attr("height", 56)
          .attr("x", -28)
          .attr("y", -28)
          .attr("clip-path", "url(#clip-circle)");
        g.append("title").text(d => d.id);
        g.append("text")
          .attr("dy", "1.8em")
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#ccc")
          .text(d => d.id);
        g.call(drag(simulation));
        g.attr("transform", d => `translate(${d.x},${d.y})`);
        return g;
      },
      update => {
        update.select("title").text(d => d.id);
        update.select("text").text(d => d.id);
        update.select("image").attr("href", d => d.imageUrl || "");
        update.select(".outer-circle")
          .attr("stroke", d => d.errorState === 'error' ? 'red' :
            d.errorState === 'warning' ? 'orange' : '#aaa');
        return update;
      },
      exit => exit.transition().duration(300).attr("opacity", 0).remove()
    );

  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

function drag(sim) {
  if (!sim) return () => {};
  function dragstarted(e, d) {
    if (!e.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    svg.on(".zoom", null);
  }
  function dragged(e, d) {
    d.fx = e.x;
    d.fy = e.y;
  }
  function dragended(e, d) {
    if (!e.active) sim.alphaTarget(0);
    svg.call(zoom);
  }
  return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}

async function expandNode(event, clickedNode) {
  const artistName = clickedNode.id;
  if (!artistName) return;

  const nodeEl = event.currentTarget ? d3.select(event.currentTarget) : null;
  if (nodeEl && !nodeEl.empty()) {
    nodeEl.select("image").style("opacity", 0.5);
    nodeEl.select(".outer-circle").style("stroke", "#f0f0f0");
  }
  delete clickedNode.errorState;

  try {
    const lastFmUrl = `${lastFmApiBaseUrl}/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${lastFmApiKey}&limit=6&format=json`;
    const response = await fetch(lastFmUrl);
    if (!response.ok) throw new Error("Last.fm fetch failed");

    const data = await response.json();
    const similar = data?.similarartists?.artist ?? [];
    const names = similar.filter(a => a.name && a.name.toLowerCase() !== artistName.toLowerCase())
      .slice(0, 6).map(a => a.name);

    if (!names.length) {
      if (nodeEl) nodeEl.select(".outer-circle").style("stroke", "orange");
      clickedNode.errorState = 'warning';
      return;
    }

    const token = await getSpotifyAccessToken();
    const existingIds = new Set(nodeData.map(n => n.id));
    const cx = clickedNode.x ?? width / 2;
    const cy = clickedNode.y ?? height / 2;
    const radius = 150;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (existingIds.has(name)) {
        const exists = linkData.some(l =>
          (l.source.id || l.source) === clickedNode.id &&
          (l.target.id || l.target) === name
        );
        if (!exists) linkData.push({ source: clickedNode.id, target: name });
        continue;
      }

      let imageUrl = null;
      try {
        const searchUrl = `${spotifyApiBaseUrl}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;
        const resp = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await resp.json();
        const artist = resData?.artists?.items?.[0];
        if (artist?.images?.length) {
          imageUrl = artist.images.find(img => img.height >= 64)?.url || artist.images[0].url;
        }
      } catch (e) {}

      const angle = (2 * Math.PI / names.length) * i;
      nodeData.push({
        id: name,
        imageUrl,
        x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 30
      });
      linkData.push({ source: clickedNode.id, target: name });
      existingIds.add(name);
    }

    delete clickedNode.fx;
    delete clickedNode.fy;
    renderGraph();
    simulation.alpha(0.3).restart();

  } catch (err) {
    if (nodeEl) nodeEl.select(".outer-circle").style("stroke", "red");
    clickedNode.errorState = 'error';
  } finally {
    if (nodeEl) {
      nodeEl.select("image").style("opacity", 1);
      if (!clickedNode.errorState) nodeEl.select(".outer-circle").style("stroke", "#aaa");
    }
  }
}

// ------------ FINAL graph.js ------------