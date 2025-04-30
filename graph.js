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
       .attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

// Funcția care (re)desenează graficul
function renderGraph() {
  if (!svg) {
      console.error("Elementul SVG #viz nu a fost găsit!");
      return;
  }
  console.log(`RenderGraph: Noduri=${nodeData.length}, Legături=${linkData.length}`);

  // Links
  link = svg.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
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
          .attr("fill", "white");

        g.append("title").text(d => d.id);

        g.append("text")
          .attr("dy", "-1.5em")
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#cccccc")
          .text(d => d.id);

        if (simulation) {
            g.call(drag(simulation));
        } else {
            console.warn("Simularea nu gata la crearea nodului, drag nu a fost atașat:", d.id);
        }

        // Folosim un log mai simplu aici pentru a evita ReferenceError anterior
        console.log("Nod nou (grup) creat în DOM.");
        // Setăm poziția inițială explicit la enter
        g.attr("transform", d => `translate(${d.x},${d.y})`);
        return g;
      },
      update => { // Ce se întâmplă când un nod existent primește date noi (nu prea e cazul aici încă)
          // Putem actualiza tooltip-ul dacă e nevoie
          update.select("title").text(d => d.id);
          // Putem actualiza și textul vizibil dacă se schimbă ID-ul (puțin probabil)
          update.select("text").text(d => d.id);
          return update;
      },
      exit => { // Ce se întâmplă când un nod dispare
          // console.log("Nod eliminat din DOM:", d.id); // Comentat pt a evita eroarea
          exit.transition().duration(300).attr("opacity", 0).remove(); // Efect de fade out la remove
      }
    );

  // Actualizăm simularea
  if (simulation) {
      simulation.nodes(nodeData); // Update noduri in simulare
      simulation.force("link").links(linkData); // Update legături in simulare
      // Repornim simularea DOAR dacă alpha a scăzut prea mult sau e prima randare
      // Sau dacă tocmai am adăugat noduri (dar asta se face in expandNode/handleSearch)
      if (simulation.alpha() < 0.1) {
          simulation.alpha(0.3).restart(); // Dăm un impuls mai mic
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

  d3.select(event.currentTarget).select(".inner-circle").style("fill", "#f0f0f0"); // Gri deschis temporar

  const limit = 5;
  const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&limit=${limit}&format=json`;

  console.log("Se apelează API-ul Last.fm:", apiUrl);

  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        return response.json().catch(() => null).then(errorBody => {
             const errorMessage = errorBody?.message || `HTTP error! status: ${response.status}`;
             console.error("Eroare de la API Last.fm:", errorMessage, errorBody);
             throw new Error(errorMessage); // Aruncăm eroarea pentru a intra în .catch
        });
      }
      return response.json(); // Parsează JSON dacă răspunsul e OK
    })
    .then(data => {
      console.log("Date primite de la Last.fm (similar artists):", data);

      if (data.error) {
          // Last.fm trimite uneori erori în format JSON cu cod 200 OK
          console.error("Eroare returnată de API Last.fm în JSON:", data.message || data.error);
          // Afișează mesaj utilizatorului (poate pe nod?)
          d3.select(event.currentTarget).select("title").text(`Error: ${data.message || data.error}`); // Update tooltip with error
          d3.select(event.currentTarget).select(".inner-circle").style("fill", "red"); // Indicate error visually
          return; // Oprește execuția aici
      }

      // Resetăm culoarea nodului click-uit dacă API-ul a răspuns fără eroare JSON
       d3.select(event.currentTarget).select(".inner-circle").style("fill", "white");


      if (data.similarartists && data.similarartists.artist && Array.isArray(data.similarartists.artist)) {
        const similarArtists = data.similarartists.artist.filter(artist => artist.name !== artistName);

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști *similari* noi.");
            d3.select(event.currentTarget).select("title").text(`${artistName} (No new similar artists found)`);
            return;
        }

        const existing = new Set(nodeData.map(n => n.id));
        let count = 0;

        const cx = clickedNode.x ?? width / 2;
        const cy = clickedNode.y ?? height / 2;
        const radius = 80;

        similarArtists.forEach((artist, index) => {
          const newId = artist.name;
          if (!existing.has(newId)) {
            const angle = (2 * Math.PI / similarArtists.length) * index;
            const newNode = {
              id: newId,
              x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
              y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
              fx: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20, // Setăm și poziția fixă inițial
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

        // Eliberăm nodul părinte din poziția fixă
        delete clickedNode.fx;
        delete clickedNode.fy;

        if (count > 0) {
          console.log("Redesenare grafic și repornire simulare...");
          renderGraph(); // Redesenează graficul
          if(simulation) simulation.alpha(0.5).restart(); // Dăm un impuls simulării
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
           // Revenim la culoarea albă dacă nu s-a adăugat nimic nou
           d3.select(event.currentTarget).select(".inner-circle").style("fill", "white");
        }

      } else {
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        d3.select(event.currentTarget).select("title").text(`${artistName} (Invalid API response)`);
        d3.select(event.currentTarget).select(".inner-circle").style("fill", "orange");
      }
    })
    .catch(error => {
      console.error('A apărut o eroare în lanțul fetch:', error);
      d3.select(event.currentTarget).select("title").text(`${artistName} (Error: ${error.message})`);
      d3.select(event.currentTarget).select(".inner-circle").style("fill", "red");
    })
    .finally(() => {
        console.log("Apelul API finalizat pentru:", artistName);
        const nodeElement = d3.select(event.currentTarget);
        // Așteptăm puțin înainte de a reseta culoarea, doar dacă nu e eroare
        setTimeout(() => {
            const currentFill = nodeElement.select(".inner-circle").style("fill");
            // Verificăm dacă este culoarea de loading (rgb(240, 240, 240) == #f0f0f0)
            if (currentFill === 'rgb(240, 240, 240)') {
                 nodeElement.select(".inner-circle").style("fill", "white");
            }
        }, 1500); // Așteaptă 1.5 secunde
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
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // Lăsăm nodul fixat implicit
    // Decomentează liniile de mai jos pentru a elibera nodul după drag:
    // d.fx = null;
    // d.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// --- Apel inițial pentru a desena 'canvas-ul' gol sau starea inițială ---
// Decomentează linia de mai jos dacă vrei ca renderGraph să fie chemat explicit la start.
// Dacă nu, va fi chemat oricum după ce se atașează listenerii sau după prima căutare.
// renderGraph(); 

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat v5 - Căutare Inițială) ------------
