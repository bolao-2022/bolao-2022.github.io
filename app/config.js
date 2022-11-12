const PRODUCTION_API = "https://dev-dot-bolao-2022.appspot.com"
const DEV_API = "http://0.0.0.0:8080"
const LOCALS = ['0.0.0.0', '127.0.0.1', 'localhost'];
//export const API = LOCALS.includes(location.hostname) ? DEV_API : PRODUCTION_API;
export const API = PRODUCTION_API;
window.API = API;

export const FILES="https://storage.googleapis.com/bolao-2022.appspot.com/public"
export const tabela_versao = "0-0"

// tempo de tolerância a exibir a menos no front (em segundos)
export const MARGEM_SEGURANCA_PALPITES = 5
