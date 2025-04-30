// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (modificat v3) ------------
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
  if (data && data.nodes && Array.isArray(data.nodes) && data.links && Array.isArray(data.links)) {
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
    console.error("Eroare: data.json nu are formatul așteptat sau este gol/invalid.");
    // Poți decide ce faci aici - poate încarci un nod default sau afișezi un mesaj
    // De ex: nodeData = [{id: "Error loading data"}]; renderGraph();
  }
}).catch(error => {
  console.error("Eroare la încărcarea sau procesarea data.json:", error);
  // Gestionează eroarea - poate afișezi un mesaj utilizatorului
});

// Funcția care actualizează pozițiile la fiecare pas al simulării
function ticked() {
  // Verificăm dacă elementele există înainte de a le actualiza atributele
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
  // Verificăm dacă svg există
  if (!svg) {
      console.error("Elementul SVG #viz nu a fost găsit!");
      return;
  }

  // Selectăm și legăm datele pentru legături (links)
  link = svg.selectAll("line.link") // Adăugăm o clasă pentru specificitate
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join("line")
    .attr("class", "link") // Adăugăm clasa
    .attr("stroke-width", 1)
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4);

  // Selectăm și legăm datele pentru noduri (nodes)
  nodeGroup = svg.selectAll("g.node")
    .data(nodeData, d => d.id)
    .join(
      enter => { // Ce se întâmplă când intră un nod nou
        const g = enter.append("g")
          .attr("class", "node"); // Setăm clasa

        // Atașăm event handler-ul de click
        g.on("click", (event, d) => {
            event.stopPropagation();
            expandNode(event, d);
          });

        // Adăugăm primul cerc (exterior)
        g.append("circle")
          .attr("class", "outer-circle") // Adăugăm clasă
          .attr("r", 24)
          .attr("fill", "transparent")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);

        // Adăugăm al doilea cerc (interior)
        g.append("circle")
          .attr("class", "inner-circle") // Adăugăm clasă
          .attr("r", 14)
          .attr("fill", "white");

        // Adăugăm tooltip
        g.append("title").text(d => d.id);

        // Verificăm dacă simularea e gata ÎNAINTE de a atașa drag
        if (simulation) {
            g.call(drag(simulation)); // Atașăm drag DOAR dacă simularea există
        } else {
            console.warn("Simularea nu a fost gata la crearea nodului, drag nu a fost atașat:", d.id);
        }

        // Folosim un log mai simplu aici pentru a evita ReferenceError anterior
        console.log("Nod nou (grup) creat în DOM.");
        return g;
      },
      update => update, // Selecția de update (noduri existente)
      exit => { // Selecția de exit (noduri care dispar)
          // AICI ERA LINIA 101 CARE DADEA EROARE - ACUM ESTE COMENTATĂ:
          // console.log("Nod eliminat din DOM:", d.id);
          exit.transition().duration(300).attr("opacity", 0).remove(); // Efect de fade out la remove
      }
    );

  // Actualizăm simularea cu noile date (noduri și legături)
  if (simulation) {
      simulation.nodes(nodeData); // Update noduri in simulare
      simulation.force("link").links(linkData); // Update legături in simulare
      simulation.alpha(1).restart(); // Repornim simularea pt a rearanja elementele
      console.log("Simulare actualizată și repornită.");
  } else {
      // Acest mesaj e normal să apară la început dacă renderGraph e apelat înainte ca simularea să fie definită
      console.warn("renderGraph a fost apelat, dar simularea nu este încă initializată.");
  }
}


// --- FUNCȚIA expandNode MODIFICATĂ CU API CALL ---
function expandNode(event, clickedNode) {
  console.log("Se extinde nodul:", clickedNode.id);

  // !!!!! IMPORTANT !!!!! Înlocuiește 'YOUR_API_KEY' cu cheia ta API reală de la Last.fm
  const apiKey = '2d89aac23be0191cf4c48570759af0e9';
  // !!!!!!!!!!!!!!!!!!!!!

  const artistName = clickedNode.id;

  if (!artistName) {
      console.error("Numele artistului este invalid:", artistName);
      return;
  }

  const limit = 5;
  const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&limit=${limit}&format=json`;

  console.log("Se apelează API-ul Last.fm:", apiUrl);

  // TODO: Adaugă indicator vizual de încărcare lângă clickedNode

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
          console.error("Eroare returnată de API Last.fm în JSON:", data.message);
          // Afișează mesaj utilizatorului
          return; // Oprește execuția aici
      }

      if (data.similarartists && data.similarartists.artist && Array.isArray(data.similarartists.artist)) {
        const similarArtists = data.similarartists.artist.filter(artist => artist.name !== artistName);

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști *similari* noi.");
            // TODO: Afișează mesaj utilizatorului
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
            };
            nodeData.push(newNode);
            linkData.push({ source: clickedNode.id, target: newId });
            count++;
            console.log("Adăugat nod nou:", newId);
            existing.add(newId);
          } else {
            console.log("Nodul exista deja:", newId);
            const linkExists = linkData.some(l =>
               (l.source.id === clickedNode.id && l.target.id === newId) ||
               (l.source.id === newId && l.target.id === clickedNode.id) ||
               // Verificăm și obiectele sursă/țintă direct (în caz că nu sunt stringuri)
               (l.source === clickedNode.id && l.target === newId) ||
               (l.source === newId && l.target === clickedNode.id)
            );
            if (!linkExists) {
                linkData.push({ source: clickedNode.id, target: newId });
                console.log("Adăugat legătură nouă către nod existent:", newId);
                 count++; // Incrementăm și aici dacă vrem ca renderGraph() să fie apelat
            }
          }
        });

        if (count > 0) {
          console.log("Redesenare grafic...");
          renderGraph();
        } else {
           console.log("Nu au fost adăugați artiști sau legături noi.");
        }

      } else {
        console.log("API-ul Last.fm nu a returnat artiști similari în formatul așteptat pentru:", artistName, data);
        // TODO: Afișează mesaj utilizatorului
      }
    })
    .catch(error => {
      console.error('A apărut o eroare în lanțul fetch:', error);
      // TODO: Afișează un mesaj de eroare utilizatorului
      // TODO: Elimină indicatorul de încărcare
    })
    .finally(() => {
        console.log("Apelul API finalizat pentru:", artistName);
        // TODO: Elimină indicatorul de încărcare
    });
}
// --- SFÂRȘIT FUNCȚIE expandNode MODIFICATĂ ---


// Funcția pentru drag & drop
function drag(simulation) {
  // Verificăm dacă simularea este validă
  if (!simulation) {
      console.warn("Încercare de a atașa drag cu o simulare invalidă.");
      return () => {}; // Returnăm o funcție goală dacă nu avem simulare
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
    // d.fx = null; // Decomentează pentru a elibera nodul după drag
    // d.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (modificat v3) ------------
