import { FILES, MARGEM_SEGURANCA_PALPITES, tabela_versao } from './config.js';
import { now_ts } from './utils.js';

import * as bolao from './bolao.js';
let tabela = await (await fetch(`${FILES}/tabela-${tabela_versao}.json`)).json()
window.tabela = tabela;

let _userdata;
export async function userdata(pidx, reload = false) {
    if (!_userdata || reload) {
        // espera haver token disponível
        await new Promise(res => {
            function checa_token() {
                if (window.idToken) {
                    res();
                    return;
                }
                setTimeout(checa_token, 100);
            }
            checa_token();
        });
        let headers = {"Authorization": `Bearer ${window.idToken}`};
        let data = await (await fetch(`${API}?pidx=${pidx}`, {headers:headers})).json();
        _userdata = preprocess_userdata(data);
        window.ud = _userdata;
    }
    return _userdata;
}

function preprocess_userdata(_userdata) {
    // STUB

    // atualiza countdown global
    window.deadline_ts = now_ts() + _userdata.tempo - MARGEM_SEGURANCA_PALPITES;
    return _userdata;
}

export async function salva_palpite(email, pidx, palpite) {
    console.log(`SALVAR palpite: ${palpite}`);
    console.log(`NO PERFIL: ${email}:${pidx}`);
    let headers = {"Authorization": `Bearer ${window.idToken}`};
    let data = await (await fetch(`${API}/palpites`, {
        method: 'POST', 
        headers: headers,
        body: JSON.stringify({pidx, ...palpite})
    })).json();
    return data;

}

export function get_jogo(jid) {
    let jogo = tabela.jogos[jid];
    if (!jogo)
        return {
           "jid": jid,
           "placar": null,
           "time1": null,
           "time2": null,
           "hora": null,
           "local": null,
           "grupo": null
        }
    // adiciona objeto Date
    jogo._hora = new Date(Date.parse(jogo.hora));
    // adiciona urls das bandeiras
    jogo.band1 = tabela.paises[jogo?.time1]?.band;
    jogo.band2 = tabela.paises[jogo?.time2]?.band;

    // adiciona nomes dos países
    jogo.nome1 = tabela.paises[jogo?.time1]?.nome;
    jogo.nome2 = tabela.paises[jogo?.time2]?.nome;
    return tabela.jogos[jid];
}

class BolaoJogo extends HTMLElement {
    constructor() {
        super();
        // só decomentar se decidirmos evoluir de
        // custom element pra um full web component
        //this.attachShadow({ mode: "open" });
        //this.$root = this.shadowRoot;
        this.$root = this;
    }
    connectedCallback() {
        this.jid = this.getAttribute("jid");
        this.jogo = bolao.get_jogo(this.jid);
        if (Number(this.jogo.jid) < 4) {
            this.jogo.placar = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
        }
        this.$root.innerHTML = `
            <div id="card">
                <div id="jid">Jogo ${this.jogo.jid}<br>Grupo ${this.jogo.grupo}</div>
                <div id="pais1">
                    <span id="sigla1">${this.jogo.time1}</span>
                    <span id="nome1">${this.jogo.nome1}</span>
                    <img id="band1" src="${this.jogo.band1}?tx=w_30">
                </div>
                <div id="inputs">
                    <input id="input1" size="2" value="${this.palpite1}">
                    &times;
                    <input id="input2" size="2" value="${this.palpite2}">
                </div>
                <div id="pais2">
                    <img id="band2" src="${this.jogo.band2}?tx=w_30">
                    <span id="nome2">${this.jogo.nome2}</span>
                    <span id="sigla2">${this.jogo.time2}</span>
                </div>
                <div id="extras" style="text-align: right;">
                    <span id="hora">${this.jogo._hora.toDateString()}</span><br>
                    <span id="local">${this.jogo.local}</span>
                </div>
            </div>
            <div id="info">
                Placar: <span id="placar">3 &times; 2</span><br>
                Pontos acumulados: <span id="pontos">6</span><br>
                <span id="msg"></span>
            </div>
        `;
        // coleta referências para os inputs
        this.$input1 = this.$root.querySelector("#input1");
        this.$input2 = this.$root.querySelector("#input2");
        this.$inputs = this.$root.querySelector("#inputs");
        this.$pontos = this.$root.querySelector("#pontos");

        // variáveis para configurar o componente
        let $card = this.$root.querySelector("#card");
        let $time1 = $card.querySelector("#time1");
        let $time2 = $card.querySelector("#time2");
        let $input1 = this.$input1;
        let $input2 = this.$input2;

        // configura componente
        $input1.addEventListener("keydown", ev => {
            if (['Backspace', 'Tab'].includes(ev.key)) {
                return;
            }
            if (ev.key.length == 1 && !/^\d$/.test(ev.key)) {
                // desabilita qualquer caractere que não seja um
                // dígito, sem proibir o uso de teclas de controle
                ev.preventDefault();
            }
            if ($input1.selectionStart == 0 && $input1.selectionEnd == 2) {
                // permite substituir completamente um palpite cujo
                // texto esteja selecionado
                return;
            }
            if ($input1.value.length == 2) {
                // desabilita a entrada, quando o palpite já tem
                // 2 caracteres
                ev.preventDefault();
            }
        });

        $input1.addEventListener("keyup", ev => {
            $input1.value = $input1.value.replace(/\D/g, '');
            let novo_palpite = Number($input1.value).toFixed(0);
            if (novo_palpite.length <= 2) {
                $input1.value = novo_palpite;
            }
        });
        let change_handler = async ev => {
            let palpite = {
                jid: this.jid,
                palpite: this.get_palpite()
            };
            let $msg = this.$root.querySelector("#msg");
            $msg.innerText = "salvando...";
            let resp = await salva_palpite(ud.email, ud.pidx, palpite);
            if (resp.ts) {
                $msg.innerText = "palpite salvo";
                setTimeout(() => {
                    $msg.innerText = "";
                }, 1000);
            } else {
                $msg.innerText = "ERRO ao salvar palpite!";
            }
            const event = new CustomEvent('novo-placar', {detail: resp});
            this.dispatchEvent(event);
            console.log(`novo palpite ${this.jid}: ${this.get_palpite()}`);
        };
        $input1.addEventListener("change", change_handler);
        $input2.addEventListener("change", change_handler);
        if (!this.placar) {
            setInterval(() => {this.update()}, 1000);
        }
    }

    get_palpite() {
        return `${this.$input1.value} ${this.$input2.value}`
    }

    esta_editavel() {
        // STUB
        return !window.site_bloqueado;
    }

    update() {
        let $input1 = this.$input1;
        let $input2 = this.$input2;
        let $inputs = this.$inputs;

        // atualiza placar
        if (this.placar) {
            $input1.value = this.jogo.placar[0];
            $input2.value = this.jogo.placar[1];
            // atualiza pontos
            // TODO:
            console.log('atualizar pontos aqui! por ora, apenas stub');
            this.$pontos = 6;
        }

        // borda piscante se tempo tá acabando
        if (window.tempo > 0 && window.tempo < 10) {
            $inputs.classList.add("alerts-border");
        } else if (window.tempo < 0) {
            $inputs.classList.remove("alerts-border");
        }

        // atualiza editabilidade
        if (this.esta_editavel()) {
            console.log("editável");
            $input1.removeAttribute("disabled");
            $input2.removeAttribute("disabled");
        } else {
            console.log("não editável");
            $input1.setAttribute("disabled", true);
            $input2.setAttribute("disabled", true);
        }
    }
}

customElements.define("bolao-jogo", BolaoJogo);
