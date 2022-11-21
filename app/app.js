import { watch_login_status, login, logout } from './auth.js';
import { API } from './config.js';
import * as views from './views.js';
import { now_ts, seconds2str, parse_token } from './utils.js';
import * as bolao from './bolao.js';

const BASE_PATH = location.host.startsWith('www.dsc.ufcg.edu.br') ?  '/~dalton/fb' : '';

main();

function main() {

    // redireciona pra URL indicando o pidx
    let pidx = get_pidx();

    // instala o watch do status de login
    // - invoca go_to_location_route cada vez que o usuário loga
    // - invoca view_login_screen cada vez que usuário desloga
    // user is logged in or call view_login_screen otherwise
    watch_login_status(go_to_location_route, view_login_screen);

    window.addEventListener('hashchange', function (event) {
        console.log(location.href);
        go_to_location_route();
    });

    window.addEventListener("focus", function() {
        // usuário retornou à aba
        if (!window._blur_time) {
            return;
        }
        let tempo_off = new Date().getTime() - window._blur_time;
        console.log(`Tempo afastado: ${tempo_off / 1000} segundos.`);
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

    var mq = window.matchMedia("(max-width: 1200px)")
    function myFunction(mq) {
      view_main();
      if (mq.matches) { // If media query matches
        document.body.style.backgroundColor = "red";
      } else {
        document.body.style.backgroundColor = "black";
      }
    }
    mq.addListener(myFunction)
}

function get_pidx() {
    return localStorage.getItem('pidx') || '0';
}

let _cron_interval_handler;
function view_header(udata) {
    udata = udata || window.udata;
    // elementos dinâmicos do header
    let $perfil = document.querySelector("#perfil");
    let $muda_perfil = document.querySelector("#muda-perfil");
    let $goto_ranking = document.querySelector("#goto-ranking");
    let $cron = document.querySelector("#cron");
    let $logout = document.querySelector("#logout");
    let $home = document.querySelector("#home");

    // pro caso de não haver usuário logado/detectado
    if (!udata?.email) {
        $perfil.style.display = "none";
        $cron.innerText = "";
        $muda_perfil.style.display = "none";
        $logout.style.display = "none";
        return;
    } else {
        $perfil.style.display = "block";
        $muda_perfil.style.display = "inline-block";
        $logout.style.display = "inline-block";
    }

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

    $goto_ranking.addEventListener('click', async () => {
        location = `${BASE_PATH}/#/r1`;
    });

    $muda_perfil.addEventListener('click', async () => {
        let pidx = `${(Number(get_pidx()) + 1) % udata.num_perfis}`;
        localStorage.setItem('pidx', pidx);
        location.reload(true);
    });

    // se já tem interval handler, retorna
    if (_cron_interval_handler) {
        return;
    }

    // exibe e instala cronômetro
    _cron_interval_handler = setInterval(() => {
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
    }, 1000);
}

function view_login_screen() {
    view_header(null);
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

function go_to_location_route() {
    // ativa as views para a rota atual (url) no browser
    let route = location.hash || "#/";
    let path = route.split("/").slice(1);
    let view_selector = path[0];
    if (view_selector === 'p') {
        let perfil = path[1];
        views.view_perfil(perfil);
        return;
    } else if (view_selector === 'j') {
        let jid = path[1];
        view_jogo(jid);
        return;
    } else if (view_selector === 'r1') {
        let n = path[1];
        view_ranking1(n);
        return;
    } else if (view_selector === '') {
        let jogo = path[1];
        view_main();
        return;
    } else {
        view_not_found(route.slice(1));
    }
}

async function view_main(reload = false) {
    // ajusta as views da view base/principal do site
    // - header: contador + perfil + menu
    // - main: tabela da copa + placares + palpites + pontos + rascunho
    let $main = document.querySelector("main");
    let $perfil = document.querySelector("#perfil");
    $main.innerHTML = '';
    $perfil.value = '';
    let pidx = get_pidx();
    let udata = await bolao.userdata(pidx, reload);
    view_header(udata);
    if (udata.code == '400') {
        alert("Usuário não cadastrado no bolão. Entre em contato com a organização.");
        logout();
        return;
    }
    if (udata.code == '403') {
        alert("Servidor fora do ar. Entre em contato com a organização.");
        console.error(udata);
        logout();
        return;
    }
    if ('code' in udata) {
        console.error(udata);
        alert("Servidor fora do ar. Entre em contato com a organização.");
        logout();
        return;
    }
    let rascunho = udata?.perfil?.rascunho || {};
    let palpites = await bolao.get_palpites();
    let id_perfil = `${udata.email}:${udata.pidx}`;
    let $jogos = [];
    for (let jid=1; jid<=48; jid++) {
        let $jogo = document.createElement("bolao-jogo");
        $jogo.pidx = pidx;
        $jogos.push($jogo);
        $jogo.setAttribute("jid", `${jid}`);
        let palpite = (await bolao.get_palpite_salvo(udata.email, pidx, String(jid)))
                      || (await bolao.get_palpite_rascunho(pidx, String(jid)))
                      || "0 0";
        [$jogo.palpite1, $jogo.palpite2] = palpite.split(" ");
        $jogo.addEventListener('novo-palpite', async function (ev) {
            let res = await bolao.salva_palpite(udata.email, udata.pidx, ev.detail);
            console.log(res);
        });
        $jogo.addEventListener('click', async ev => {
            location = `${BASE_PATH}/#/j/${jid}`;
        });
        $main.appendChild($jogo);
    }
    let $logout = document.querySelector("#logout");
    $logout.addEventListener("click", () => {
        logout();
    });
    setInterval(() => {
        $jogos.forEach($j => { $j.update(); });
    }, 500);

    function filtra_jogos(criterios) {
        $jogos.forEach($j => {
            $j.style.display = "block";
            if (criterios.grupo && !$j.jogo.grupo.startsWith(criterios.grupo)) {
                $j.style.display = "none";
            }
            let resp = $j.jogo.hora < criterios.prazo;
            if (criterios.prazo && $j.jogo.hora > criterios.prazo) {
                $j.style.display = "none";
            }
        });
    }

    let filtros = [];
    let criterios = {};
    document.body.addEventListener('keyup', ev => {
        if (ev.key.length == 1 && /^[abcdefghoqsxABCDEFGHOQSX]+$/.test(ev.key)) {
            let grupo = ev.key.toUpperCase();
            if (criterios.grupo == grupo) {
                delete criterios.grupo;
            } else {
                criterios.grupo = ev.key.toUpperCase();
            }
        }
        else if (ev.key.length == 1 && ev.key == '*') {
            delete criterios.grupo;
        }
        else if (ev.key.length == 1 && /^[0-9]+$/.test(ev.key)) {
            // mostrar todos nos próximos N dias
            delete criterios.grupo;
            delete criterios.state;
            let N = Number(ev.key);
            if (N === 0) {
                delete criterios.prazo;
            } else {
                let now = new Date();
                let prazo = new Date(now.getTime() + N * 24 * 60 * 60 * 1000);
                criterios.prazo = prazo.toISOString().slice(0, 10);
            }
        }
        else if (ev.key.length == 1 && /^:$/.test(ev.key)) {
            if (window._download == 2) {
                download_curlrc();
                delete window._download;
            } else {
                window._download = (window._download || 0) + 1;
                setTimeout(() => {delete window._download;}, 1000);
            }
        }
        filtra_jogos(criterios);
    });

}

async function view_jogo(jid) {
    window.scrollTo(0,0); 
    let jogo = bolao.get_jogo(jid);
    let $main = document.querySelector("main");
    $main.innerHTML = `
      <div id="fixed">

            <div id="card">
                <div id="jid">Jogo ${jid}<br>Grupo ${jogo.grupo}</div>
                <div id="pais1">
                    <span id="sigla1">${jogo.time1}</span>
                    <span id="nome1">${jogo.nome1}</span>
                    <img id="band1" src="${jogo.band1}?tx=w_30">
                </div>
                <div id="inputs">
                    s1
                    &times;
                    s2
                </div>
                <div id="pais2">
                    <img id="band2" src="${jogo.band2}?tx=w_30">
                    <span id="nome2">${jogo.nome2}</span>
                    <span id="sigla2">${jogo.time2}</span>
                </div>
                <div id="extras" style="text-align: right;">
                    <span id="hora">${jogo._localeDate}</span><br>
                    <span id="hora">${jogo._localeTime}</span><br>
                    <span id="local">${jogo.local}</span>
                </div>
            </div>
            <div id="info-msg">
                <div id="info" style="display: none;">
                    Placar: <span id="placar1"></span>&times;<span id="placar2"></span><br>
                    Pontos acumulados: <span id="pontos">?</span><br>
                </div>
            </div>
      </div>
      <table id="tab-palpites">
        <tr>
          <th id="col-id">ID</th>
          <th id="col-nome">Nome</th>
          <th id="col-palpite">Palpite</th>
          <th id="col-pontos">Pontos</th>
        </tr>
      </table>
    `;

    let palpites = await bolao.get_palpites();
    window.palpites = palpites;

    let tab_palpites = [];
    Object.keys(palpites).forEach(id_hash => {
        let nick = palpites[id_hash].nick || "";
        let palpite = palpites[id_hash].palpites[jid];
        let pontos = palpites[id_hash].pontos[jid];
        tab_palpites.push([id_hash, nick, palpite, pontos]);
    })
    window.tab_palpites = tab_palpites;
    let $tab_palpites = $main.querySelector("#tab-palpites");
    let $col_nome = $tab_palpites.querySelector("#col-nome");
    let $col_palpite = $tab_palpites.querySelector("#col-palpite");
    update_tabela();

    // adiciona controllers pra ordenar a tabela
    window.update_tabela = update_tabela;
    window.$t = $tab_palpites;
    function update_tabela() {
        console.log('atualizando a tab_palpites!!!!');
        for (let i=$tab_palpites.rows.length - 1; i>0; i--) {
            let $row = $tab_palpites.rows[i];
            $row.remove();
        }

        tab_palpites.forEach(([id_hash, nick, palpite, pontos]) => {
            let $tr = document.createElement('tr');
            $tr.innerHTML = `
                <td>${id_hash.slice(0, 5)}</td>
                <td>${nick}</td>
                <td>${palpite?.replace(" ", " x ") || "indisponível"}</td>
                <td>${pontos}</td>
            `;
            $tab_palpites.appendChild($tr);
        });
        $main.appendChild($tab_palpites);
    }


    function ordena_tabela(ev) {
        console.log('clicou pra ordenar!!!!');
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
    $col_palpite.addEventListener('click', ev => {_coluna = 2; ordena_tabela(ev)});

}

async function view_ranking1(n = 3) {
    // default n => ranking-3.json
    window.scrollTo(0,0); 
    let $main = document.querySelector("main");
    $main.innerHTML = `
      <div id="fixed">
      <table id="tab-ranking">
        <colgroup>
          <col style="width:10%">
          <col style="width:10%">
          <col style="width:40%">
          <col style="width:10%">
          <col style="width:30%">
        </colgroup>
        <tr>
          <th id="col-id">ID</th>
          <th id="col-rank">Rank</th>
          <th id="col-nick">Nome</th>
          <th id="col-pontos">Pontos</th>
          <th id="col-calculo">Cálculo</th>
        </tr>
      </table>
    `;

    let ranking = await bolao.get_ranking1(n);
    let tab_ranking = [];
    Object.keys(ranking).forEach(id_hash => {
        let nick = ranking[id_hash].nick || "";
        let pontos = ranking[id_hash].total_pontos;
        let rank = ranking[id_hash].rank;
        const contagem = {};
        for (const num of Object.values(ranking[id_hash].pontos)) {
          contagem[num] = contagem[num] ? contagem[num] + 1 : 1;
        }
        let calculo = [];
        for (const pts of ["6", "3", "2"]) {
            if (contagem[pts]) {
                calculo.push(`${contagem[pts]}×${pts}`)
            }
        }
        tab_ranking.push([id_hash, rank, nick, pontos, calculo.join(" + ")]);
    })
    window.tab_ranking = tab_ranking;
    let $tab_ranking = $main.querySelector("#tab-ranking");
    let $col_rank = $tab_ranking.querySelector("#col-rank");
    let $col_nick = $tab_ranking.querySelector("#col-nick");
    let $col_pontos = $tab_ranking.querySelector("#col-pontos");
    update_tabela();
    let ordem = 1;
    let _coluna = 1;
    ordena_tabela();

    // adiciona controllers pra ordenar a tabela
    window.update_tabela = update_tabela;
    window.$t = $tab_ranking;
    function update_tabela() {
        console.log('atualizando a tab_ranking!!!!');
        for (let i=$tab_ranking.rows.length - 1; i>0; i--) {
            let $row = $tab_ranking.rows[i];
            $row.remove();
        }

        tab_ranking.forEach(([id_hash, rank, nick, pontos, calculo]) => {
            let $tr = document.createElement('tr');
            $tr.innerHTML = `
                <td>${id_hash.slice(0, 5)}</td>
                <td>${rank}</td>
                <td>${nick}</td>
                <td>${pontos}</td>
                <td>${calculo}</td>
            `;
            $tab_ranking.appendChild($tr);
        });
        $main.appendChild($tab_ranking);
    }

    function ordena_tabela(ev) {
        console.log('clicou pra ordenar!!!!');
        tab_ranking.sort(function (l1, l2) {
            if (l1[_coluna] == '') {
                return 1;
            } else if (l2[_coluna] == '') {
                return -1;
            }
            if (typeof l1[_coluna] == 'string') {
                return ordem * l1[_coluna].localeCompare(l2[_coluna]);
            } else {
                return ordem * l1[_coluna] - l2[_coluna];
            }
        });
        ordem = -1 * ordem;
        update_tabela();
    }

    $col_nick.addEventListener('click', ev => {_coluna = 2; ordena_tabela(ev)});
    $col_pontos.addEventListener('click', ev => {_coluna = 3; ordena_tabela(ev)});
    $col_rank.addEventListener('click', ev => {_coluna = 1; ordena_tabela(ev)});
}

function view_not_found(route) {
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
