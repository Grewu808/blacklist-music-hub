// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat v12 - Fix TypeError in finally) ------------
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

// --- Inițializare Simulare ---
simulation = d3.forceSimulation(nodeData)
  .force("link", d3.forceLink(linkData).distance(170).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-550))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(35)) // Rază coliziune
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
          // Actualizăm și cercul exterior (ex: pt stroke de eroare)
          update.select(".outer-circle")
                .attr("stroke", d => d.errorState === 'error' ? 'red' : (d.errorState === 'warning' ? 'orange' : '#aaa')); // Presupunem o proprietate errorState
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


// --- FUNCȚIA expandNode (cu fix pentru TypeError în finally) ---
function expandNode(event, clickedNode) {
  console.log("Se extinde nodul:", clickedNode.id);

  const apiKey = 'fe14d9e2ae87da47a1642aab12b6f52b'; // <<<<<<<<<<<<<< PUNE CHEIA TA !!!

  const artistName = clickedNode.id;
  if (!artistName) return;

  // Salvăm referința la elementul DOM al nodului click-uit
  // Event.currentTarget se referă la elementul pe care a fost atașat listener-ul (grupul <g>)
  const clickedNodeElement = event.currentTarget ? d3.select(event.currentTarget) : null;

  // Verificăm dacă am găsit elementul înainte de a-l folosi
  if (!clickedNodeElement || clickedNodeElement.empty()) {
      console.error("Nu s-a putut selecta elementul nodului click-uit.");
      // Poate oprim aici sau continuăm fără feedback vizual? Continuăm deocamdată.
  } else {
       // Setăm indicatorul de loading DOAR dacă avem elementul
       clickedNodeElement.select("image").style("opacity", 0.5);
       clickedNodeElement.select(".outer-circle").style("stroke", "#f0f0f0"); // Folosim conturul pt loading
  }
  // Resetăm starea de eroare/warning pe datele nodului (dacă o folosim)
  delete clickedNode.errorState;


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

      // Resetăm aspectul nodului click-uit (dacă nu e eroare JSON)
      if (clickedNodeElement && !clickedNodeElement.empty()) {
           clickedNodeElement.select("image").style("opacity", 1);
           // Nu resetăm stroke aici, îl resetăm în finally după timeout, sau dacă nu sunt erori/warning
      }

      if (data.error) {
          console.error("Eroare returnată de API Last.fm în JSON:", data.message || data.error);
          if (clickedNodeElement && !clickedNodeElement.empty()) {
              clickedNodeElement.select("title").text(`Error: ${data.message || data.error}`);
              clickedNodeElement.select(".outer-circle").style("stroke", "red");
              clickedNode.errorState = 'error'; // Marcăm nodul cu eroare
          }
          return;
      } else {
           // Dacă nu e eroare, resetăm stroke-ul ACUM (înainte de finally)
           if (clickedNodeElement && !clickedNodeElement.empty()) {
               clickedNodeElement.select(".outer-circle").style("stroke", "#aaa");
           }
      }


      if (data.similarartists && data.similarartists.artist && Array.isArray(data.similarartists.artist)) {
        const similarArtists = data.similarartists.artist.filter(artist => artist.name !== artistName);

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști *similari* noi.");
            if (clickedNodeElement && !clickedNodeElement.empty()) {
                clickedNodeElement.select("title").text(`${artistName} (No new similar artists found)`);
            }
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
                const sizes = ['medium', 'large', 'small', 'extralarge', 'mega'];
                for (const size of sizes) {
                    const imgObj = artist.image.find(img => img.size === size && img['#text']);
                    if (imgObj) {
                        imageUrl = imgObj['#text'];
                        console.log(`Găsit imagine ${size} pentru ${newId}`);
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

        // Eliberăm nodul părinte
        delete clickedNode.fx;
        delete clickedNode.fy;
        console.log("Nod părinte eliberat (fx/fy șterse).");


        if (count > 0) {
          console.log("Redesenare grafic și repornire simulare (cu alpha mic)...");
          renderGraph();
          if(simulation) simulation.alpha(0.1).restart(); // Impuls mic
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
        }

      } else {
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        if (clickedNodeElement && !clickedNodeElement.empty()) {
            clickedNodeElement.select("title").text(`${artistName} (Invalid API response)`);
            clickedNodeElement.select(".outer-circle").style("stroke", "orange");
            clickedNode.errorState = 'warning'; // Marcăm nodul cu warning
        }
      }
    })
    .catch(error => {
      console.error('A apărut o eroare în lanțul fetch:', error);
      if (clickedNodeElement && !clickedNodeElement.empty()) {
          clickedNodeElement.select("title").text(`${artistName} (Error: ${error.message})`);
          clickedNodeElement.select(".outer-circle").style("stroke", "red");
          clickedNode.errorState = 'error'; // Marcăm nodul cu eroare
      }
    })
    .finally(() => {
        console.log("Apelul API finalizat pentru:", artistName);
        // --- MODIFICAT setTimeout ---
        // Folosim setTimeout doar pentru a reseta indicatorul vizual de loading/eroare,
        // verificând dacă elementul încă există.
        setTimeout(() => {
            // Re-selectăm elementul ÎN INTERIORUL setTimeout, e mai sigur
            const finalNodeElement = d3.select(`g.node[data-id="${clickedNode.id}"]`); // Selectăm prin atribut/id dacă e posibil
            // Sau încercăm din nou cu event.currentTarget dacă contextul e păstrat? Mai puțin sigur.
            // const finalNodeElement = event.currentTarget ? d3.select(event.currentTarget) : null;

            if (finalNodeElement && !finalNodeElement.empty()) {
                // Verificăm dacă elementele interne există înainte de a le modifica stilul
                const imageElement = finalNodeElement.select("image");
                if (imageElement.node()) { // .node() returnează elementul DOM sau null
                   imageElement.style("opacity", 1);
                }

                const outerCircle = finalNodeElement.select(".outer-circle");
                if (outerCircle.node()) {
                    const currentStroke = outerCircle.style("stroke");
                    // Resetăm conturul doar dacă nu e roșu sau portocaliu
                    if (currentStroke !== 'red' && currentStroke !== 'orange') {
                       outerCircle.style("stroke", "#aaa");
                    }
                }
            } else {
                console.warn("Nu s-a putut re-selecta nodul în setTimeout din finally.");
            }
        }, 1000); // Redus timpul la 1 secundă
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
    svg.call(zoom); // Reactivăm zoom-ul
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat v12 - Fix TypeError in finally) ------------
