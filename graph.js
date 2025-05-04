// Ripple effect (păstrăm intact)
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

// Credențiale Spotify (verificate)
const spotifyClientId = '38d179166ca140e498c596340451c1b5';
const spotifyClientSecret = '8bf8f530ca544c0dae7df204d2531bf1';
const lastFmApiKey = 'fe14d9e2ae87da47a1642aab12b6f52b';

let spotifyAccessToken = null;
let spotifyTokenExpiryTime = 0;

async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiryTime) return spotifyAccessToken;
  
  try {
    const base64 = btoa(`${spotifyClientId}:${spotifyClientSecret}`);
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    spotifyAccessToken = data.access_token;
    spotifyTokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyAccessToken;
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return null;
  }
}

async function fetchArtistImage(artistName) {
  try {
    const token = await getSpotifyAccessToken();
    if (!token) {
      console.warn('No Spotify token available');
      return "default.jpg";
    }

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    return data?.artists?.items?.[0]?.images?.[0]?.url || "default.jpg";
  } catch (error) {
    console.error('Error fetching artist image:', error);
    return "default.jpg";
  }
}

// Dimensiuni canvas
const width = window.innerWidth;
const height = window.innerHeight;

// Inițializare SVG
const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#000");

const container = svg.append("g").attr("class", "zoom-container");

// Clip path pentru imagini rotunde
svg.append("defs").append("clipPath")
  .attr("id", "clip-circle")
  .append("circle")
  .attr("r", 28);

// Date și simulare
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

// Elemente grafice
let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// Evenimente căutare
document.getElementById("artist-search-button").addEventListener("click", handleSearch);
document.getElementById("artist-search-input").addEventListener("keypress", e => {
  if (e.key === 'Enter') handleSearch();
});

// Funcția principală de căutare (REVIZUITĂ)
async function handleSearch() {
  const artistName = document.getElementById("artist-search-input").value.trim();
  if (!artistName) {
    alert("Te rog introdu un nume de artist");
    return;
  }

  console.log(`Încep căutarea pentru: ${artistName}`);
  
  try {
    // Resetare stare anterioară
    nodeData = [];
    linkData = [];
    simulation.stop();
    container.selectAll("*").remove();

    // Obține imaginea artistului
    console.log("Caut imaginea artistului pe Spotify...");
    const imageUrl = await fetchArtistImage(artistName);
    
    if (imageUrl === "default.jpg") {
      throw new Error("Nu am găsit imagine pentru acest artist");
    }

    console.log(`Am găsit imagine pentru ${artistName}: ${imageUrl}`);
    
    // Adaugă artistul principal
    nodeData.push({
      id: artistName,
      x: width / 2,
      y: height / 2,
      imageUrl: imageUrl
    });

    // Resetare zoom
    svg.call(zoom.transform, d3.zoomIdentity);

    // Redesenare
    renderGraph();
    simulation.nodes(nodeData);
    simulation.force("link").links(linkData);
    simulation.alpha(0.3).restart();

    console.log("Căutare finalizată cu succes!");
    
  } catch (error) {
    console.error("Eroare la căutare:", error);
    alert(`Eroare: ${error.message}`);
  }
}

// Funcțiile auxiliare rămân neschimbate (ticked, adjustEdge, renderGraph, expandNode, playArtistPreview)

// Rămânând la implementarea originală pentru:
// - ticked()
// - adjustEdge()
// - renderGraph()
// - expandNode()
// - playArtistPreview()