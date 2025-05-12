// === CONFIG ===
const OPEN_LIBRARY_API_BASE = "https://openlibrary.org";

// === D3 SETUP ===
const width = window.innerWidth, height = window.innerHeight;
const svg = d3.select("#viz").attr("width", width).attr("height", height);
const container = svg.append("g").attr("class", "zoom-container");

let nodeData = [], linkData = [];

const simulation = d3.forceSimulation(nodeData)
    .force("link", d3.forceLink(linkData).distance(220).id(d => d.id))
    .force("charge", d3.forceManyBody().strength(-700))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => d.type === "book" ? 90 : 50))
    .on("tick", ticked);

const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => container.attr("transform", e.transform));
svg.call(zoom);

let link = container.selectAll("line.link");
let nodeGroup = container.selectAll("g.node");

// === SEARCH HANDLERS ===
document.getElementById("search-btn").onclick = handleSearch;
document.getElementById("search").addEventListener("keypress", e => { if (e.key === 'Enter') handleSearch(); });

async function handleSearch() {
    const term = document.getElementById("search").value.trim();
    if (!term) return;
    nodeData = []; linkData = []; simulation.stop(); container.selectAll("*").remove();

    // 1. Caută carte exact după titlu
    let resTitle = await fetch(`${OPEN_LIBRARY_API_BASE}/search.json?title=${encodeURIComponent(term)}`);
    let dataTitle = await resTitle.json();

    if (dataTitle.docs && dataTitle.docs.length > 0) {
        // Ia primul rezultat și folosește key-ul de work
        let mainDoc = dataTitle.docs[0];
        let mainNode = await fetchBook(mainDoc.key);
        if (mainNode) {
            nodeData.push(mainNode);
            svg.call(zoom.transform, d3.zoomIdentity);
            renderGraph();
            simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
            return;
        }
    }

    // 2. Dacă nu găsește după titlu, caută după autor
    let resAuthor = await fetch(`${OPEN_LIBRARY_API_BASE}/search.json?author=${encodeURIComponent(term)}`);
    let dataAuthor = await resAuthor.json();
    if (dataAuthor.docs && dataAuthor.docs.length > 0) {
        // Ia primul autor și caută cărțile lui
        let mainDoc = dataAuthor.docs[0];
        if (mainDoc.author_name && mainDoc.author_name.length > 0) {
            let mainNode = fetchAuthor(mainDoc.author_name[0]);
            nodeData.push(mainNode);
            svg.call(zoom.transform, d3.zoomIdentity);
            renderGraph();
            simulation.nodes(nodeData); simulation.force("link").links(linkData); simulation.alpha(0.3).restart();
            return;
        }
    }

    alert("Niciun rezultat relevant găsit.");
}

async function fetchBook(bookKey) {
    try {
        // bookKey e de forma "/works/OLxxxxW"
        const response = await fetch(`${OPEN_LIBRARY_API_BASE}${bookKey}.json`);
        const data = await response.json();
        if (data && data.title) {
            // Fallback pentru an publicare
            let year = data.first_publish_year;
            if (!year && data.created && data.created.value) {
                year = data.created.value.substring(0, 4);
            }
            return {
                id: bookKey,
                label: data.title,
                type: "book",
                imageUrl: data.covers && data.covers.length > 0 ? `${OPEN_LIBRARY_API_BASE}/b/id/${data.covers[0]}-M.jpg` : "https://via.placeholder.com/120x180?text=No+Cover",
                first_publish_year: year || "",
                authors: data.authors ? data.authors.map(a => a.author.key) : [],
                subjects: data.subjects || []
            };
        }
    } catch (error) {
        console.error("Eroare la fetching detalii carte:", error);
        return null;
    }
}

function fetchAuthor(authorName) {
    return {
        id: "author-" + authorName,
        label: authorName,
        type: "author",
        imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=222&color=fff`
    };
}

function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

function rippleEffect(selection, color = "#ffffff", maxRadius = 80, duration = 700) {
    selection.each(function() {
        const g = d3.select(this);
        const ripple = g.insert("rect", ":first-child")
            .attr("x", -60).attr("y", -90)
            .attr("width", 120).attr("height", 180)
            .attr("rx", 16)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 3)
            .attr("opacity", 0.7);
        ripple.transition()
            .duration(duration)
            .attr("x", -80).attr("y", -120)
            .attr("width", 160).attr("height", 240)
            .attr("opacity", 0)
            .remove();
    });
}

function renderGraph() {
    link = container.selectAll("line.link")
        .data(linkData, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
        .join(
            enter => enter.append("line")
                .attr("class", "link")
                .attr("stroke", "#00cc66")
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.5),
            update => update,
            exit => exit.remove()
        );

    nodeGroup = container.selectAll("g.node")
        .data(nodeData, d => d.id)
        .join(
            enter => {
                const g = enter.append("g").attr("class", "node").style("cursor", "pointer");

                g.each(function(d) {
                    if (d.type === "book") {
                        rippleEffect(d3.select(this), "#00cc66", 80, 700);
                    }
                });

                g.on("mouseover", function(e, d) {
                    if (d.type === "book") rippleEffect(d3.select(this), "#00cc66", 80, 700);
                });

                g.on("click", (e, d) => {
                    e.stopPropagation();
                    expandNode(e, d);
                });

                // Noduri carte: dreptunghi copertă
                g.filter(d => d.type === "book")
                    .append("rect")
                    .attr("x", -60).attr("y", -90)
                    .attr("width", 120).attr("height", 180)
                    .attr("rx", 16)
                    .attr("fill", "#222")
                    .attr("stroke", "#aaa")
                    .attr("stroke-width", 2);

                g.filter(d => d.type === "book")
                    .append("image")
                    .attr("href", d => d.imageUrl)
                    .attr("x", -60).attr("y", -90)
                    .attr("width", 120).attr("height", 180)
                    .attr("clip-path", null);

                g.filter(d => d.type === "book")
                    .append("text")
                    .text(d => d.label)
                    .attr("text-anchor", "middle")
                    .attr("y", 105)
                    .style("font-size", "15px")
                    .style("font-weight", "bold")
                    .style("fill", "#fff")
                    .style("pointer-events", "none");

                g.filter(d => d.type === "book")
                    .append("text")
                    .text(d => d.first_publish_year || "")
                    .attr("text-anchor", "middle")
                    .attr("y", 125)
                    .style("font-size", "13px")
                    .style("fill", "#aaa")
                    .style("pointer-events", "none");

                // Noduri autor: cerc
                g.filter(d => d.type === "author")
                    .append("circle")
                    .attr("r", 50)
                    .attr("fill", "#222")
                    .attr("stroke", "#aaa")
                    .attr("stroke-width", 2);

                g.filter(d => d.type === "author")
                    .append("image")
                    .attr("href", d => d.imageUrl)
                    .attr("x", -40).attr("y", -40)
                    .attr("width", 80).attr("height", 80)
                    .attr("clip-path", null);

                g.filter(d => d.type === "author")
                    .append("text")
                    .text(d => d.label)
                    .attr("text-anchor", "middle")
                    .attr("y", 65)
                    .style("font-size", "14px")
                    .style("font-weight", "bold")
                    .style("fill", "#fff")
                    .style("pointer-events", "none");

                g.call(d3.drag()
                    .on("start", (e, d) => {
                        if (!e.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                        svg.on(".zoom", null);
                    })
                    .on("drag", (e, d) => {
                        d.fx = e.x;
                        d.fy = e.y;
                    })
                    .on("end", (e, d) => {
                        if (!e.active) simulation.alphaTarget(0);
                        svg.call(zoom);
                    })
                );

                g.attr("transform", d => `translate(${d.x || width/2},${d.y || height/2})`);

                return g;
            },
            update => update,
            exit => exit.transition().duration(300).attr("opacity", 0).remove()
        );

    // Asigură-te că liniile sunt sub postere
    container.selectAll("line.link").lower();
    container.selectAll("g.node").raise();

    simulation.nodes(nodeData);
    simulation.force("link").links(linkData);
    if (simulation.alpha() < 0.1) simulation.alpha(0.3).restart();
}

async function expandNode(event, clickedNode) {
    if (!clickedNode) return;
    if (clickedNode.expanded) return;
    clickedNode.expanded = true;

    // Cărți: adaugă cărți ale aceluiași autor
    if (clickedNode.type === "book" && clickedNode.authors && clickedNode.authors.length > 0) {
        const authorKey = clickedNode.authors[0];
        // Fetch works by author
        try {
            const authorWorksRes = await fetch(`${OPEN_LIBRARY_API_BASE}${authorKey}/works.json?limit=5`);
            const authorWorksData = await authorWorksRes.json();
            if (authorWorksData.entries && authorWorksData.entries.length > 0) {
                for (const work of authorWorksData.entries) {
                    if (!nodeData.some(x => x.id === work.key)) {
                        const relatedBookNode = await fetchBook(work.key);
                        if (relatedBookNode) {
                            let angle = Math.random() * 2 * Math.PI;
                            relatedBookNode.x = clickedNode.x + 250 * Math.cos(angle);
                            relatedBookNode.y = clickedNode.y + 250 * Math.sin(angle);
                            nodeData.push(relatedBookNode);
                            linkData.push({ source: clickedNode.id, target: relatedBookNode.id });
                        }
                    }
                }
                renderGraph();
            }
        } catch (e) {
            // fallback: nu face nimic
        }
    }

    // Autori: adaugă cărți scrise de acest autor
    if (clickedNode.type === "author" && clickedNode.label) {
        const authorName = clickedNode.label;
        const searchUrl = `${OPEN_LIBRARY_API_BASE}/search.json?author=${encodeURIComponent(authorName)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        if (data.docs) {
            let relatedBooks = data.docs.slice(0, 5);
            for (const book of relatedBooks) {
                const bookKey = book.key;
                if (!nodeData.some(x => x.id === bookKey)) {
                    const relatedBookNode = await fetchBook(bookKey);
                    if (relatedBookNode) {
                        let angle = Math.random() * 2 * Math.PI;
                        relatedBookNode.x = clickedNode.x + 200 * Math.cos(angle);
                        relatedBookNode.y = clickedNode.y + 200 * Math.sin(angle);
                        nodeData.push(relatedBookNode);
                        linkData.push({ source: clickedNode.id, target: relatedBookNode.id });
                    }
                }
            }
            renderGraph();
        }
    }
}
