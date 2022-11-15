import { watch_login_status, login, logout } from './auth.js';
import { API } from './config.js';
import * as views from './views.js';
import { now_ts, seconds2str, parse_token } from './utils.js';
import * as bolao from './bolao.js';

const BASE_URL = '/~dalton/fb'

// identify main element in DOM
let $main = document.querySelector("main");

main();

function main() {

    // redireciona pra URL indicando o pidx
    let pidx = get_pidx();
    if (! /\d+$/.test(pidx)) {
       location = '/~dalton/fb/#/0'; 
    }

    // instala o watch do status de login
    // - invoca go_to_route cada vez que o usuário loga
    // - invoca view_login_screen cada vez que usuário desloga
    // user is logged in or call view_login_screen otherwise
    watch_login_status(go_to_route, view_login_screen);

    // instala watch para mudanças da URL no browser
    // - invoca go_to_route()
    window.addEventListener('popstate', function (event) {
        console.log(location.href);
        if (pidx != get_pidx()) {
            location.reload(true);
        }
    });

    window.addEventListener("focus", function() {
        // usuário retornou à aba
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
        window._blur_time = new Date().getTime();
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
    let pidx = location.hash.split("/")[1];
    return pidx;
}

let _cron_interval_handler;
function view_header(udata) {
    // elementos dinâmicos do header
    let $perfil = document.querySelector("#perfil");
    let $muda_perfil = document.querySelector("#muda-perfil");
    let $cron = document.querySelector("#cron");

    // pro caso de não haver usuário logado/detectado
    if (!udata?.email) {
        $perfil.value = "";
        $cron.innerText = "";
        return;
    }

    // exibe email do usuário
    $perfil.value = udata.perfil?.nick;
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

    $muda_perfil.addEventListener('click', () => {
        let pidx = `${(Number(get_pidx()) + 1) % udata.num_perfis}`;
        location = `/~dalton/fb/#/${pidx}`; 
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

function go_to_route() {
    // ativa as views para a rota atual (url) no browser
    let path = location.hash.split("/").slice(1);
    if (path[0] === 'p') {
        let perfil = path[1];
        views.view_perfil(perfil);
        return;
    } else if (path[0] === 'j') {
        let jogo = path[1];
        views.view_jogo(jogo);
        return;
    } else {
        view_main();
    }
}

async function view_main() {
    // ajusta as views da view base/principal do site
    // - header: contador + perfil + menu
    // - main: tabela da copa + placares + palpites + pontos + rascunho
    let pidx = get_pidx();
    let udata = await bolao.userdata(pidx);
    view_header(udata);
    $main.innerHTML = '';
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
        filtra_jogos(criterios);
    }); 

}

function view_not_found() {
    $main.innerHTML = `
        <h1>não achado!</h1>
    `;
}
