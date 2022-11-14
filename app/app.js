import { watch_login_status, login, logout } from './auth.js';
import { API } from './config.js';
import * as views from './views.js';
import { now_ts } from './utils.js';
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
    let $cron = document.querySelector("#cron");

    // pro caso de não haver usuário logado/detectado
    if (!udata?.email) {
        $perfil.innerText = "";
        $cron.innerText = "";
        return;
    }

    // exibe email do usuário
    $perfil.innerText = udata.perfil?.nick;
    $perfil.addEventListener('click', () => {
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
            $cron.innerText = String(Math.floor(window.tempo));
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
    for (let jid=1; jid<=64; jid++) {
        let $jogo = document.createElement("bolao-jogo");
        $jogo.setAttribute("jid", `${jid}`);
        let rascunho = udata?.perfil?.rascunho || {};
        if (Object.keys(rascunho).includes(String(jid))) {
            let [palp1, palp2] = udata.perfil.rascunho[jid].split(" ");
            $jogo.palpite1 = palp1;
            $jogo.palpite2 = palp2;
        } else {
            $jogo.palpite1 = "0";
            $jogo.palpite2 = "0";
        }
        $jogo.addEventListener('novo-placar', async function (ev) {
            let res = await bolao.salva_palpite(udata.email, udata.pidx, ev.detail);
            console.log(res);
        });
        $main.appendChild($jogo);
    }
    let $logout = document.querySelector("#logout");
    $logout.addEventListener("click", () => {
        logout();
    });
}

function view_not_found() {
    $main.innerHTML = `
        <h1>não achado!</h1>
    `;
}
