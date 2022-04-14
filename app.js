const PRODUCTION_API = "https://dev-dot-bolao-2022.appspot.com"
const DEV_API = "http://0.0.0.0:8080"
const LOCALS = ['0.0.0.0', '127.0.0.1', 'localhost'];
const API = LOCALS.includes(location.hostname) ? DEV_API : PRODUCTION_API;

let div = document.querySelector("div");

function set_route(route) {
    console.log(`rota: ${route}`);
    let parts = route.split("/");
    if (parts[1] == "jogo") {
        view_jogo(parts[2]);
    } else {
        view_not_found();
    }
}

async function view_not_found() {
    div.innerHTML = `
        <h1>not found!</h1>
    `;
}

async function view_jogo(jid) {
    let resp1 = await fetch(`${API}/jogo/${jid}`);
    let jogo = await resp1.json();

    let resp2 = await fetch(`${API}/paises`);
    let paises = await resp2.json();

    let hora = new Date(jogo.hora * 1000);
    let pais1 = paises[jogo.time1][0];
    let band1 = paises[jogo.time1][1];
    let pais2 = paises[jogo.time2][0];
    let band2 = paises[jogo.time2][1];
    div.innerHTML = `
        <h2>Jogo ${jogo.id}</h2>
        <p><img src="${band1}?tx=w_30">${pais1} X ${pais2}<img src="${band2}?tx=w_30"></p>
        <p>${hora.toDateString()}, ${jogo.local}</p>
        <button>p</button>
    `;

    let prox = div.querySelector("button");
    prox.addEventListener("click", function (e) {
        let prox = `/jogo/${Number(jid) + 1}`;
        console.log(prox);
        set_route(prox);
    });
}

async function main() {
    console.log("oi!");
    set_route(location.hash.slice(1));
}

main();
