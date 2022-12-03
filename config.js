const PRODUCTION_API = "https://dev-dot-bolao-2022.appspot.com"
const DEV_API = "http://0.0.0.0:8080"
const LOCALS = ['0.0.0.0', '127.0.0.1', 'localhost'];
//export const API = LOCALS.includes(location.hostname) ? DEV_API : PRODUCTION_API;
export const API = localStorage.getItem("API") || PRODUCTION_API;
window.API = API;
if (API != PRODUCTION_API) {
    let estilo = 'color: blue; font-size: 20px; background: red; padding: 2px; color: white; font-weight: bold;';
    console.log(`%cALERTA: usando ${window.API} como backend`, estilo);
}

export const FILES="https://storage.googleapis.com/bolao-2022.appspot.com/public"
export const tabela_versao = "0-0"

// tempo de tolerância a exibir a menos no front (em segundos)
export const MARGEM_SEGURANCA_PALPITES = 5;
