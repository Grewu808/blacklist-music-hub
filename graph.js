const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

let nodes = [];
let links = [];

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .on("tick", ticked);

const linkGroup = svg.append("g")
  .attr("stroke", "#999")
  .attr("stroke-opacity", 0.6)
  .selectAll("line");

const nodeGroup = svg.append("g")
  .attr("stroke", "#fff")
  .attr("stroke-width", 1.5)
  .selectAll("g");

// ================================
// Funcție pentru legături bidirecționale
function addBidirectionalLink(source, target) {
  const alreadyExists = links.some(link =>
    (link.source === source && link.target === target) ||
    (link.source === target && link.target === source)
  );

  if (!alreadyExists) {
    links.push({ source, target });
  }
}
// ================================

function ticked() {
  linkGroup
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

function updateGraph() {
  const link = linkGroup.data(links);
  link.exit().remove();
  link.enter().append("line");

  const node = nodeGroup.data(nodes, d => d.id);
  const nodeEnter = node.enter().append("g");

  nodeEnter.append("circle")
    .attr("r", 30)
    .attr("fill", "url(#artist-image)");

  nodeEnter.append("clipPath")
    .attr("id", d => `clip-${d.id}`)
    .append("circle")
    .attr("r", 30);

  nodeEnter.append("image")
    .attr("xlink:href", d => d.image)
    .attr("x", -30)
    .attr("y", -30)
    .attr("width", 60)
    .attr("height", 60)
    .attr("clip-path", d => `url(#clip-${d.id})`);

  nodeEnter.append("text")
    .text(d => d.id)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff");

  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();
}

async function fetchSimilarArtists(artistName) {
  const lastfmApiKey = 'fe14d9e2ae87da47a1642aab12b6f52b';
  const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${lastfmApiKey}&format=json&limit=5`;

  const lastfmResponse = await fetch(lastfmUrl);
  const lastfmData = await lastfmResponse.json();

  if (!lastfmData.similarartists) return [];

  const similarArtists = lastfmData.similarartists.artist.map(artist => ({
    name: artist.name,
    image: artist.image?.[2]?.['#text'] || ""
  }));

  return similarArtists;
}

async function searchArtist(artistName) {
  if (!nodes.some(n => n.id === artistName)) {
    nodes.push({ id: artistName, image: "" });
  }

  const similarArtists = await fetchSimilarArtists(artistName);

  similarArtists.forEach(similar => {
    const similarName = similar.name;

    if (!nodes.some(n => n.id === similarName)) {
      nodes.push({ id: similarName, image: similar.image });
    }

    addBidirectionalLink(artistName, similarName); // patch aplicat aici
  });

  updateGraph();
}

document.getElementById("search-button").addEventListener("click", () => {
  const artistName = document.getElementById("artist-input").value.trim();
  if (artistName) {
    searchArtist(artistName);
  }
});