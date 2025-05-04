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

// API Configuration (safer approach)
const API_ENDPOINTS = {
  spotifyToken: '/api/spotify/token', // Proxy endpoint in production
  spotifySearch: '/api/spotify/search',
  lastFmSearch: '/api/lastfm/similar'
};

let spotifyAccessToken = null;
let spotifyTokenExpiryTime = 0;

// Caching layer
const cache = {
  get: (key) => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  set: (key, value, ttl = 3600000) => {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  }
};

async function getSpotifyAccessToken() {
  const cacheKey = 'spotify-token';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  try {
    const res = await fetch(API_ENDPOINTS.spotifyToken);
    const data = await res.json();
    cache.set(cacheKey, data.access_token, (data.expires_in - 60) * 1000);
    return data.access_token;
  } catch (error) {
    console.error("Token fetch failed:", error);
    return null;
  }
}

async function fetchArtistImage(artistName) {
  const cacheKey = `artist-${artistName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.value;

  try {
    const token = await getSpotifyAccessToken();
    if (!token) return "default.jpg";

    const res = await fetch(`${API_ENDPOINTS.spotifySearch}?artist=${encodeURIComponent(artistName)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const imageUrl = data?.artists?.items?.[0]?.images?.[0]?.url || "default.jpg";
    cache.set(cacheKey, imageUrl);
    return imageUrl;
  } catch (error) {
    console.error("Artist image fetch failed:", error);
    return "default.jpg";
  }
}

// Initialize visualization
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#000");

const container = svg.append("g").attr("class", "zoom-container");

svg.append("defs").append("clipPath")
  .attr("id", "clip-circle")
  .append("circle")
  .attr("r", 28);

let nodeData = [];
let linkData = [];

// Optimized simulation
const simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-300)) // Reduced strength
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(35))
  .alphaDecay(0.05) // Faster stabilization
  .on("tick", ticked);

const zoom = d3.zoom()
  .scaleExtent([0.1, 4])
  .on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

// UI Elements
const searchInput = document.getElementById("artist-search-input");
const searchButton = document.getElementById("artist-search-button");
const searchStatus = document.getElementById("search-status");

searchButton.addEventListener("click", handleSearch);
searchInput.addEventListener("keypress", e => {
  if (e.key === 'Enter') handleSearch();
});

// Improved search with feedback
async function handleSearch() {
  const artistName = searchInput.value.trim();
  if (!artistName) {
    updateStatus("Introdu un nume de artist", "error");
    return;
  }

  updateStatus("Căutăm...", "loading");
  searchInput.disabled = true;
  searchButton.disabled = true;

  try {
    nodeData = [];
    linkData = [];
    simulation.stop();
    container.selectAll("*").remove();

    const imageUrl = await fetchArtistImage(artistName);
    if (imageUrl === "default.jpg") {
      throw new Error("Artist not found");
    }

    nodeData.push({
      id: artistName,
      x: width / 2 + Math.random() * 5,
      y: height / 2 + Math.random() * 5,
      imageUrl
    });

    svg.call(zoom.transform, d3.zoomIdentity);
    renderGraph();
    simulation.nodes(nodeData);
    simulation.force("link").links(linkData);
    simulation.alpha(0.3).restart();

    updateStatus("Gata! Explorează artiștii similari", "success");
  } catch (error) {
    console.error("Search failed:", error);
    updateStatus("Artistul nu a fost găsit. Încearcă alt nume", "error");
  } finally {
    searchInput.disabled = false;
    searchButton.disabled = false;
  }
}

function updateStatus(message, type) {
  if (!searchStatus) return;
  
  searchStatus.textContent = message;
  searchStatus.style.color = type === "error" ? "#ff4444" : 
                          type === "success" ? "#00cc66" : "#ffffff";
}

// Rest of the code remains the same until expandNode...

async function expandNode(event, clickedNode) {
  const artistName = clickedNode.id;
  if (!artistName) return;

  const nodeEl = event.currentTarget ? d3.select(event.currentTarget) : null;
  if (nodeEl && !nodeEl.empty()) {
    rippleEffect(nodeEl, "#ffffff", 60, 700);
    nodeEl.select("image").style("opacity", 0.5);
    nodeEl.select(".outer-circle").style("stroke", "#f0f0f0");
  }

  updateStatus(`Se încarcă artiști similari cu ${artistName}...`, "loading");

  try {
    const cacheKey = `similar-${artistName}`;
    const cached = cache.get(cacheKey);
    let names = [];

    if (cached) {
      names = cached.value;
    } else {
      const res = await fetch(`${API_ENDPOINTS.lastFmSearch}?artist=${encodeURIComponent(artistName)}`);
      const data = await res.json();
      names = data?.similarartists?.artist
        ?.filter(a => a.name && a.name.toLowerCase() !== artistName.toLowerCase())
        .slice(0, 6)
        .map(a => a.name) || [];
      cache.set(cacheKey, names);
    }

    // Rest of the expandNode implementation...
    // (Keep the existing node expansion logic)

    updateStatus(`Am găsit ${names.length} artiști similari`, "success");
  } catch (err) {
    console.error("Expand error:", err);
    updateStatus("Eroare la încărcarea artiștilor similari", "error");
  } finally {
    if (nodeEl) {
      nodeEl.select("image").style("opacity", 1);
      nodeEl.select(".outer-circle").style("stroke", "#aaa");
    }
  }
}

// Audio player with better error handling
const audioPlayer = new Audio();
audioPlayer.volume = 0.7; // Lower default volume

async function playArtistPreview(artistName) {
  const cacheKey = `preview-${artistName}`;
  const cached = cache.get(cacheKey);
  let previewUrl = cached?.value;

  if (!previewUrl) {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&limit=10`);
      const data = await res.json();
      const tracks = data?.results?.filter(track => track.previewUrl);
      if (tracks?.length > 0) {
        previewUrl = tracks[Math.floor(Math.random() * tracks.length)].previewUrl;
        cache.set(cacheKey, previewUrl);
      }
    } catch (err) {
      console.error("iTunes fetch failed:", err);
      return;
    }
  }

  if (previewUrl) {
    try {
      audioPlayer.pause();
      audioPlayer.src = previewUrl;
      await audioPlayer.play();
    } catch (err) {
      console.warn("Audio play error:", err);
    }
  }
}

// Optimized event listeners
let lastInteractionTime = Date.now();
const INACTIVITY_TIMEOUT = 10000; // 10 seconds

function handleUserInteraction() {
  lastInteractionTime = Date.now();
  if (simulation.alpha() < 0.1) {
    simulation.alpha(0.3).restart();
  }
}

svg.on("mousemove touchstart", handleUserInteraction);

setInterval(() => {
  if (Date.now() - lastInteractionTime > INACTIVITY_TIMEOUT) {
    simulation.stop();
  }
}, 1000);

// Cleanup on page hide
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audioPlayer.pause();
    simulation.stop();
  }
});