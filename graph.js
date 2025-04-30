// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat v10 - Mișcare + Coliziune Ajustată) ------------
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

// --- ADAUGAM UN GRUP CONTAINER PENTRU ZOOM/PAN ---
const container = svg.append("g").attr("class", "zoom-container");

// --- ADAUGAM DEFINITIA PENTRU CLIPPATH CIRCULAR ---
const clipPathRadius = 16; // Raza pentru artwork/clip-path
svg.append("defs").append("clipPath")
    .attr("id", "clip-circle") // ID unic pentru clipPath
  .append("circle")
    .attr("r", clipPathRadius);
console.log("ClipPath 'clip-circle' definit.");

// Variabile globale pentru date și simulare
let nodeData = [];
let linkData = [];
let simulation;
let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// --- Inițializare Simulare (forțe ajustate) ---
simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id)) // Distanța link
  .force("charge", d3.forceManyBody().strength(-550)) // <<< AJUSTATA Respingerea (-450 -> -550)
  .force("center", d3.forceCenter(width / 2, height / 2)) // Centrare
  .force("collide", d3.forceCollide().radius(35)) // <<< AJUSTATA Coliziunea (30 -> 35)
  .on("tick", ticked);
console.log("Simulare inițializată cu forțe ajustate.");

// --- Inițializare Comportament Zoom ---
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", zoomed);

function zoomed(event) {
    container.attr("transform", event.transform);
}
svg.call(zoom);
console.log("Comportament Pan & Zoom atașat la SVG.");

// --- Referințe la elementele HTML de căutare ---
const searchInput = document.getElementById('artist-search-input');
const searchButton = document.getElementById('artist-search-button');

// --- Atașare Event Listeners pentru Căutare ---
if (searchButton && searchInput) {
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleSearch();
      }
  });
  console.log("Event listeners pentru căutare atașați.");
} else {
  console.error("Elementele HTML pentru căutare (input sau buton) nu au fost găsite!");
}

// --- Funcția care gestionează căutarea ---
function handleSearch() {
  const artistName = searchInput.value.trim();
  console.log(`Se caută artistul: "${artistName}"`);

  if (!artistName) {
    console.log("Câmpul de căutare este gol.");
    alert("Te rog introdu un nume de artist.");
    return;
  }

  nodeData = [];
  linkData = [];
  if(simulation) simulation.stop();

  container.selectAll("line.link").remove();
  container.selectAll("g.node").remove();
  link = container.selectAll("line.link");
  nodeGroup = container.selectAll("g.node");
  console.log("Graficul vechi a fost șters.");

  const newNode = {
    id: artistName,
    x: width / 2 + (Math.random() - 0.5) * 5,
    y: height / 2 + (Math.random() - 0.5) * 5,
    imageUrl: null
  };
  nodeData.push(newNode);
  console.log("Nod inițial adăugat pentru:", artistName);

  svg.call(zoom.transform, d3.zoomIdentity);
  console.log("Zoom/Pan resetat.");

  renderGraph();
}


// --- Funcțiile D3 existente (ticked, renderGraph, expandNode, drag) ---

function ticked() {
  if (link) {
     link
       .attr("x1", d => d.source.x)
       .attr("y1", d => d.source.y)
       .attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
  }
  if (nodeGroup) {
     nodeGroup
       .attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

// Funcția care (re)desenează graficul
function renderGraph() {
  if (!svg || !container) {
      console.error("Elementul SVG #viz sau containerul nu a fost găsit!");
      return;
  }
  console.log(`RenderGraph: Noduri=${nodeData.length}, Legături=${linkData.length}`);

  // Links
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join("line")
    .attr("class", "link")
    .attr("stroke-width", 1)
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4);

  // Nodes
  nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g")
          .attr("class", "node");

        g.on("click", (event, d) => {
            event.stopPropagation();
            expandNode(event, d);
          });

        // Cercul exterior (contur) - r=28
        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 28)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        // Imaginea
        g.append("image")
          .attr("xlink:href", d => d.imageUrl || "")
          .style("display", d => d.imageUrl ? null : "none")
          .attr("width", clipPathRadius * 2)
          .attr("height", clipPathRadius * 2)
          .attr("x", -clipPathRadius)
          .attr("y", -clipPathRadius)
          .attr("clip-path", "url(#clip-circle)");

        g.append("title").text(d => d.id); // Tooltip

        g.append("text")
          .attr("dy", "-1.8em") // Poziția textului
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#cccccc")
          .text(d => d.id);

        if (simulation) {
            g.call(drag(simulation));
        } else {
            console.warn("Simularea nu gata la crearea nodului, drag nu a fost atașat:", d.id);
        }

        console.log("Nod nou (grup) creat în DOM.");
        g.attr("transform", d => `translate(${d.x},${d.y})`);
        return g;
      },
      update => {
          update.select("title").text(d => d.id);
          update.select("text").text(d => d.id);
          update.select("image")
                .attr("xlink:href", d => d.imageUrl || "")
                .style("display", d => d.imageUrl ? null : "none");
          return update;
      },
      exit => {
          // console.log("Nod eliminat din DOM:", d.id); // Comentat
          exit.transition().duration(300).attr("opacity", 0).remove();
      }
    );

  // Actualizăm simularea
  if (simulation) {
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      if (simulation.alpha() < 0.1) {
          simulation.alpha(0.3).restart(); // Reactivăm simularea dacă s-a oprit
          console.log("Simulare reactivată.");
      } else {
           console.log("Simulare actualizată (noduri/legături).");
      }
  } else {
      console.error("Eroare critică: Simularea nu este definită în renderGraph!");
  }
}


// --- FUNCȚIA expandNode (cu mișcare reactivată și alpha mic) ---
function expandNode(event, clickedNode) {
  console.log("Se extinde nodul:", clickedNode.id);

  const apiKey = 'fe14d9e2ae87da47a1642aab12b6f52b'; // <<<<<<<<<<<<<< PUNE CHEIA TA !!!

  const artistName = clickedNode.id;
  if (!artistName) return;

  const clickedNodeElement = d3.select(event.currentTarget);
  clickedNodeElement.select("image").style("opacity", 0.5); // Indicăm loading

  const limit = 5;
  const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&limit=${limit}&format=json`;

  console.log("Se apelează API-ul Last.fm:", apiUrl);

  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        return response.json().catch(() => null).then(errorBody => {
             const errorMessage = errorBody?.message || `HTTP error! status: ${response.status}`;
             console.error("Eroare de la API Last.fm:", errorMessage, errorBody);
             throw new Error(errorMessage);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("Date primite de la Last.fm (similar artists):", data);

      clickedNodeElement.select("image").style("opacity", 1); // Resetăm opacitatea

      if (data.error) {
          console.error("Eroare returnată de API Last.fm în JSON:", data.message || data.error);
          clickedNodeElement.select("title").text(`Error: ${data.message || data.error}`);
          clickedNodeElement.select(".outer-circle").style("stroke", "red");
          return;
      } else {
           clickedNodeElement.select(".outer-circle").style("stroke", "#aaa"); // Resetăm conturul
      }

      if (data.similarartists && data.similarartists.artist && Array.isArray(data.similarartists.artist)) {
        const similarArtists = data.similarartists.artist.filter(artist => artist.name !== artistName);

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști *similari* noi.");
            clickedNodeElement.select("title").text(`${artistName} (No new similar artists found)`);
            return;
        }

        const existing = new Set(nodeData.map(n => n.id));
        let count = 0;

        const cx = clickedNode.x ?? width / 2;
        const cy = clickedNode.y ?? height / 2;
        const radius = 100;

        similarArtists.forEach((artist, index) => {
          const newId = artist.name;
          if (!existing.has(newId)) {
            let imageUrl = null;
            if (artist.image && Array.isArray(artist.image)) {
                const sizes = ['extralarge', 'large', 'medium', 'small'];
                for (const size of sizes) {
                    const imgObj = artist.image.find(img => img.size === size);
                    if (imgObj && imgObj['#text']) {
                        imageUrl = imgObj['#text'];
                        break;
                    }
                }
            }
            if (!imageUrl) console.warn(`URL imagine lipsă pentru: ${newId}`);

            const angle = (2 * Math.PI / similarArtists.length) * index;
            const newNode = {
              id: newId,
              imageUrl: imageUrl,
              x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
              y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
              // Nu mai setăm fx/fy aici, lăsăm simularea să le așeze
            };
            nodeData.push(newNode);
            linkData.push({ source: clickedNode.id, target: newId });
            count++;
            console.log("Adăugat nod nou:", newId);
            existing.add(newId);
          } else {
            console.log("Nodul exista deja:", newId);
            const linkExists = linkData.some(l =>
               (typeof l.source === 'object' ? l.source.id === clickedNode.id : l.source === clickedNode.id) && (typeof l.target === 'object' ? l.target.id === newId : l.target === newId) ||
               (typeof l.source === 'object' ? l.source.id === newId : l.source === newId) && (typeof l.target === 'object' ? l.target.id === clickedNode.id : l.target === clickedNode.id)
            );
            if (!linkExists) {
                linkData.push({ source: clickedNode.id, target: newId });
                console.log("Adăugat legătură nouă către nod existent:", newId);
                 count++;
            }
          }
        });

        // --- REACTIVAT ELIBERAREA NODULUI PĂRINTE ---
        // Eliberăm nodul părinte din poziția fixă (dacă era fixat de drag)
        // pentru a permite simulării să îl reașeze cu noii vecini
        delete clickedNode.fx;
        delete clickedNode.fy;
        console.log("Nod părinte eliberat (fx/fy șterse).");
        // --- SFÂRȘIT REACTIVARE ---


        if (count > 0) {
          console.log("Redesenare grafic și repornire simulare (cu alpha mic)...");
          renderGraph();
          // Repornim simularea cu un impuls mic pentru a integra noile noduri lin
          if(simulation) simulation.alpha(0.1).restart(); // <<< AJUSTATA Repornirea (era 0.3 sau 0.5)
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
        }

      } else {
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        clickedNodeElement.select("title").text(`${artistName} (Invalid API response)`);
        clickedNodeElement.select(".outer-circle").style("stroke", "orange");
      }
    })
    .catch(error => {
      console.error('A apărut o eroare în lanțul fetch:', error);
      clickedNodeElement.select("title").text(`${artistName} (Error: ${error.message})`);
      clickedNodeElement.select(".outer-circle").style("stroke", "red");
    })
    .finally(() => {
        console.log("Apelul API finalizat pentru:", artistName);
        const nodeElement = d3.select(event.currentTarget);
        setTimeout(() => {
            const currentStroke = nodeElement.select(".outer-circle").style("stroke");
            nodeElement.select("image").style("opacity", 1); // Resetăm opacitatea oricum
            if (currentStroke !== 'red' && currentStroke !== 'orange') {
                 nodeElement.select(".outer-circle").style("stroke", "#aaa");
            }
        }, 1000);
    });
}
// --- SFÂRȘIT FUNCȚIE expandNode ---


// Funcția pentru drag & drop
function drag(simulation) {
  if (!simulation) {
      console.warn("Încercare de a atașa drag cu o simulare invalidă.");
      return () => {};
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    svg.on(".zoom", null);
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // Lăsăm nodul fixat implicit după drag, DAR va fi eliberat la expandare acum
    svg.call(zoom); // Reactivăm zoom-ul
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat v10 - Mișcare + Coliziune Ajustată) ------------
