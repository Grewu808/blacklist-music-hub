<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Movie Hub</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      background-color: #111;
      color: #fff;
      font-family: sans-serif;
    }
    #search-container {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 10;
    }
    #movie-viz {
      display: block;
    }
    input {
      padding: 8px;
      font-size: 16px;
      border-radius: 4px;
      border: none;
      width: 250px;
    }
    .node circle {
      fill: #444;
      stroke: #fff;
      stroke-width: 2px;
    }
    .node text {
      fill: #fff;
      font-size: 10px;
      text-anchor: middle;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="search-container">
    <input type="text" id="search" placeholder="Search for a movie..." />
  </div>
  <svg id="movie-viz" width="100%" height="100%"></svg>

  <script>
    const omdbApiKey = 'b5ff2cd6';
    const omdbApiUrl = 'https://www.omdbapi.com/';

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#movie-viz").attr("width", width).attr("height", height);
    const container = svg.append("g").attr("class", "zoom-container");

    svg.append("defs").append("clipPath")
      .attr("id", "clip-circle")
      .append("circle")
      .attr("r", 28)
      .attr("cx", 0)
      .attr("cy", 0);

    let nodeData = [];
    let linkData = [];

    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40))
      .on("tick", ticked);

    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
    svg.call(zoom);

    let link = container.selectAll("line.link");
    let nodeGroup = container.selectAll("g.node");

    async function handleMovieSearch(searchTerm) {
      nodeData = [];
      linkData = [];
      simulation.stop();
      container.selectAll("*").remove();

      try {
        const res = await fetch(`${omdbApiUrl}?s=${encodeURIComponent(searchTerm)}&apikey=${omdbApiKey}`);
        const data = await res.json();

        if (data.Response === "True") {
          const movies = data.Search;

          nodeData = movies.map((movie, i) => ({
            id: movie.imdbID,
            title: movie.Title,
            year: movie.Year,
            x: width / 2 + Math.cos(i * 0.5) * 200,
            y: height / 2 + Math.sin(i * 0.5) * 200
          }));

          linkData = nodeData.slice(1).map(d => ({
            source: nodeData[0].id,
            target: d.id
          }));

          updateGraph();
        } else {
          alert("No results found.");
        }
      } catch (error) {
        console.error("OMDB fetch error:", error);
      }
    }

    function updateGraph() {
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      simulation.alpha(1).restart();

      link = container.selectAll("line.link")
        .data(linkData, d => `${d.source}-${d.target}`)
        .join("line")
        .attr("class", "link")
        .attr("stroke", "#666")
        .attr("stroke-width", 1.5);

      nodeGroup = container.selectAll("g.node")
        .data(nodeData, d => d.id)
        .join(enter => {
          const g = enter.append("g")
            .attr("class", "node")
            .call(drag(simulation));

          g.append("circle")
            .attr("r", 28);

          g.append("text")
            .attr("dy", 4)
            .text(d => d.title.slice(0, 12));

          return g;
        });
    }

    function drag(simulation) {
      return d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });
    }

    document.getElementById("search").addEventListener("keypress", e => {
      if (e.key === "Enter") {
        const query = e.target.value.trim();
        if (query) handleMovieSearch(query);
      }
    });
  </script>
</body>
</html>