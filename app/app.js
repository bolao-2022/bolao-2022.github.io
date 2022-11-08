import { watch_login_status, login, logout } from './auth.js';
import { API } from './config.js';
import * as views from './views.js';

// identify main element in DOM
let $main = document.querySelector("main");

// watch user login status and either call go_to_route if a
// user is logged in or call view_login_screen otherwise
watch_login_status(go_to_route, view_login_screen);

// watch for url location changes
window.addEventListener('popstate', function (event) {
    console.log(location.href);
    go_to_route();
});


var mq = window.matchMedia("(max-width: 1200px)")
function myFunction(mq) {
  route_main();
  if (mq.matches) { // If media query matches
    document.body.style.backgroundColor = "red";
  } else {
    document.body.style.backgroundColor = "black";
  }
}
mq.addListener(myFunction)

function view_header() {
    let $perfil = document.querySelector("#perfil");
    $perfil.innerText = window.user.email;
}

function view_login_screen() {
    $main.innerHTML = `
        <div id="login-screen">
            <p>Sign in with Google</p>
        </div>
    `;
    let $login = document.querySelector("#login-screen p");
    $login.addEventListener("click", () => {
        $login.innerText = 'aguarde...';
        login();
    });
}

function go_to_route() {
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
        route_main();
    }
}

function route_main() {
    view_header();
    $main.innerHTML = '';
    for (let jid=1; jid<=64; jid++) {
        let $jogo = document.createElement("bolao-jogo");
        $jogo.setAttribute("jid", `${jid}`);
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

