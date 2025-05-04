import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const API_KEY = "fe14d9e2ae87da47a1642aab12b6f52b";

async function fetchSimilarArtists(artistName) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json&limit=5`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.similarartists?.artist?.map(a => a.name) || [];
}

async function fetchArtistImage(artistName) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${API_KEY}&format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const images = data?.artist?.image || [];
  const largeImage = images.find(img => img.size === "large");
  return largeImage?.["#text"] || "";
}

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(180))
  .force("charge", d3.forceManyBody().strength(-520))
  .force("center", d3.forceCenter(width / 2, height / 2));

let nodes = [];
let links = [];

const nodeById = new Map();
const linkById = new Map();

function addNode(node) {
  if (!nodeById.has(node.id)) {
    nodeById.set(node.id, node);
    nodes.push(node);
  }
}

function addLink(source, target) {
  const linkId = `${source.id}-${target.id}`;
  if (!linkById.has(linkId)) {
    const link = { source: source.id, target: target.id };
    linkById.set(linkId, link);
    links.push(link);
  }
}

function updateGraph() {
  const link = svg.selectAll(".link")
    .data(links, d => `${d.source}-${d.target}`);

  link.enter()
    .append("line")
    .attr("class", "link")
    .attr("stroke", "#aaa");

  const node = svg.selectAll(".node")
    .data(nodes, d => d.id);

  const nodeEnter = node.enter()
    .append("g")
    .attr("class", "node")
    .on("click", handleClick);

  nodeEnter.append("circle")
    .attr("r", 22)
    .attr("fill", "#222");

  nodeEnter.append("image")
    .attr("xlink:href", d => d.image || "")
    .attr("x", -20)
    .attr("y", -20)
    .attr("width", 40)
    .attr("height", 40);

  nodeEnter.append("text")
    .text(d => d.id)
    .attr("dy", 35)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff")
    .attr("font-size", "12px");

  simulation
    .nodes(nodes)
    .on("tick", () => {
      svg.selectAll(".link")
        .attr("x1", d => nodeById.get(d.source).x)
        .attr("y1", d => nodeById.get(d.source).y)
        .attr("x2", d => nodeById.get(d.target).x)
        .attr("y2", d => nodeById.get(d.target).y);

      svg.selectAll(".node")
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

  simulation.force("link").links(links);
  simulation.alpha(1).restart();
}

async function handleClick(event, d) {
  const similar = await fetchSimilarArtists(d.id);
  for (const artist of similar) {
    const image = await fetchArtistImage(artist);
    const newNode = { id: artist, image };
    addNode(newNode);
    addLink(d, newNode);
  }
  updateGraph();
}

(async function start() {
  const name = "Nas";
  const image = await fetchArtistImage(name);
  const root = { id: name, image };
  addNode(root);

  const similar = await fetchSimilarArtists(name);
  for (const artist of similar) {
    const image = await fetchArtistImage(artist);
    const node = { id: artist, image };
    addNode(node);
    addLink(root, node);
  }

  updateGraph();
})();