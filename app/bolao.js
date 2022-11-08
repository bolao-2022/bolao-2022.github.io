import { FILES, tabela_versao } from './config.js';
import * as bolao from './bolao.js';
let config = await (await fetch(`${API}`)).json()
let tabela = await (await fetch(`${FILES}/tabela-${tabela_versao}.json`)).json()
window.tabela = tabela;
window.config = config;

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
        if (Number(this.jogo.jid) < 2) {
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
                    <input id="input1" size="2"> &times; <input id="input2" size="2">
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
            </div>
        `;
        let $card = this.$root.querySelector("#card");

        // coloca nomes ou sigla dos times
        var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
        let $time1 = $card.querySelector("#time1");
        let $time2 = $card.querySelector("#time2");
        let $input1 = this.$root.querySelector("#input1");
        let $input2 = this.$root.querySelector("#input2");
        if (this.jogo.placar) {
            $input1.value = this.jogo.placar[0];
            $input2.value = this.jogo.placar[1];
            $input1.setAttribute("disabled", true);
            $input2.setAttribute("disabled", true);
        } else {
            let $info = this.$root.querySelector("#info");
            //$info.innerHTML = "";
        }
        $input1.addEventListener("keydown", ev => {
            console.log(ev);
            if (ev.key.length == 1 && !/^\d$/.test(ev.key)) {
                ev.preventDefault();
            }
        });
        $input1.addEventListener("keyup", ev => {
            $input1.value = $input1.value.replace(/\D/g, '');
        });
        //setInterval(() => {this.update()}, 1000);
    }
}

customElements.define("bolao-jogo", BolaoJogo);
