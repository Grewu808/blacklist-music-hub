// ------------ graph.js (Hybrid Last.fm + Spotify) - Full Upgrade v2 (No Duplicates, Fix Main Image) ------------

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
    console.error("Failed to fetch image for", artistName);
  }
  return 'default.jpg';
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

// ... rest of the code stays the same

