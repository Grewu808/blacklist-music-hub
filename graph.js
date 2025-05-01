// ------------ ÎNCEPUT COD COMPLET PENTRU graph.js (Spotify API - URL-uri REALE) ------------

// --- ATENȚIE MARE LA SECURITATE! ---
// PUNEREA SECRETULUI SPOTIFY DIRECT ÎN CODUL DIN BROWSER NU ESTE SIGURĂ ÎN PRODUCȚIE!
// ACEASTĂ METODĂ ESTE DOAR PENTRU TESTARE SAU DEZVOLTARE LOCALĂ.
// PENTRU UN SITE PUBLIC, OBȚINEREA TOKENULUI (folosind Client ID și Client Secret) TREBUIE FĂCUTĂ PE UN SERVER (BACKEND).
const spotifyClientId = '38d179166ca140e498c596340451c1b5'; // <-- ID-ul tău Spotify
const spotifyClientSecret = '8bf8f530ca544c0dae7df204d2531bf1'; // <-- Secret-ul tău Spotify

// Variabilă globală pentru a stoca tokenul de acces Spotify și momentul expirării
let spotifyAccessToken = null;
let spotifyTokenExpiryTime = 0;

// --- Funcție pentru a obține sau reînnoi tokenul Spotify ---
// !!! ACEASTĂ IMPLEMENTARE NU ESTE SIGURĂ PENTRU UN SITE PUBLIC !!!
// EA EXPUȘE SECRETUL CLIENTULUI ÎN CODUL SURSĂ VIZIBIL ÎN BROWSER.
// ÎN PRODUCȚIE, ACEST PAS TREBUIE MUTAT PE UN SERVER.
async function getSpotifyAccessToken() {
  // Verifică dacă tokenul existent este încă valid
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiryTime) {
    console.log("Se folosește tokenul Spotify existent.");
    return spotifyAccessToken;
  }

  console.log("Se solicită un nou token de acces Spotify...");
  // Aceasta este linia periculoasă pentru un site public:
  const authString = `${spotifyClientId}:${spotifyClientSecret}`;
  const base64AuthString = btoa(authString); // Codifică ID-ul și Secret-ul Base64

  try {
    // ATENȚIE: Aceasta este URL-ul REAL al endpoint-ului Spotify pentru token
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64AuthString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage = errorBody?.error_description || `HTTP error! status: ${response.status}`;
      console.error("Eroare la obținerea tokenului Spotify:", errorMessage);
      // Poți adăuga aici un alert() sau afișa o eroare pe interfață
      throw new Error(`Could not get Spotify access token: ${errorMessage}`);
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    // Setează momentul expirării cu puțin timp înainte de expirarea reală (ex: cu 60 secunde mai devreme)
    spotifyTokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    console.log("Token Spotify obținut. Valabil până la:", new Date(spotifyTokenExpiryTime).toLocaleTimeString());
    return spotifyAccessToken;

  } catch (error) {
    console.error("Eroare critică în funcția getSpotifyAccessToken:", error);
    // Afișează un mesaj clar utilizatorului dacă nu se poate autentifica la Spotify
    alert("Eroare la conectarea cu Spotify. Verifică consola pentru detalii (posibil ID/Secret incorect).");
    throw error; // Propagă eroarea mai departe
  }
}


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

  // Resetăm datele grafului
  nodeData = [];
  linkData = [];
  // Oprim simularea curentă dacă există
  if(simulation) simulation.stop();

  // Ștergem elementele vizuale din SVG
  container.selectAll("line.link").remove();
  container.selectAll("g.node").remove();
  // Resetăm selecțiile D3
  link = container.selectAll("line.link");
  nodeGroup = container.selectAll("g.node");
  console.log("Graficul vechi a fost șters.");

  // Adăugăm nodul central pentru artistul căutat
  const newNode = {
    id: artistName, // Folosim numele ca ID inițial
    // Poziție inițială aproape de centru cu o mică variație random
    x: width / 2 + (Math.random() - 0.5) * 5,
    y: height / 2 + (Math.random() - 0.5) * 5,
    imageUrl: null // Imaginea va fi căutată de Spotify
  };
  nodeData.push(newNode);
  console.log("Nod inițial adăugat pentru:", artistName);

  // Resetăm zoom-ul și pan-ul
  svg.call(zoom.transform, d3.zoomIdentity);
  console.log("Zoom/Pan resetat.");

  // Redesenăm graful cu nodul inițial
  renderGraph();
  // Nu apelăm expandNode aici, se va apela la click pe nod

  // Oprește simularea imediat după resetare și o pornește cu noul nod
  if (simulation) {
      simulation.nodes(nodeData);
      simulation.force("link").links(linkData);
      simulation.alpha(0.3).restart(); // Repornește simularea cu alpha pozitiv
      console.log("Simulare repornită cu nodul inițial.");
  }
}


// --- Funcțiile D3 existente (ticked, renderGraph, drag) ---

function ticked() {
  // Actualizează pozițiile legăturilor
  if (link) {
     link
       .attr("x1", d => d.source.x)
       .attr("y1", d => d.source.y)
       .attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
  }
  // Actualizează pozițiile grupurilor de noduri
  if (nodeGroup) {
     nodeGroup
       .attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

// Funcția care (re)desenează graficul pe baza nodeData și linkData
function renderGraph() {
  if (!svg || !container) {
      console.error("Elementul SVG #viz sau containerul nu a fost găsit!");
      return;
  }
  console.log(`RenderGraph: Noduri=${nodeData.length}, Legături=${linkData.length}`);

  // Actualizează/Creează/Șterge Legături (Lines)
  link = container.selectAll("line.link")
    .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join(
      enter => enter.append("line")
        .attr("class", "link")
        .attr("stroke-width", 1)
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4),
      update => update, // Nu sunt actualizări specifice pentru linii în acest graf
      exit => exit.remove()
    );

  // Actualizează/Creează/Șterge Noduri (Groups)
  nodeGroup = container.selectAll("g.node")
    .data(nodeData, d => d.id) // Folosește ID-ul nodului pentru a lega datele de elemente
    .join(
      // Partea de ENTER (pentru noduri noi)
      enter => {
        const g = enter.append("g")
          .attr("class", "node");

        // Atașează event listener pentru click (expandează nodul)
        g.on("click", (event, d) => {
            event.stopPropagation(); // Oprește propagarea evenimentului click (pentru a nu interfera cu zoom-ul)
            expandNode(event, d);
          });

        // Adaugă cercul exterior (bordura)
        g.append("circle")
          .attr("class", "outer-circle")
          .attr("r", 28) // Raza cercului exterior
          .attr("fill", "transparent")
          .attr("stroke", "#aaa") // Culoarea bordurii standard
          .attr("stroke-width", 1);

        // Adaugă imaginea (artwork artist)
        g.append("image")
          .attr("href", d => d.imageUrl || "") // Sursa imaginii din datele nodului
          .attr("width", clipPathRadius * 2) // Dimensiunea imaginii (dublul razei clipPath-ului)
          .attr("height", clipPathRadius * 2)
          .attr("x", -clipPathRadius) // Poziționează imaginea central față de punctul (0,0) al grupului
          .attr("y", -clipPathRadius)
          .attr("clip-path", "url(#clip-circle)"); // Aplică masca circulară

        // Adaugă un element <title> pentru tooltip (afișează numele artistului la hover)
        g.append("title").text(d => d.id);

        // Adaugă textul (numele artistului) sub nod
        g.append("text")
          .attr("dy", "1.8em") // Poziționează textul sub centru nodului
          .attr("text-anchor", "middle") // Centrează textul orizontal
          .style("font-size", "10px")
          .style("fill", "#cccccc") // Culoarea textului
          .text(d => d.id); // Conținutul textului (numele artistului)

        // Atașează comportamentul de drag & drop la nodurile noi
        if (simulation) {
            g.call(drag(simulation));
        } else {
            console.warn("Simularea nu este definită la crearea nodului, drag nu a fost atașat:", d.id);
        }

        // Setează poziția inițială a nodului înainte de a fi afectat de simulare (opțional, dar util)
        g.attr("transform", d => `translate(${d.x},${d.y})`);
        return g; // Returnează selecția elementelor create
      },

      // Partea de UPDATE (pentru noduri existente ale căror date s-au modificat)
      update => {
          // Actualizează titlul (tooltip)
          update.select("title").text(d => d.id);
          // Actualizează textul (numele) sub nod
          update.select("text").text(d => d.id);
          // Actualizează sursa imaginii (dacă s-a schimbat)
          update.select("image")
                .attr("href", d => d.imageUrl || "");
          // Actualizează culoarea bordurii în funcție de starea de eroare/warning
          update.select(".outer-circle")
                .attr("stroke", d => d.errorState === 'error' ? 'red' : (d.errorState === 'warning' ? 'orange' : '#aaa'));
          return update; // Returnează selecția elementelor actualizate
      },

      // Partea de EXIT (pentru noduri care nu mai există în date)
      exit => {
          exit.transition().duration(300).attr("opacity", 0).remove(); // Fade out și șterge elementele
      }
    );

  // Actualizăm simularea cu noile date despre noduri și legături
  if (simulation) {
      simulation.nodes(nodeData); // Actualizează datele despre noduri în simulare
      simulation.force("link").links(linkData); // Actualizează datele despre legături în simulare
      // Repornește simularea pentru a redistribui nodurile, dar nu dacă rulează deja cu alpha mare
      if (simulation.alpha() < 0.1) { // Verifică dacă simularea s-a "liniștit"
          simulation.alpha(0.3).restart(); // Repornește cu un alpha inițial mai mare pentru o mișcare vizibilă
          console.log("Simulare reactivată.");
      } else {
           console.log("Simulare actualizată (noduri/legături adăugate/șterse).");
      }
  } else {
      console.error("Eroare critică: Simularea nu este definită în renderGraph!");
  }
}


// --- FUNCȚIA expandNode (MODIFICATĂ PENTRU SPOTIFY - URL-uri REALE) ---
async function expandNode(event, clickedNode) {
  console.log("Se extinde nodul (Spotify):", clickedNode.id);

  const artistName = clickedNode.id;
  if (!artistName) {
    console.warn("expandNode apelat cu nume de artist gol.");
    return;
  }

  const clickedNodeElementSelection = event.currentTarget ? d3.select(event.currentTarget) : null;

  // Indicăm vizual că se încarcă date (opacitate imagine, bordură)
  if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
     clickedNodeElementSelection.select("image").style("opacity", 0.5);
     clickedNodeElementSelection.select(".outer-circle").style("stroke", "#f0f0f0"); // O culoare temporară de încărcare
  }
  delete clickedNode.errorState; // Resetăm starea de eroare/warning vizuală de pe nod

  try {
    // 1. Obține tokenul de acces Spotify
    // ATENȚIE: getSpotifyAccessToken conține Secret-ul Clientului și NU este sigură pentru frontend public.
    const accessToken = await getSpotifyAccessToken();
    if (!accessToken) {
       // getSpotifyAccessToken ar trebui să fi aruncat deja o eroare și afișat un mesaj
       throw new Error("Token de acces Spotify lipsă.");
    }

    // 2. Caută artistul pe Spotify pentru a obține ID-ul său
    console.log(`Căutare ID Spotify pentru artistul: "${artistName}"`);
    // ATENȚIE: Acesta este URL-ul REAL al endpoint-ului Spotify pentru căutare
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
    const searchResponse = await fetch(searchUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!searchResponse.ok) {
       const errorBody = await searchResponse.json().catch(() => null);
       const errorMessage = errorBody?.error?.message || `HTTP error! status: ${searchResponse.status} during artist search`;
       console.error("Eroare la căutarea artistului pe Spotify:", errorMessage, errorBody);
       throw new Error(`Could not search for artist on Spotify: ${errorMessage}`);
    }

    const searchData = await searchResponse.json();
    console.log("Rezultate căutare Spotify:", searchData);

    if (!searchData.artists || searchData.artists.items.length === 0) {
        console.log(`Artistul "${artistName}" nu a fost găsit pe Spotify.`);
        // Marchează nodul vizual ca warning dacă artistul nu e găsit
        if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
           clickedNodeElementSelection.select("title").text(`${artistName} (Not found on Spotify)`);
           clickedNodeElementSelection.select(".outer-circle").style("stroke", "orange");
           clickedNode.errorState = 'warning';
        }
        // Restabilește opacitatea imaginii chiar dacă nu a fost găsit artistul
        if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
           clickedNodeElementSelection.select("image").style("opacity", 1);
        }
        return; // Oprește execuția dacă artistul nu e găsit
    }

    const spotifyArtist = searchData.artists.items[0];
    const spotifyArtistId = spotifyArtist.id;
    // Caută o imagine de mărime rezonabilă (ex: >= 64px în înălțime) sau ia prima disponibilă
    const spotifyArtistImageUrl = spotifyArtist.images && Array.isArray(spotifyArtist.images) && spotifyArtist.images.length > 0
      ? (spotifyArtist.images.find(img => img.height >= 64) || spotifyArtist.images[0]).url
      : null;

    console.log(`ID Spotify găsit pentru "${artistName}": ${spotifyArtistId}`);
    if (spotifyArtistImageUrl) console.log(`URL Imagine Spotify găsit pentru "${artistName}": ${spotifyArtistImageUrl}`);

    // Actualizează nodul click-uit (nodul central) cu imageUrl de la Spotify dacă a fost găsit
    // Aceasta asigură că nodul central primește imaginea artistului căutat
    const nodeIndex = nodeData.findIndex(n => n.id === clickedNode.id);
    if (nodeIndex !== -1 && !nodeData[nodeIndex].imageUrl && spotifyArtistImageUrl) {
        nodeData[nodeIndex].imageUrl = spotifyArtistImageUrl;
        console.log(`Nodul central [${clickedNode.id}] actualizat cu imaginea Spotify.`);
        // Marcam nodul actual ca având nevoie de o actualizare vizuală imediată
        // renderGraph va face actualizarea imaginii în următoarea execuție, dar putem forța o actualizare vizuală direct aici
        if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
            clickedNodeElementSelection.select("image").attr("href", spotifyArtistImageUrl);
            console.log(`Imaginea nodului central [${clickedNode.id}] actualizată vizual.`);
        }
    }


    // 3. Obține artiștii similari de la Spotify folosind ID-ul artistului
    console.log(`Se caută artiști similari pentru ID-ul Spotify: ${spotifyArtistId}`);
    // ATENȚIE: Acesta este URL-ul REAL al endpoint-ului Spotify pentru artiști similari
    const relatedArtistsUrl = `https://api.spotify.com/v1/artists/${spotifyArtistId}/related-artists`;
    const relatedArtistsResponse = await fetch(relatedArtistsUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!relatedArtistsResponse.ok) {
       const errorBody = await relatedArtistsResponse.json().catch(() => null);
       const errorMessage = errorBody?.error?.message || `HTTP error! status: ${relatedArtistsResponse.status} during related artists fetch`;
       console.error("Eroare la preluarea artiștilor similari de la Spotify:", errorMessage, errorBody);
       throw new Error(`Could not fetch related artists from Spotify: ${errorMessage}`);
    }

    const relatedArtistsData = await relatedArtistsResponse.json();
    console.log("Date primite de la Spotify (artiști similari):", relatedArtistsData);

    // Procesează datele primite de la Spotify și actualizează graful
    if (relatedArtistsData.artists && Array.isArray(relatedArtistsData.artists)) {
        // Artiștii similari sunt în array-ul 'artists' din răspunsul Spotify
        const similarArtists = relatedArtistsData.artists;

        if (similarArtists.length === 0) {
            console.log("Nu s-au găsit artiști similari pe Spotify.");
            if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
                clickedNodeElementSelection.select("title").text(`${artistName} (No similar artists found)`);
            }
            // Asigură-te că stilurile de încărcare sunt resetate
            if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
                clickedNodeElementSelection.select("image").style("opacity", 1);
                // Resetează stroke-ul doar dacă nu era deja pe eroare/warning
                if (!clickedNode.errorState) {
                    clickedNodeElementSelection.select(".outer-circle").style("stroke", "#aaa");
                }
            }
            return; // Oprește execuția dacă nu sunt artiști similari
        }

        const existingNodeIds = new Set(nodeData.map(n => n.id));
        let elementsAddedCount = 0; // Numărăm și noduri și legături noi
        const cx = clickedNode.x ?? width / 2; // Folosește poziția actuală a nodului click-uit
        const cy = clickedNode.y ?? height / 2;
        const radius = 150; // Ajustează distanța față de nodul central

        // Limităm numărul de artiști similari adăugați, similar cu limita de 5 de la Last.fm
        const artistsToAdd = similarArtists.slice(0, 6); // Ia primii 6 (poți ajusta)

        artistsToAdd.forEach((artist, index) => {
          const newId = artist.name; // Folosim numele artistului similar ca ID pentru noul nod
          // Caută o imagine potrivită (ex: >= 64px) sau ia prima disponibilă
          const imageUrl = artist.images && Array.isArray(artist.images) && artist.images.length > 0
            ? (artist.images.find(img => img.height >= 64) || artist.images[0]).url
            : null;

          // Adaugă nodul nou doar dacă nu există deja în graf
          if (!existingNodeIds.has(newId)) {
            // Calculează o poziție inițială pe un cerc în jurul nodului părinte
            const angle = (2 * Math.PI / artistsToAdd.length) * index;
            const newNode = {
                id: newId,
                imageUrl: imageUrl,
                // Poziție inițială cu o mică variație random pentru a evita suprapunerea perfectă
                x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
                y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 30
            };
            nodeData.push(newNode); // Adaugă noul nod în array-ul de date
            linkData.push({ source: clickedNode.id, target: newId }); // Adaugă legătura
            elementsAddedCount++; // Incrementăm numărul de elemente noi adăugate
            console.log("Adăugat nod nou:", newId);
            existingNodeIds.add(newId); // Adaugă noul ID la setul de ID-uri existente
          } else {
            console.log("Nodul exista deja:", newId);
            // Dacă nodul există, verificăm dacă legătura există deja și o adăugăm dacă nu
            const linkExists = linkData.some(l =>
                // Verifică dacă legătura (sursă->țintă) există
                (typeof l.source === 'object' ? l.source.id === clickedNode.id : l.source === clickedNode.id) &&
                (typeof l.target === 'object' ? l.target.id === newId : l.target === newId)
                // Verifică și în sens invers (țintă->sursă), pentru grafuri nedirecționate
                || (typeof l.source === 'object' ? l.source.id === newId : l.source === newId) &&
                 (typeof l.target === 'object' ? l.target.id === clickedNode.id : l.target === clickedNode.id)
            );

            if (!linkExists) {
              linkData.push({ source: clickedNode.id, target: newId }); // Adaugă legătura nouă
              console.log("Adăugat legătură nouă către nod existent:", newId);
              elementsAddedCount++; // Incrementăm și pentru legăturile noi adăugate către noduri existente
            }
          }
        });

        // Eliberează nodul părinte de poziția fixă (dacă a fost setată de drag) pentru a permite simulării să-l miște
        delete clickedNode.fx;
        delete clickedNode.fy;
        console.log("Nod părinte eliberat (fx/fy șterse).");

        // Redesenează graful și repornește simularea dacă s-au adăugat noduri noi sau legături noi
        if (elementsAddedCount > 0) {
          console.log(`Redesenare grafic și repornire simulare cu ${elementsAddedCount} elemente noi adăugate...`);
          renderGraph();
          // Repornește simularea cu o forță mică pentru a permite noilor elemente să se așeze
          if(simulation) simulation.alpha(0.3).restart(); // Folosim 0.3 pentru o mișcare mai vizibilă la adăugare
        } else {
          console.log("Nu au fost adăugate elemente noi (noduri sau legături noi) în graf.");
          // Dacă nu s-a adăugat nimic nou, resetează stilurile de încărcare manual
          if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
            clickedNodeElementSelection.select("image").style("opacity", 1);
            // Resetează stroke-ul doar dacă nu este o stare de eroare/warning
            if (!clickedNode.errorState) {
                clickedNodeElementSelection.select(".outer-circle").style("stroke", "#aaa");
            }
          }
        }

    } else {
        console.log("API-ul Spotify nu a returnat artiști similari în formatul așteptat pentru:", artistName, relatedArtistsData);
        // Marchează nodul vizual ca warning dacă formatul răspunsului e invalid
        if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
            clickedNodeElementSelection.select("title").text(`${artistName} (Invalid Spotify response)`);
            clickedNodeElementSelection.select(".outer-circle").style("stroke", "orange");
            clickedNode.errorState = 'warning';
        }
    }

  } catch (error) {
    console.error('A apărut o eroare în lanțul de apeluri Spotify:', error);
    // Afișează vizual eroarea pe nodul click-uit
     if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
        clickedNodeElementSelection.select("title").text(`${artistName} (Error: ${error.message})`);
        clickedNodeElementSelection.select(".outer-circle").style("stroke", "red");
        clickedNode.errorState = 'error'; // Setează starea de eroare
       // Restabilește opacitatea imaginii în caz de eroare
        clickedNodeElementSelection.select("image").style("opacity", 1);
     }
  } finally {
        console.log("Apelurile API Spotify finalizate pentru:", artistName);
        // Resetăm stilurile de încărcare (opacitatea imaginii, culoarea bordurii cercului)
        // Această logică s-a mutat în blocurile try/catch/then/else pentru a fi mai precisă,
        // dar ne asigurăm aici că opacitatea imaginii revine la 1 indiferent de rezultat.
        if (clickedNodeElementSelection && !clickedNodeElementSelection.empty()) {
            const imageElement = clickedNodeElementSelection.select("image");
            if (imageElement.node()) {
               imageElement.style("opacity", 1); // Asigură că imaginea nu rămâne semi-transparentă
            }
            // Resetează stroke-ul cercului doar dacă nu este o stare de eroare/warning
            if (!clickedNode.errorState) {
                const outerCircle = clickedNodeElementSelection.select(".outer-circle");
                 if (outerCircle.node()) {
                    outerCircle.style("stroke", "#aaa"); // Resetează culoarea bordurii la normal
                 }
            }
        }
    }
}
// --- SFÂRȘIT FUNCȚIE expandNode MODIFICATĂ PENTRU SPOTIFY ---


// Funcția pentru drag & drop (rămâne neschimbată)
// Aceasta permite utilizatorului să tragă nodurile în graf.
function drag(simulation) {
  if (!simulation) {
      console.warn("Încercare de a atașa drag cu o simulare invalidă.");
      return () => {}; // Returnează o funcție dummy dacă simularea nu e validă
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart(); // Repornește simularea când începe drag-ul
    d.fx = d.x; // Fixează poziția nodului pe axa X
    d.fy = d.y; // Fixează poziția nodului pe axa Y
    svg.on(".zoom", null); // Dezactivează temporar zoom-ul D3 pe durata drag-ului
  }
  function dragged(event, d) {
    d.fx = event.x; // Actualizează poziția fixă pe măsură ce nodul este tras
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0); // Oprește simularea dacă nu mai sunt noduri active în drag
    // Nu lăsa poziția fixă dacă vrei ca nodul să fie din nou afectat de forțe după ce a fost tras
    // delete d.fx;
    // delete d.fy;
    svg.call(zoom); // Reactivăm zoom-ul D3 după ce drag-ul s-a terminat
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// ------------ SFÂRȘIT COD COMPLET PENTRU graph.js (Spotify API - URL-uri REALE) ------------
