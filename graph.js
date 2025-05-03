// ------------ graph.js (Hybrid Last.fm + Spotify) - Full Upgrade FINAL ------------

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

async function fetchArtistImage(artistName) {
  try {
    const token = await getSpotifyAccessToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const artist = data?.artists?.items?.[0];
    if (artist?.images?.length) {
      return artist.images.find(img => img.height >= 64)?.url || artist.images[0].url;
    }
  } catch (e) {
    console.warn("No image found for:", artistName);
  }
  return 'default.jpg';
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



// Inject CSS for fallback glow effect
const fallbackStyle = document.createElement('style');
fallbackStyle.innerHTML = `
  g.node.glow-fallback circle.outer-circle {
    stroke: #ffff99;
    stroke-width: 3;
    filter: drop-shadow(0px 0px 6px #ffff99);
  }
`;
document.head.appendChild(fallbackStyle);


// Inject CSS for hover scaling effect
const style = document.createElement('style');
style.innerHTML = `
  g.node:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease-out;
  }
`;
document.head.appendChild(style);


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

async function handleSearch() {
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

  const imageUrl = await fetchArtistImage(artistName);

  nodeData.push({
    id: artistName,
    x: width / 2 + (Math.random() - 0.5) * 5,
    y: height / 2 + (Math.random() - 0.5) * 5,
    imageUrl: imageUrl
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

        g.each(function(d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("mouseover", function(event, d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          if (navigator.vibrate) {
            navigator.vibrate(50);
          } else {
            const node = d3.select(e.currentTarget);
            node.classed("glow-fallback", true);
            setTimeout(() => node.classed("glow-fallback", false), 500);
          }
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
          .text(d => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", 42)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("pointer-events", "none");

        g.call(drag(simulation));
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
  
}-${d.target.id || d.target}`)
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

        g.each(function(d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("mouseover", function(event, d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          if (navigator.vibrate) {
            navigator.vibrate(50);
          } else {
            const node = d3.select(e.currentTarget);
            node.classed("glow-fallback", true);
            setTimeout(() => node.classed("glow-fallback", false), 500);
          }
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
          .text(d => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", 42)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("pointer-events", "none");

        g.call(drag(simulation));
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
-${d.target.id || d.target}`)
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

        g.each(function(d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("mouseover", function(event, d) {
          rippleEffect(d3.select(this), "#ffffff", 60, 700);
        });

        g.on("click", (e, d) => {
          e.stopPropagation();
          if (navigator.vibrate) {
            navigator.vibrate(50);
          } else {
            const node = d3.select(e.currentTarget);
            node.classed("glow-fallback", true);
            setTimeout(() => node.classed("glow-fallback", false), 500);
          }
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
          .text(d => d.id)
          .attr("text-anchor", "middle")
          .attr("dy", 42)
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("pointer-events", "none");

        g.call(drag(simulation));
        g.attr("transform", d => `translate(${d.x},${d.y})`);

        return g;
      },,
      update => update,
      exit => exit.transition().duration(300).attr("opacity", 0).remove()
    );

  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

function drag(sim) {
  function dragstarted(e, d) {
    if (!e.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    svg.on(".zoom", null);
  }


function rippleEffect(selection, color = "#ffffff", maxRadius = 60, duration = 600) {
  selection.each(function(d) {
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
    rippleEffect(nodeEl, "#ffffff", 60, 700);
    nodeEl.select("image").style("opacity", 0.5);
    nodeEl.select(".outer-circle").style("stroke", "#f0f0f0");
  }

  try {
    const lastFmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${lastFmApiKey}&limit=6&format=json`;
    const response = await fetch(lastFmUrl);
    if (!response.ok) throw new Error("Last.fm fetch failed");

    const data = await response.json();
    const similar = data?.similarartists?.artist ?? [];
    const names = similar
      .filter(a => a.name && a.name.toLowerCase() !== artistName.toLowerCase())
      .slice(0, 6)
      .map(a => a.name);

    const token = await getSpotifyAccessToken();
    const existingIds = new Set(nodeData.map(n => n.id));
    const cx = clickedNode.x ?? width / 2;
    const cy = clickedNode.y ?? height / 2;
    const radius = 130;

    // LOCK clicked node IMMEDIATELY
    clickedNode.fx = clickedNode.x;
    clickedNode.fy = clickedNode.y;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (existingIds.has(name)) continue;

      const imageUrl = await fetchArtistImage(name);
      const angle = (2 * Math.PI / names.length) * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      nodeData.push({
        id: name,
        imageUrl,
        x,
        y,
        fx: x,
        fy: y
      });
      linkData.push({ source: clickedNode.id, target: name });
      existingIds.add(name);
    }

    renderGraph();

    // Restart force after everything is positioned
    simulation.alpha(0.6).restart();

    // Unlock all after 1.5 sec
    setTimeout(() => {
      delete clickedNode.fx;
      delete clickedNode.fy;
      nodeData.forEach(n => {
        if (n.fx) delete n.fx;
        if (n.fy) delete n.fy;
      });
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

// ------------ FINAL ------------