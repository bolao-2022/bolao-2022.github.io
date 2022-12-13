import { watch_login_status, login, logout } from './auth.js';
import { API } from './config.js';
import * as views from './views.js';
import { now_ts, seconds2str, parse_token } from './utils.js';
import * as bolao from './bolao.js';

const BASE_PATH = location.host.startsWith('www.dsc.ufcg.edu.br') ?  '/~dalton/fb' : '';

let _cron_interval_handler;
let _header;

main();

function main() {

    // instala o watch do status de login
    // - invoca goto_location_route cada vez que o usuário loga
    // - invoca view_login_screen cada vez que usuário desloga
    // user is logged in or call view_login_screen otherwise
    watch_login_status(goto_location_route, view_login_screen);

    window.addEventListener('hashchange', function (event) {
        console.log(location.href);
        goto_location_route();
    });

    window.addEventListener("focus", function() {
        // usuário retornou à aba
        if (!window._blur_time) {
            return;
        }
        let tempo_off = new Date().getTime() - window._blur_time;
        let exp = parse_token(window.idToken).exp;
        let now = now_ts();
        let tempo_restante = exp - now;
        if (tempo_restante > 0) {
            console.log(`Token válido. Vence em ${tempo_restante.toFixed(0)} segundos.`);
        } else {
            console.log(`Token vencido! Usuário precisa fazer novo login.`);
            logout();
        }
    });

    window.addEventListener("blur", function() {
        // usuário vai sair da aba
        if (window.idToken) {
            window._blur_time = new Date().getTime();
        }
    });

    document.body.addEventListener('keyup', async ev => {
        if (ev.key.length == 1 && /^[:;,.]$/.test(ev.key)) {
            window._command = (window._command || "") + ev.key;
            if (window._command == ":::") {
                console.log(`_command = ${window._command}`);
                download_curlrc();
                delete window._command;
            } else if (window._command == ",,,.,") {
                console.log(`_command = ${window._command}`);
                let confirmacao = confirm("Libera palpites do próximo jogo?");
                if (confirmacao == true) {
                    await libera_palpites();
                    alert("palpites liberados");
                    delete window._command;
                }
            } else {
                setTimeout(() => {delete window._command;}, 2000);
            }
        }
    });

    //var mq = window.matchMedia("(max-width: 1200px)")
    //function myFunction(mq) {
    //  view_main();
    //  if (mq.matches) { // If media query matches
    //    document.body.style.backgroundColor = "red";
    //  } else {
    //    document.body.style.backgroundColor = "black";
    //  }
    //}
    //mq.addListener(myFunction)
}

function goto_location_route() {
    // ativa as views para a rota atual (url) no browser
    let route = location.hash || "#/";
    let path = route.split("/").slice(1);
    let view_selector = path[0];
    if (view_selector === 'p') {
        let id_hash = path[1];
        view_perfil(id_hash);
        return;
    } else if (view_selector === 'j') {
        let jid = path[1];
        view_jogo(jid);
        return;
    } else if (view_selector === 'r1') {
        let n = path[1];
        view_ranking(n, "r1");
        return;
    } else if (view_selector === 'r2') {
        let n = path[1];
        view_ranking(n, "r2");
        return;
    } else if (view_selector === '') {
        let jogo = path[1];
        view_main();
        return;
    } else {
        view_not_found(route.slice(1));
    }
}

function get_pidx() {
    return localStorage.getItem('pidx') || '0';
}

async function view_header(udata, reload = false) {
    if (_header && !reload) {
        return;
    }
    // ou não há _header ainda ou é reload
    //let udata = await bolao.userdata(get_pidx());

    // elementos dinâmicos do header
    let $perfil = document.querySelector("#perfil");
    let $muda_perfil = document.querySelector("#muda-perfil");
    let $goto_ranking1 = document.querySelector("#goto-ranking1");
    let $goto_ranking2 = document.querySelector("#goto-ranking2");
    let $cron = document.querySelector("#cron");
    //let $logout = document.querySelector("#logout");
    let $home = document.querySelector("#home");

    if (!udata?.email) {
        // NÃO há usuário logado
        $perfil.setAttribute('type', 'hidden');
        $muda_perfil.style.display = "none";
        $goto_ranking1.style.display = "none";
        $goto_ranking2.style.display = "none";
        //$logout.style.display = "none";
        $cron.style.display = "none";
        return;
    }

    // HÁ usuário logado
    $perfil.setAttribute('type', 'text');
    $muda_perfil.style.display = "inline-block";
    $goto_ranking1.style.display = "inline-block";
    $goto_ranking2.style.display = "inline-block";
    //$logout.style.display = "inline-block";
    $cron.style.display = "block";

    // exibe email do usuário
    $home.addEventListener('click', async () => {
        location = `${BASE_PATH}`;
    });
    $perfil.value = udata.perfil?.nick;
    $perfil.addEventListener('focus', async () => {
        $perfil.setSelectionRange(0, $perfil.value.length)

    });
    $perfil.addEventListener('change', async () => {
        let old_nick = udata.perfil?.nick;
        $perfil.classList.add('alerts-border');
        let report = await bolao.salva_nick(get_pidx(), $perfil.value);
        $perfil.classList.remove('alerts-border');
        if (report.ok) {
            $perfil.blur();
        } else {
            alert(`ERRO: ${report.error}`);
            $perfil.value = old_nick;
        }
    });

    // se não tem perfis, desativa botão muda-perfilreload
    if (udata.num_perfis < 2) {
        $muda_perfil.style.display = "none";
    }

    $perfil.addEventListener('keyup', (ev) => {
        if (ev.key.length == 1) {
            // evita que caracteres digitados sejam tomados como comandos de filtragem
            ev.stopPropagation();
        }
    });

    $goto_ranking1.addEventListener('click', async () => {
        location = `${BASE_PATH}/#/r1`;
    });

    $goto_ranking2.addEventListener('click', async () => {
        location = `${BASE_PATH}/#/r2`;
    });

    $muda_perfil.addEventListener('click', async () => {
        let pidx = `${(Number(get_pidx()) + 1) % udata.num_perfis}`;
        localStorage.setItem('pidx', pidx);
        location.reload(true);
    });

    function update_header() {
        window.tempo = window.deadline_ts - now_ts();
        if (window.tempo < 0) {
            window.site_bloqueado = true;
            $cron.innerText = "site bloqueado";
            $cron.classList.remove('alerts-border');
        } else {
            $cron.innerText = seconds2str(window.tempo);
            if (window.tempo < 10) {
                $cron.classList.add('alerts-border');
            }
        }
    }

    // se já tem interval handler, retorna
    if (!_cron_interval_handler) {
        _cron_interval_handler = setInterval(update_header, 1000);
    };
}

function view_login_screen() {
    view_header(null, true);
    let $main = document.querySelector("main");
    $main.innerHTML = `
        <div id="center-float">
            <p>Sign in with Google</p>
        </div>
    `;
    let $div = document.querySelector("#center-float");
    let $login = document.querySelector("#center-float p");
    $login.addEventListener("click", () => {
        $div.innerHTML = `
            <img style="width: 40px; height: auto;" src="assets/progress.gif" alt="">
        `;
        login();
    });
}

window.view_site_bloqueado = view_site_bloqueado;
async function view_site_bloqueado(message) {
    view_header(null);
    let $main = document.querySelector("main");
    $main.innerHTML = `
        <div id="center-float">
            <p>
                ${message}
            </p>
        </div>
    `;
}

async function view_main(reload = false) {
    let pidx = get_pidx();
    let [udata, ranking, palpites] = await Promise.all([
        bolao.userdata(get_pidx()),
        bolao.get_ranking(),
        bolao.get_palpites()
    ]);

    if ('code' in udata) {
        let msg;
        switch (udata.code) {
            case '403':
                msg = "O email usado não está cadastrado.";
                break;
            case '400':
                msg = "Servidor fora do ar. Aguarde um pouco ou entre em contato com a organização.";
                break;
            default:
                msg = "Servidor em manutenção. Aguarde um pouco ou entre em contato com a organização.";
        }
        view_site_bloqueado("Servidor fora do ar. Aguarde um pouco ou entre em contato com a organização.");
        console.error(udata);
        return;
    }
    view_header(udata);
    // ajusta as views da view base/principal do site
    // - header: contador + perfil + menu
    // - main: tabela da copa + placares + palpites + pontos + rascunho
    let $main = document.querySelector("main");
    $main.innerHTML = '<h2></h2>';
    let rascunho = udata?.perfil?.rascunho || {};
    let id_perfil = `${udata.email}:${udata.pidx}`;
    let $jogos = [];
    window.$jogos = $jogos;
    for (let jid=1; jid<=62; jid++) {
        let $jogo = document.createElement("bolao-jogo");
        $jogo.pidx = pidx;
        if (udata.perfil.id_hash) {
            $jogo.pontos_r1 = ranking[udata.perfil.id_hash].pontos[jid];
            if (typeof $jogo.pontos_r1 == 'undefined') {
                $jogo.pontos_r1 = "?";
            }
        }
        $jogos.push($jogo);
        $jogo.setAttribute("jid", `${jid}`);
        let palpite = (await bolao.get_palpite_salvo(udata.email, pidx, String(jid)))
                      || (await bolao.get_palpite_rascunho(pidx, String(jid)))
                      || "0 0";
        [$jogo.palpite1, $jogo.palpite2] = palpite.split(" ");
        $jogo.addEventListener('novo-palpite', async function (ev) {
            let res = await bolao.salva_palpite(udata.email, udata.pidx, ev.detail);
        });
        $jogo.addEventListener('click', async ev => {
            location = `${BASE_PATH}/#/j/${jid}`;
        });
        $main.appendChild($jogo);
    }
    //let $logout = document.querySelector("#logout");
    //$logout.addEventListener("click", () => {
    //    logout();
    //});
    setInterval(() => {
        $jogos.forEach($j => { $j.update(); });
    }, 500);

    let filtros = [];
    let criterios = {grupo: 'S'};
    await update_jogos(criterios);

    document.body.addEventListener('keyup', async ev => {
        if (ev.key.length == 1 && /^[abcdefghoqsxABCDEFGHOQSX]+$/.test(ev.key)) {
            let grupo = ev.key.toUpperCase();
            if (grupo == criterios.grupo) {
                delete criterios.grupo;
            } else {
                criterios.grupo = ev.key.toUpperCase();
            }
        }
        else if (ev.key.length == 1 && ev.key == '*' || ev.key.toLowerCase() == 't') {
            delete criterios.grupo;
            delete criterios.prazo;
        }
        else if (ev.key.length == 1 && /^[0-9]+$/.test(ev.key)) {
            // mostrar todos nos próximos N dias
            delete criterios.grupo;
            criterios.dias = ev.key;
            let N = Number(ev.key);
            if (N === 0) {
                delete criterios.prazo;
            } else {
                let now = new Date();
                let prazo = new Date(now.getTime() + N * 24 * 60 * 60 * 1000);
                criterios.prazo = prazo.toISOString().slice(0, 10);
            }
        }
        await update_jogos(criterios);
    });

    async function update_jogos(criterios) {
        let $h2 = $main.querySelector("h2");
        switch (criterios.grupo) {
            case 'T': $h2.innerText = "Tabela completa"; break;
            case 'O': $h2.innerText = "Oitavas de final"; break;
            case 'Q': $h2.innerText = "Quartas de final"; break;
            case 'S': $h2.innerText = "Semi-finais"; break;
            case 'X': $h2.innerText = "Finais"; break;
            case 'A': $h2.innerText = "Grupo A"; break;
            case 'B': $h2.innerText = "Grupo B"; break;
            case 'C': $h2.innerText = "Grupo C"; break;
            case 'D': $h2.innerText = "Grupo D"; break;
            case 'E': $h2.innerText = "Grupo E"; break;
            case 'F': $h2.innerText = "Grupo F"; break;
            case 'G': $h2.innerText = "Grupo G"; break;
            case 'H': $h2.innerText = "Grupo H"; break;
        }
        $jogos.forEach(async $j => {
            $j.style.display = "none";
            await $j.is_ready();
            if (criterios.grupo) {
                if ($j.jogo.grupo.startsWith(criterios.grupo.toUpperCase())) {
                    $j.style.display = "block";
                } else {
                    $j.style.display = "none";
                }
            }

            else if (criterios.prazo) {
                let today = new Date().toISOString().slice(0, 10);
                if ($j.jogo.hora >= today && $j.jogo.hora <= criterios.prazo) {
                    $j.style.display = "block";
                    switch (criterios.dias) {
                        case '1': $h2.innerText = "Jogos de hoje"; break;
                        case '2': $h2.innerText = "Jogos até amanhã"; break;
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9':
                            $h2.innerText = `Jogos em até ${criterios.dias} dias`;
                            break;
                    }
                } else {
                    $j.style.display = "none";
                }
            }

            else {
                $h2.innerText = "Tabela completa";
                $j.style.display = "block";
            }
        });
    }

}

async function view_perfil(id_hash) {
    let [ranking, palpites] = await Promise.all([
        bolao.get_ranking(),
        bolao.get_palpites()
    ]);
    view_header(udata);
    window.scrollTo(0,0);
    let $main = document.querySelector("main");
    let nick = ranking[id_hash].nick;
    $main.innerHTML = `
        <h2 id="nick">${nick}</h2>
        <table id="tab-perfil">
            <tr>
                <th id="col-jogo">Jogo e palpite</th>
                <th class="center" id="col-palpite">Placar</th>
                <th class="center" id="col-pontos">Pontos</th>
            </tr>
        </table>
    `;
    let tab_perfil = [];
    Object.keys(palpites[id_hash].palpites).forEach(jid => {
        let palpite = palpites[id_hash].palpites[jid];
        let pontos = ranking[id_hash].pontos[jid];
        tab_perfil.push([jid, palpite, pontos]);
    })

    let $tab_perfil = $main.querySelector("#tab-perfil");
    tab_perfil.forEach(async ([jid, palpite, pontos]) => {
        let $tr = document.createElement('tr');
        $tr.innerHTML = `
            <td><bolao-jogo class="perfil" jid="${jid}"></bolao-jogo></td>
            <td id="placar" class="center"></td>
            <td class="center">${pontos || ""}</td>
        `;
        $tab_perfil.appendChild($tr);
        let $jogo = $tr.querySelector("bolao-jogo");
        $jogo.mini = true;
        [$jogo.palpite1, $jogo.palpite2] = palpite.split(" ");
        let placar = await $jogo.get_placar();
        let $placar = $tr.querySelector("#placar");
        $placar.innerText = placar?.replace(" ", " × ") || "";
    });
    $main.appendChild($tab_perfil);

    let $col_jogo = $tab_perfil.querySelector("#col-jogo");
    let $col_pontos = $tab_perfil.querySelector("#col-pontos");
    let ordem = -1;
    let _coluna = 2;
    $col_jogo.addEventListener('click', ev => {_coluna = 0; ordena_tabela(ev)});
    $col_jogo.classList.add('clicavel');
    $col_pontos.addEventListener('click', ev => {_coluna = 2; ordena_tabela(ev)});
    $col_pontos.classList.add('clicavel');

    function ordena_tabela(ev) {
        tab_perfil.sort(function (l1, l2) {
            if (l1[_coluna] == '') {
                return 1;
            } else if (l2[_coluna] == '') {
                return -1;
            }
            return ordem * (Number(l1[_coluna]) - Number(l2[_coluna]));
        });
        ordem = -1 * ordem;
        update_tabela();
    }

    function update_tabela() {
        for (let i=$tab_perfil.rows.length - 1; i>0; i--) {
            let $row = $tab_perfil.rows[i];
            $row.remove();
        }

        tab_perfil.forEach(async ([jid, palpite, pontos]) => {
            let $tr = document.createElement('tr');
            $tr.innerHTML = `
                <td><bolao-jogo class="perfil" jid="${jid}"></bolao-jogo></td>
                <td id="placar" class="center"></td>
                <td class="center">${pontos || ""}</td>
            `;
            $tab_perfil.appendChild($tr);
            let $jogo = $tr.querySelector("bolao-jogo");
            $jogo.mini = true;
            [$jogo.palpite1, $jogo.palpite2] = palpite.split(" ");
            let placar = await $jogo.get_placar();
            let $placar = $tr.querySelector("#placar");
            $placar.innerText = placar?.replace(" ", " × ") || "";
            $tab_perfil.appendChild($tr);
        });
        $main.appendChild($tab_perfil);
    }
}

async function view_jogo(jid) {
    let [udata, jogo, ranking, palpites] = await Promise.all([
        bolao.userdata(get_pidx()),
        bolao.get_jogo(jid),
        bolao.get_ranking(),
        bolao.get_palpites()
    ]);

    view_header(udata);
    window.scrollTo(0,0);
    let $main = document.querySelector("main");
    $main.innerHTML = `
        <div id="fixed"></div>
        <table id="tab-palpites">
            <tr>
                <th id="col-id">ID</th>
                <th id="col-nome">Nome</th>
                <th id="col-palpite">Palpite</th>
                <th id="col-pontos">Pontos</th>
            </tr>
        </table>
    `;

    let $fixed = $main.querySelector("#fixed");
    let $jogo = document.createElement("bolao-jogo");
    let palpite = (await bolao.get_palpite_salvo(udata.email, get_pidx(), String(jid)))
                  || (await bolao.get_palpite_rascunho(get_pidx(), String(jid)))
                  || "0 0";
    [$jogo.palpite1, $jogo.palpite2] = palpite.split(" ");
    $jogo.setAttribute("jid", `${jid}`);
    $fixed.appendChild($jogo);
    $jogo.addEventListener('click', () => {location = '#';});
    $jogo.update();
    if (udata.perfil.id_hash) {
        $jogo.pontos_r1 = ranking[udata.perfil.id_hash].pontos[jid];
        if (typeof $jogo.pontos_r1 == 'undefined') {
            $jogo.pontos_r1 = "?";
        }
    }

    let tab_palpites = [];
    Object.keys(palpites).forEach(id_hash => {
        let nick = palpites[id_hash].nick || "";
        let palpite = palpites[id_hash].palpites[jid];
        let pontos = ranking[id_hash].pontos[jid];
        if (typeof pontos == 'undefined') {
            pontos = "";
        }
        tab_palpites.push([id_hash, nick, palpite, pontos]);
    })

    let $tab_palpites = $main.querySelector("#tab-palpites");
    let $col_nome = $tab_palpites.querySelector("#col-nome");
    let $col_palpite = $tab_palpites.querySelector("#col-palpite");
    update_tabela();

    // adiciona controllers pra ordenar a tabela
    function update_tabela() {
        for (let i=$tab_palpites.rows.length - 1; i>0; i--) {
            let $row = $tab_palpites.rows[i];
            $row.remove();
        }

        tab_palpites.forEach(([id_hash, nick, palpite, pontos]) => {
            let $tr = document.createElement('tr');
            $tr.innerHTML = `
                <td>${id_hash.slice(0, 5)}</td>
                <td><a href="#/p/${id_hash}">${nick || "(sem nome)"}</a></td>
                <td>${palpite?.replace(" ", " x ") || "indisponível"}</td>
                <td>${pontos}</td>
            `;
            $tab_palpites.appendChild($tr);
        });
        $main.appendChild($tab_palpites);
    }

    function ordena_tabela(ev) {
        tab_palpites.sort(function (l1, l2) {
            if (l1[_coluna] == '') {
                return 1;
            } else if (l2[_coluna] == '') {
                return -1;
            }
            return ordem * l1[_coluna].localeCompare(l2[_coluna]);
        });
        ordem = -1 * ordem;
        update_tabela();
    }

    let ordem = 1;
    let _coluna = 1;
    $col_nome.addEventListener('click', ev => {_coluna = 1; ordena_tabela(ev)});
    $col_nome.classList.add('clicavel');
    $col_palpite.addEventListener('click', ev => {_coluna = 2; ordena_tabela(ev)});
    $col_palpite.classList.add('clicavel');

}

async function view_ranking(n, rid = "r1") {
    let udata = await bolao.userdata(get_pidx());
    n = n || udata.n_atual;

    let [evolucao, ranking] = await Promise.all([
        bolao.get_evolucao(rid),
        bolao.get_ranking(n, rid),
    ]);

    view_header(udata);
    window.scrollTo(0,0);
    let $main = document.querySelector("main");
    let n_rank = rid == 'r1' ? n : n - 48;
    $main.innerHTML = `
      <h2>Ranking ${rid[1]} após ${n_rank} jogos<span id="filtra-favoritos" class="star">★</span></h2>
      <p id="rank_aviso">* Em ordem de desempate pelos critérios estabelecidos.</p>
      <div id="fixed">
      <table id="tab-ranking">
        <colgroup>
          <col style="width:5%;">
          <col style="width:5%;">
          <col style="width:55%;">
          <col style="width:5%;">
          <col style="width:30%;">
        </colgroup>
        <tr>
          <th id="col-id">ID</th>
          <th id="col-rank" class="center">Rank</th>
          <th id="col-nick">Nome</th>
          <th id="col-pontos" class="center">Pontos</th>
          <th id="col-calculo">Cálculo</th>
        </tr>
      </table>
    `;

    let tab_ranking = [];
    window.tab_ranking = tab_ranking;
    Object.keys(ranking).forEach(id_hash => {
        if (id_hash[0] == '~') {
            return;
        }
        let nick = ranking[id_hash].nick || "";
        let pontos = ranking[id_hash].total_pontos;
        let rank = ranking[id_hash].rank;
        let delta = evolucao[id_hash].rank[n_rank - 2] - evolucao[id_hash].rank[n_rank - 1];
        let sinal = delta > 0 ? "▲" : (delta < 0 ? "▼" : "");
        const contagem = {};
        for (const num of Object.values(ranking[id_hash].pontos)) {
          contagem[num] = contagem[num] ? contagem[num] + 1 : 1;
        }
        let calculo = [];
        let decimal = "";
        for (const pts of ["6", "3", "2"]) {
            if (contagem[pts]) {
                calculo.push(`${contagem[pts]}<span class="tipo-ponto">×${pts}</span>`)
            }
            decimal += `${contagem[pts] || 0}`.padStart(2, "0");
        }
        pontos += Number('0.' + decimal);
        contagem["6"] + contagem["3"] + contagem["2"]
        let num_setas = Math.abs(delta);
        let setas;
        if (delta > 0) {
            setas = `<span class="setas verde">${sinal.repeat(num_setas)}</span>`;
            delta = ` <span class="delta"> +${Math.abs(delta)}</span>`;
        } else if (delta < 0) {
            setas = `<span class="setas vermelha">${sinal.repeat(num_setas)}</span>`;
            delta = ` <span class="delta"> -${Math.abs(delta)}</span>`;
        } else {
            setas = ``;
            delta = ``;
        }
        tab_ranking.push([id_hash, rank, nick, pontos, calculo.join(" + "), delta, setas]);
    })
    let $tab_ranking = $main.querySelector("#tab-ranking");
    let $col_rank = $tab_ranking.querySelector("#col-rank");
    let $col_nick = $tab_ranking.querySelector("#col-nick");
    let $col_pontos = $tab_ranking.querySelector("#col-pontos");
    let $filtra_favoritos = $main.querySelector("#filtra-favoritos");
    let favoritos = JSON.parse(localStorage.getItem("favoritos")) || {};
    let filtra_favoritos = localStorage.getItem('filtra_favoritos') == "true";
    $filtra_favoritos.addEventListener('click', () => {
        filtra_favoritos = !filtra_favoritos;
        localStorage.setItem("filtra_favoritos", filtra_favoritos);
        update_tabela();
    });
    let ordem = -1;
    let _coluna = 3;
    ordena_tabela();
    update_tabela();

    // adiciona controllers pra ordenar a tabela
    function update_tabela() {
        if (filtra_favoritos) {
            $filtra_favoritos.classList.add("gold");
        } else {
            $filtra_favoritos.classList.remove("gold");
        }
        for (let i=$tab_ranking.rows.length - 1; i>0; i--) {
            let $row = $tab_ranking.rows[i];
            $row.remove();
        }

        tab_ranking.forEach(([id_hash, rank, nick, pontos, calculo, delta, setas]) => {
            let $tr = document.createElement('tr');
            let cor = favoritos[id_hash] ? 'gold' : 'cinza';
            $tr.innerHTML = `
                <td>${id_hash.slice(0, 5)}</td>
                <td class="center">${rank}</td>
                <td>
                    <span id="marca-favorito" class="star ${cor}">★</span>
                    <span class="nome">
                    <a href="#/p/${id_hash}">
                    ${nick || "(sem nome)"}</a></span>
                    <br>${delta} ${setas}
                </td>
                <td class="center">${pontos.toFixed(0)}</td>
                <td>${calculo}</td>
            `;
            let $star = $tr.querySelector("#marca-favorito");
            $star.addEventListener('click', () => {
                console.log("favoritando: ", id_hash);
                favoritos[id_hash] = !favoritos[id_hash];
                if (favoritos[id_hash]) {
                    $star.classList.add("gold");
                    $star.classList.remove("cinza");
                } else {
                    $star.classList.remove("gold");
                    $star.classList.add("cinza");
                }
                localStorage.setItem("favoritos", JSON.stringify(favoritos));
            });
            $tab_ranking.appendChild($tr);
            if (filtra_favoritos && !favoritos[id_hash]) {
                $tr.style.display = 'none';
            } else {
                $tr.style.display = '';
            }
        });
        $main.appendChild($tab_ranking);
    }

    function ordena_tabela(ev) {
        tab_ranking.sort(function (l1, l2) {
            if (l1[_coluna] == '') {
                return 1;
            } else if (l2[_coluna] == '') {
                return -1;
            }
            if (typeof l1[_coluna] == 'string') {
                return ordem * l1[_coluna].localeCompare(l2[_coluna]);
            } else {
                return ordem * (l1[_coluna] - l2[_coluna]);
            }
        });
        ordem = -1 * ordem;
        update_tabela();
    }

    $col_nick.addEventListener('click', ev => {_coluna = 2; ordena_tabela(ev)});
    $col_nick.classList.add('clicavel');
    $col_pontos.addEventListener('click', ev => {_coluna = 3; ordena_tabela(ev)});
    $col_pontos.classList.add('clicavel');
    $col_rank.addEventListener('click', ev => {_coluna = 1; ordena_tabela(ev)});
    $col_rank.classList.add('clicavel');
}

function view_not_found(route) {
    view_header(null);
    let $main = document.querySelector("main");
    $main.innerHTML = `
        <div id="center-float">
            <p>página não encontrada: ${route}</p>
        </div>
    `;
}

function download_curlrc() {
    let $a = document.createElement('a');
    let curlrc = `-H "Authorization: Bearer ${idToken}"`;
    let download_data = "data:text/json;charset=utf-8," + encodeURIComponent(curlrc);
    $a.setAttribute("href", download_data);
    $a.setAttribute("download", "curlrc.txt");
    $a.click();
}

async function libera_palpites() {
    console.log("solicitando liberação de palpites ao servidor...");
    let headers = {"Authorization": `Bearer ${window.idToken}`};
    let data = await (await fetch(`${API}/coleta`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({"final": true})
    })).json();
    console.log("resultados da liberação de palpites:");
    console.log(data);
}
