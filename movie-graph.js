<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Movie Hub</title>
  <script src="https://d3js.org/d3.v6.min.js"></script>
  <style>
    body { margin: 0; background-color: #111; color: #fff; font-family: sans-serif; }
    #search-container { position: absolute; top: 20px; left: 20px; z-index: 10; }
    #movie-viz { display: block; }
    input { padding: 8px; font-size: 16px; border-radius: 4px; border: none; }
  </style>
</head>
<body>
  <div id="search-container">
    <input type="text" id="search" placeholder="Search for a movie..." />
  </div>
  <svg id="movie-viz"></svg>

  <script>
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

    // API Keys și URL-uri
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

    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-550))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(35))
      .on("tick", ticked);

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
        const res = await fetch(`${omdbApiUrl}?apikey=${omdbApiKey}&s=${encodeURIComponent(searchTerm)}&type=movie`);
        const data = await res.json();
        if (data.Search) {
          data.Search.forEach((movie, i) => {
            const node = {
              id: movie.imdbID,
              title: movie.Title,
              poster: movie.Poster !== "N/A" ? movie.Poster : null,
              x: Math.random() * width,
              y: Math.random() * height
            };
            nodeData.push(node);
            if (i > 0) {
              linkData.push({ source: nodeData[0].id, target: node.id });
            }
          });

          simulation.nodes(nodeData);
          simulation.force("link").links(linkData);
          simulation.alpha(1).restart();

          updateGraph();
        }
      } catch (err) {
        console.error("Eroare la căutare:", err);
      }
    }

    function updateGraph() {
      link = container.selectAll("line.link").data(linkData, d => `${d.source.id}-${d.target.id}`);
      link.exit().remove();
      link = link.enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#888")
        .attr("stroke-width", 1.5)
        .merge(link);

      nodeGroup = container.selectAll("g.node").data(nodeData, d => d.id);
      nodeGroup.exit().remove();

      const nodeEnter = nodeGroup.enter()
        .append("g")
        .attr("class", "node")
        .call(d3.drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded))
        .on("click", function(event, d) {
          rippleEffect(d3.select(this));
        });

      nodeEnter.append("circle")
        .attr("r", 30)
        .attr("fill", "#222");

      nodeEnter.append("text")
        .attr("dy", 4)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "12px")
        .text(d => d.title);

      nodeGroup = nodeEnter.merge(nodeGroup);
    }

    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Căutare film la Enter
    document.getElementById("search").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const term = e.target.value.trim();
        if (term) handleMovieSearch(term);
      }
    });
  </script>
</body>
</html>