
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

let nodeData, linkData;
let simulation, link, nodeGroup;

d3.json("data.json").then(data => {
  nodeData = [...data.nodes];
  linkData = [...data.links];

  simulation = d3.forceSimulation(nodeData)
    .force("link", d3.forceLink(linkData).distance(150).id(d => d.id))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  link = svg.append("g")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("stroke-width", 1);

  nodeGroup = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("g")
    .data(nodeData, d => d.id)
    .join(enter => {
      const g = enter.append("g")
        .call(drag(simulation))
        .on("click", (event, d) => {
          event.stopPropagation();
          expandNode(d);
        });

      g.append("circle")
        .attr("r", 24)
        .attr("fill", "transparent");

      g.append("circle")
        .attr("r", 14)
        .attr("fill", "white");

      g.append("title").text(d => d.id);

      return g;
    });

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeGroup
      .attr("transform", d => `translate(${d.x},${d.y})`);
  });
});

function expandNode(clickedNode) {
  const existing = new Set(nodeData.map(n => n.id));
  let count = 0;

  for (let i = 1; i <= 3; i++) {
    const newId = clickedNode.id + " +" + i;
    if (!existing.has(newId)) {
      // Pozitionare in cerc in jurul nodului initial
      const angle = (2 * Math.PI / 3) * (i - 1);
      const radius = 80;
      const newNode = {
        id: newId,
        x: clickedNode.x + radius * Math.cos(angle),
        y: clickedNode.y + radius * Math.sin(angle)
      };
      nodeData.push(newNode);
      linkData.push({ source: clickedNode.id, target: newId });
      count++;
    }
  }

  if (count > 0) {
    updateGraph();
  }
}

function updateGraph() {
  simulation.nodes(nodeData);
  simulation.force("link").links(linkData);

  link = svg.select("g")
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("stroke-width", 1);

  nodeGroup = svg.selectAll("g")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g")
          .call(drag(simulation))
          .on("click", (event, d) => {
            event.stopPropagation();
            expandNode(d);
          });

        g.append("circle")
          .attr("r", 24)
          .attr("fill", "transparent");

        g.append("circle")
          .attr("r", 14)
          .attr("fill", "white");

        g.append("title").text(d => d.id);

        return g;
      }
    );

  simulation.alpha(1).restart();
}

function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}
