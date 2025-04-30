// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat) ------------
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#viz")
  .attr("width", width)
  .attr("height", height);

// Variabile globale pentru date și simulare
let nodeData = []; // Inițializăm goale, vor fi umplute de d3.json sau API
let linkData = []; // Inițializăm goale
let simulation, link, nodeGroup;

// Încărcăm datele inițiale (poate vrei să înlocuiești asta mai târziu cu un API call inițial)
d3.json("data.json").then(data => {
  console.log("Date inițiale încărcate din data.json:", data);
  // Asigură-te că data.json are formatul { "nodes": [...], "links": [...] }
  if (data && data.nodes && data.links) {
    nodeData = [...data.nodes]; // Copiem nodurile inițiale
    linkData = [...data.links]; // Copiem legăturile inițiale

    // Inițializăm simularea D3 DUPĂ ce avem datele inițiale
    simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).distance(150).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", ticked); // Apelăm funcția ticked la fiecare pas al simulării

    // Renderizăm graficul inițial
    renderGraph();
  } else {
    console.error("Eroare: data.json nu are formatul așteptat sau este gol.");
    // Poți decide ce faci aici - poate încarci un nod default?
    // De ex: nodeData = [{id: "Search for an artist"}]; renderGraph();
  }
}).catch(error => {
  console.error("Eroare la încărcarea data.json:", error);
  // Gestionează eroarea - poate afișezi un mesaj utilizatorului
});

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
  // Selectăm și legăm datele pentru legături (links)
  link = svg.selectAll("line")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`) // Folosim ID-uri sursa/tinta pt cheie
    .join("line")
    .attr("stroke-width", 1)
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4);

  // Selectăm și legăm datele pentru noduri (nodes)
  nodeGroup = svg.selectAll("g.node")
    .data(nodeData, d => d.id) // Folosim ID-ul nodului ca cheie
    .join(
      enter => { // Ce se întâmplă când intră un nod nou
        const g = enter.append("g")
          .attr("class", "node")
          .call(drag(simulation)) // Permite drag & drop pe noduri
          .on("click", (event, d) => { // Ce se întâmplă la click pe nod
            event.stopPropagation(); // Oprim propagarea evenimentului
            expandNode(event, d); // Apelăm funcția de expandare
          });

        // Adăugăm primul cerc (exterior, poate pentru efect vizual)
        g.append("circle")
          .attr("r", 24) // Raza cercului exterior
          .attr("fill", "transparent") // Umplere transparentă
          .attr("stroke", "#aaa") // Culoare contur
          .attr("stroke-width", 1);

        // Adăugăm al doilea cerc (interior, vizibil)
        g.append("circle")
          .attr("r", 14) // Raza cercului interior
          .attr("fill", "white"); // Culoare de umplere

        // Adăugăm textul (numele artistului) - ascuns inițial, apare la hover pe title
        // Sau îl putem afișa direct
        // g.append("text")
        //  .attr("dy", ".35em") // Ajustare verticală
        //  .attr("text-anchor", "middle") // Centrare text
        //  .text(d => d.id);

        // Adăugăm un "tooltip" simplu care arată ID-ul la hover
        g.append("title").text(d => d.id);

        console.log("Nod nou adăugat în DOM:", d.id);
        return g;
      },
      update => update, // Nu facem nimic special la update (D3 se ocupă)
      exit => { // Ce se întâmplă când un nod dispare (dacă vei implementa asta)
          console.log("Nod eliminat din DOM:", d.id);
          exit.remove();
      }
    );

  // Actualizăm simularea cu noile date (noduri și legături)
  if (simulation) {
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      simulation.alpha(1).restart(); // Repornim simularea pentru a aranja noile elemente
  } else {
      console.warn("Simularea nu este initializată încă.");
  }
}


// --- FUNCȚIA expandNode MODIFICATĂ CU API CALL ---
function expandNode(event, clickedNode) {
  console.log("Se extinde nodul:", clickedNode.id);

  // !!!!! IMPORTANT !!!!! Înlocuiește 'YOUR_API_KEY' cu cheia ta API reală de la Last.fm
  const apiKey = 'YOUR_API_KEY';
  // !!!!!!!!!!!!!!!!!!!!!

  const artistName = clickedNode.id; // Numele artistului pe care s-a dat click

  // Verificăm dacă numele artistului este valid (nu e gol sau undefined)
  if (!artistName) {
      console.error("Numele artistului este invalid:", artistName);
      return; // Oprim funcția dacă nu avem nume valid
  }

  // Setăm limita de artiști similari pe care îi cerem de la API
  const limit = 5; // Poți ajusta acest număr (ex: 3, 5, 7)

  // Construim URL-ul pentru API-ul Last.fm - metoda artist.getSimilar
  const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&limit=${limit}&format=json`;

  console.log("Se apelează API-ul Last.fm:", apiUrl);

  // Afișăm un indicator de încărcare (opțional)
  // Poți adăuga un mic text sau spinner lângă nodul click-uit

  // Folosim fetch pentru a chema API-ul
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        // Încercăm să citim mesajul de eroare de la Last.fm dacă există
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

      // Verificăm dacă API-ul a returnat artiști similari
      // Structura răspunsului: data.similarartists.artist = [...]
      if (data.similarartists && data.similarartists.artist && Array.isArray(data.similarartists.artist)) {

        // Filtrăm artiștii returnați dacă API-ul returnează chiar artistul căutat
        const similarArtists = data.similarartists.artist.filter(artist => artist.name !== artistName);

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști *similari* (poate doar cel căutat a fost returnat, sau niciunul).");
            // Afișează un mesaj utilizatorului că nu s-au găsit rezultate noi
            return; // Oprim dacă nu avem artiști noi
        }

        const existing = new Set(nodeData.map(n => n.id)); // Set cu ID-urile nodurilor existente
        let count = 0; // Numărăm câți artiști noi adăugăm

        const cx = clickedNode.x ?? width / 2; // Folosim poziția curentă din simulare
        const cy = clickedNode.y ?? height / 2;
        const radius = 80; // Distanța la care apar noii artiști

        similarArtists.forEach((artist, index) => {
          const newId = artist.name; // Numele artistului similar real

          // Verificăm dacă nu avem deja un nod cu acest nume
          if (!existing.has(newId)) {
            const angle = (2 * Math.PI / similarArtists.length) * index; // Distribuim uniform în cerc
            const newNode = {
              id: newId,
              // Setăm poziția inițială un pic randomizată în jurul părintelui
              x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
              y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
              // Putem seta și vx, vy pentru a le da un impuls inițial dacă dorim
              // vx: (Math.random() - 0.5) * 2,
              // vy: (Math.random() - 0.5) * 2
            };

            nodeData.push(newNode); // Adăugăm nodul nou în lista de noduri
            linkData.push({ source: clickedNode.id, target: newId }); // Adăugăm legătura nouă
            count++; // Incrementăm contorul
            console.log("Adăugat nod nou:", newId);
            existing.add(newId); // Adăugăm ID-ul în set pentru a evita duplicate în aceeași rundă
          } else {
            console.log("Nodul exista deja:", newId);
            // Verificăm dacă legătura există deja
            const linkExists = linkData.some(l =>
               (l.source.id === clickedNode.id && l.target.id === newId) ||
               (l.source.id === newId && l.target.id === clickedNode.id)
            );
            if (!linkExists) {
                linkData.push({ source: clickedNode.id, target: newId });
                console.log("Adăugat legătură nouă către nod existent:", newId);
                // Decidem dacă vrem să forțăm re-render și pt legături noi spre noduri vechi
                 count++; // Incrementăm și aici dacă vrem ca renderGraph() să fie apelat
            }
          }
        });

        // Dacă am adăugat cel puțin un nod sau o legătură nouă, redesenăm graficul
        if (count > 0) {
          console.log("Redesenare grafic...");
          renderGraph(); // Funcția ta existentă care redesenează graful
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
        }

      } else {
        // Cazul în care similarartists.artist nu există sau nu e array (poate fi obiect gol pt unii artiști?)
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        // Afișează un mesaj utilizatorului că nu s-au găsit rezultate
      }
    })
    .catch(error => {
      console.error('A apărut o eroare la preluarea sau procesarea artiștilor similari:', error);
      // Afișează un mesaj de eroare utilizatorului pe pagină (ex: într-un div dedicat)
      // Poți elimina indicatorul de încărcare aici
    })
    .finally(() => {
        // Cod care se execută indiferent dacă fetch a reușit sau a eșuat
        // Poți elimina indicatorul de încărcare aici
        console.log("Apelul API finalizat pentru:", artistName);
    });
}
// --- SFÂRȘIT FUNCȚIE expandNode MODIFICATĂ ---


// Funcția pentru drag & drop (preluată din codul tău original)
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart(); // Crește alpha la start drag
    d.fx = d.x; // Fixează poziția X a nodului la cea curentă
    d.fy = d.y; // Fixează poziția Y a nodului la cea curentă
  }
  function dragged(event, d) {
    d.fx = event.x; // Actualizează poziția fixă X pe măsură ce tragi
    d.fy = event.y; // Actualizează poziția fixă Y pe măsură ce tragi
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0); // Resetează alpha la final drag
    // Lăsăm nodul fixat (fx, fy setate) sau îl eliberăm?
    // Dacă vrei să rămână unde l-ai lăsat, nu faci nimic.
    // Dacă vrei să fie "eliberat" și să se reașeze conform forțelor:
    // d.fx = null;
    // d.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat) ------------
