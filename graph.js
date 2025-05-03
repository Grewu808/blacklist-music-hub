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

function ticked() {
  container.selectAll("line.link")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  container.selectAll("g.node")
    .attr("transform", d => `translate(${d.x},${d.y})`);
}

function renderGraph() {
  container.selectAll("line.link")
    .data(linkData)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#555")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.4);

  const nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(enter => {
      const g = enter.append("g").attr("class", "node");

      g.append("circle")
        .attr("class", "outer-circle")
        .attr("r", 28)
        .attr("fill", "transparent")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1);

      g.append("text")
        .text(d => d.id)
        .attr("text-anchor", "middle")
        .attr("dy", 42)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#ffffff");

      return g;
    });

  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);
  simulation.alpha(0.3).restart();
}

function handleSearch() {
  const artistName = "Test Artist";
  nodeData = [];
  linkData = [];
  container.selectAll("*").remove();

  nodeData.push({
    id: artistName,
    x: width / 2,
    y: height / 2
  });

  renderGraph();
}