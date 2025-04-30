// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat v7 - Bule mărite) ------------
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

// --- ADAUGAM UN GRUP CONTAINER PENTRU ZOOM/PAN ---
const container = svg.append("g").attr("class", "zoom-container");

// Variabile globale pentru date și simulare
let nodeData = []; // Pornește gol
let linkData = []; // Pornește gol
let simulation; // Va fi inițializată mai jos
// Selectăm elementele în interiorul containerului acum
let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// --- Inițializare Simulare ---
simulation = d3.forceSimulation(nodeData) // Inițializăm cu date goale
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id)) // Mărit puțin distanța default
  .force("charge", d3.forceManyBody().strength(-450)) // Mărit puțin forța de respingere
  .force("center", d3.forceCenter(width / 2, height / 2))
  .on("tick", ticked); // Apelăm funcția ticked la fiecare pas al simulării

// --- Inițializare Comportament Zoom ---
const zoom = d3.zoom()
    .scaleExtent([0.1, 4]) // Limite pentru zoom (opțional)
    .on("zoom", zoomed); // Funcția care se apelează la zoom/pan

// Funcția care aplică transformarea de zoom/pan
function zoomed(event) {
    container.attr("transform", event.transform);
}

// Aplicăm comportamentul de zoom pe elementul SVG principal
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
  console.error("Elementele HTML pentru căutare (input sau buton) nu au fost găsite! Verifică ID-urile în map.html.");
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
    // fx: width / 2, // Nu îl mai fixăm
    // fy: height / 2
  };
  nodeData.push(newNode);
  console.log("Nod inițial adăugat pentru:", artistName);

  // Resetăm zoom-ul/pan-ul la starea inițială
  svg.call(zoom.transform, d3.zoomIdentity);
  console.log("Zoom/Pan resetat.");

  renderGraph();
}


// --- Funcțiile D3 existente (ticked, renderGraph, expandNode, drag) ---

// Funcția care actualizează pozițiile la fiecare pas al simulării
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

        // Cercul exterior (contur) - MĂRIT
        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 28) // <<<<<<<<<<< MĂRIT (era 24)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        // Cercul interior (alb) - MĂRIT
        g.append("circle")
          .attr("class", "inner-circle")
          .attr("r", 16) // <<<<<<<<<<< MĂRIT (era 14)
          .attr("fill", "white");

        g.append("title").text(d => d.id); // Tooltip

        // Textul nodului
        g.append("text")
          .attr("dy", "-1.8em") // Ajustat puțin poziția verticală pentru raza mai mare
          .attr("text-anchor", "middle")
          .style("font-size", "10px") // Poate vrei font mai mare acum?
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
          // Actualizăm și razele dacă nodul există deja? Momentan nu.
          return update;
      },
      exit => {
          // console.log("Nod eliminat din DOM:", d.id);
          exit.transition().duration(300).attr("opacity", 0).remove();
      }
    );

  // Actualizăm simularea
  if (simulation) {
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      if (simulation.alpha() < 0.1) {
          simulation.alpha(0.3).restart();
          console.log("Simulare reactivată.");
      } else {
           console.log("Simulare actualizată (noduri/legături).");
      }
  } else {
      console.error("Eroare critică: Simularea nu este definită în renderGraph!");
  }
}


// --- FUNCȚIA expandNode MODIFICATĂ CU API CALL ---
function expandNode(event, clickedNode) {
  console.log("Se extinde nodul:", clickedNode.id);

  // !!!!! IMPORTANT !!!!! Înlocuiește 'YOUR_API_KEY' cu cheia ta API reală de la Last.fm
  const apiKey = 'fe14d9e2ae87da47a1642aab12b6f52b'; // <<<<<<<<<<<<<< AICI PUI CHEIA TA REALĂ !!!
  // !!!!!!!!!!!!!!!!!!!!!

  const artistName = clickedNode.id;

  if (!artistName) {
      console.error("Numele artistului este invalid:", artistName);
      return;
  }

  const clickedNodeElement = d3.select(event.currentTarget);
  clickedNodeElement.select(".inner-circle").style("fill", "#f0f0f0");

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

      if (data.error) {
          console.error("Eroare returnată de API Last.fm în JSON:", data.message || data.error);
          clickedNodeElement.select("title").text(`Error: ${data.message || data.error}`);
          clickedNodeElement.select(".inner-circle").style("fill", "red");
          return;
      }

       clickedNodeElement.select(".inner-circle").style("fill", "white");

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
        const radius = 100; // Mărit puțin raza de apariție a nodurilor noi

        similarArtists.forEach((artist, index) => {
          const newId = artist.name;
          if (!existing.has(newId)) {
            const angle = (2 * Math.PI / similarArtists.length) * index;
            const newNode = {
              id: newId,
              x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
              y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
              fx: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
              fy: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20
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

        delete clickedNode.fx;
        delete clickedNode.fy;

        if (count > 0) {
          console.log("Redesenare grafic și repornire simulare...");
          renderGraph();
          if(simulation) simulation.alpha(0.5).restart();
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
           clickedNodeElement.select(".inner-circle").style("fill", "white");
        }

      } else {
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        clickedNodeElement.select("title").text(`${artistName} (Invalid API response)`);
        clickedNodeElement.select(".inner-circle").style("fill", "orange");
      }
    })
    .catch(error => {
      console.error('A apărut o eroare în lanțul fetch:', error);
      clickedNodeElement.select("title").text(`${artistName} (Error: ${error.message})`);
      clickedNodeElement.select(".inner-circle").style("fill", "red");
    })
    .finally(() => {
        console.log("Apelul API finalizat pentru:", artistName);
        //const nodeElement = d3.select(event.currentTarget); // Already have clickedNodeElement
        setTimeout(() => {
            const currentFill = clickedNodeElement.select(".inner-circle").style("fill");
            if (currentFill === 'rgb(240, 240, 240)') {
                 clickedNodeElement.select(".inner-circle").style("fill", "white");
            }
        }, 1500);
    });
}
// --- SFÂRȘIT FUNCȚIE expandNode MODIFICATĂ ---


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
    svg.on(".zoom", null); // Dezactivăm zoom/pan în timpul drag-ului nodului
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // Lăsăm nodul fixat implicit
    // d.fx = null;
    // d.fy = null;
    // Reactivăm zoom-ul după ce terminăm drag-ul nodului
    svg.call(zoom);
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// --- Apel inițial (nu mai este necesar explicit aici) ---
// renderGraph();

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat v7 - Bule mărite) ------------
