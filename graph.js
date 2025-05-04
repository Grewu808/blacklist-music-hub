// Ripple effect (păstrăm aceeași implementare)
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

// Actualizăm credentialele Spotify (folosim direct API-ul temporar)
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
    
    if (!res.ok) throw new Error('Token request failed');
    
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
    if (!token) return "default.jpg";

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Artist search failed');
    
    const data = await res.json();
    return data?.artists?.items?.[0]?.images?.[0]?.url || "default.jpg";
  } catch (error) {
    console.error('Error fetching artist image:', error);
    return "default.jpg";
  }
}

// Restul inițializării rămâne la fel până la handleSearch

async function handleSearch() {
  const artistName = document.getElementById("artist-search-input").value.trim();
  if (!artistName) {
    showStatus("Introdu un nume de artist", "error");
    return;
  }

  showStatus("Căutăm artistul...", "loading");
  
  try {
    // Resetăm graficul existent
    nodeData = [];
    linkData = [];
    simulation.stop();
    container.selectAll("*").remove();

    // Obținem imaginea artistului
    const imageUrl = await fetchArtistImage(artistName);
    
    if (imageUrl === "default.jpg") {
      throw new Error("Artist not found on Spotify");
    }

    // Adăugăm artistul principal
    nodeData.push({
      id: artistName,
      x: width / 2,
      y: height / 2,
      imageUrl: imageUrl
    });

    // Resetăm zoom-ul
    svg.call(zoom.transform, d3.zoomIdentity);

    // Redesenăm graficul
    renderGraph();
    simulation.nodes(nodeData);
    simulation.force("link").links(linkData);
    simulation.alpha(0.3).restart();

    showStatus("Artist găsit! Click pe nod pentru artiști similari", "success");
    
    // Returnăm succes pentru debug
    return { success: true, artistName, imageUrl };
    
  } catch (error) {
    console.error("Search error:", error);
    showStatus("Artistul nu a fost găsit. Încearcă alt nume", "error");
    return { success: false, error: error.message };
  }
}

// Funcție auxiliară pentru afișarea statusului
function showStatus(message, type) {
  const statusEl = document.getElementById("search-status");
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.style.color = type === "error" ? "#ff4444" : 
                        type === "loading" ? "#ffffff" : "#00cc66";
}

// Restul codului rămâne neschimbat...