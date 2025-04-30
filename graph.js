// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat v5 - Căutare Inițială) ------------
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

// Variabile globale pentru date și simulare
let nodeData = []; // Pornește gol
let linkData = []; // Pornește gol
let simulation, link, nodeGroup;

// --- Inițializare Simulare (se face o singură dată la început) ---
simulation = d3.forceSimulation(nodeData) // Inițializăm cu date goale
  .force("link", d3.forceLink(linkData).distance(150).id(d => d.id))
  .force("charge", d3.forceManyBody().strength(-400)) // Putem ajusta forțele
  .force("center", d3.forceCenter(width / 2, height / 2))
  .on("tick", ticked); // Apelăm funcția ticked la fiecare pas al simulării

// --- Referințe la elementele HTML de căutare ---
const searchInput = document.getElementById('artist-search-input');
const searchButton = document.getElementById('artist-search-button');

// --- Atașare Event Listeners pentru Căutare ---
if (searchButton && searchInput) {
  searchButton.addEventListener('click', handleSearch);
  // Bonus: Permite căutarea și la apăsarea tastei Enter în input
  searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
          e.preventDefault(); // Previne comportamentul default al Enter (ex: submit form)
          handleSearch();
      }
  });
  console.log("Event listeners pentru căutare atașați.");
} else {
  console.error("Elementele HTML pentru căutare (input sau buton) nu au fost găsite! Verifică ID-urile în map.html.");
}

// --- Funcția care gestionează căutarea ---
function handleSearch() {
  const artistName = searchInput.value.trim(); // Luăm valoarea și eliminăm spațiile goale
  console.log(`Se caută artistul: "${artistName}"`);

  if (!artistName) {
    console.log("Câmpul de căutare este gol.");
    alert("Te rog introdu un nume de artist."); // Feedback simplu pentru utilizator
    return; // Oprim execuția dacă nu s-a introdus nimic
  }

  // ----- Resetăm complet graful existent -----
  nodeData = []; // Golim array-ul de noduri
  linkData = []; // Golim array-ul de legături

  // Oprim simularea temporar pentru a șterge elementele SVG
  if(simulation) simulation.stop();

  // Ștergem elementele SVG vechi (linii și grupuri de noduri)
  if (link) link.remove();
  if (nodeGroup) nodeGroup.remove();
  // Re-selectăm ca să fim siguri că sunt goale pt data viitoare
  link = svg.selectAll("line.link");
  nodeGroup = svg.selectAll("g.node");
  console.log("Graficul vechi a fost șters.");
  // ----- Sfârșit resetare graf -----

  // Adăugăm nodul unic pentru artistul căutat
  const newNode = {
    id: artistName,
    // Îl punem în centru (cu o mică variație random ca să nu fie fix)
    x: width / 2 + (Math.random() - 0.5) * 5,
    y: height / 2 + (Math.random() - 0.5) * 5,
    // Îl fixăm în centru inițial? Poate fi util.
    // fx: width / 2,
    // fy: height / 2
  };
  nodeData.push(newNode);
  console.log("Nod inițial adăugat pentru:", artistName);

  // Redesenăm graficul doar cu acest nod
  renderGraph(); // Asta va actualiza și reporni simularea

  // Optional: Golim câmpul de căutare după ce s-a efectuat căutarea
  // searchInput.value = '';
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
       .attr("transform", d => `translate(<span class="math-inline">\{d\.x\},</span>{d.y})`);
  }
}

// Funcția care (re)desenează graficul
function renderGraph() {
  if (!svg) {
      console.error("Elementul SVG #viz nu a fost găsit!");
      return;
  }
  console.log(`RenderGraph: Noduri=<span class="math-inline">\{nodeData\.length\}, Legături\=</span>{linkData.length}`);

  // Links
  link = svg.selectAll("line.link")
    .data(linkData, d => `<span class="math-inline">\{d\.source\.id \|\| d\.source\}\-</span>{d.target.id || d.target}`)
    .join("line")
    .attr("class", "link")
    .attr("stroke-width", 1)
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4);

  // Nodes
  nodeGroup = svg.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => {
        const g = enter.append("g")
          .attr("class", "node");

        g.on("click", (event, d) => {
            event.stopPropagation();
            expandNode(event, d);
          });

        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 24)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        g.append("circle")
          .attr("class", "inner-circle")
          .attr("r", 14)
          .attr("fill", "white
