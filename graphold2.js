
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

let nodeData, linkData;

d3.json("data.json").then(data => {
  nodeData = [...data.nodes];
  linkData = [...data.links];
  renderGraph();

  function renderGraph() {
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).distance(150).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(linkData)
      .join("line")
        .attr("stroke-width", 1);

    const nodeGroup = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(nodeData)
      .join("g")
      .call(drag(simulation))
      .on("click", (event, d) => {
        event.stopPropagation(); // prevenim propagarea clickului
        expandNode(d);
      });

    nodeGroup.append("circle")
        .attr("r", 24)
        .attr("fill", "transparent");

    nodeGroup.append("circle")
        .attr("r", 14)
        .attr("fill", "white");

    nodeGroup.append("title")
        .text(d => d.id);

    simulation.on("tick", () => {
      link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
      nodeGroup
          .attr("transform", d => `translate(${d.x},${d.y})`);
    });

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
  }

  function expandNode(clickedNode) {
    const existing = new Set(nodeData.map(n => n.id));
    let count = 0;

    for (let i = 1; i <= 3; i++) {
      const newId = clickedNode.id + " +" + i;
      if (!existing.has(newId)) {
        const newNode = { id: newId };
        nodeData.push(newNode);
        linkData.push({ source: clickedNode.id, target: newId });
        count++;
      }
    }

    if (count > 0) {
      renderGraph();
    }
  }
});
