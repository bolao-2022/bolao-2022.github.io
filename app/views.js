import * as bolao from './bolao.js';
import { API } from './config.js';


function set_route(route) {
    let parts = route.split("/");
    if (parts[1] == "jogo") {
        view_jogo(parts[2]);
    } else {
        view_not_found();
    }
}

let $main = document.querySelector("main");

export function view_perfil(perfil) {
    $main.innerHTML = `
        <h1>perfil ${perfil}</h1>
    `;
}

export async function view_jogo(jid) {
    $main.innerHTML = `
        <h1>jogo ${jid}</h1>
    `;
    let jogo = bolao.get_jogo(jid);
    $main.innerHTML = `
        <h2>Jogo ${jogo.jid}</h2>
        <p><img src="${jogo._band1}?tx=w_30">${jogo.time1} X ${jogo.time2}<img src="${jogo._band2}?tx=w_30"></p>
        <p>${new Date(1000 * jogo.hora).toDateString()}, ${jogo.local}</p>
    `;

    let prox = $main.querySelector("button");
    prox.addEventListener("click", function (e) {
        let prox = `/jogo/${Number(jid) + 1}`;
        set_route(prox);
    });
}
