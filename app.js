async function main() {
    console.log("oi!");
    let resp1 = await fetch("http://localhost:8080/jogo/1");
    let jogo1 = await resp1.json();

    let resp2 = await fetch("http://localhost:8080/paises");
    let paises = await resp2.json();

    console.log(jogo1);
    let div = document.querySelector("#jogo");
    let hora = new Date(jogo1.hora * 1000);
    let pais1 = paises[jogo1.time1][0];
    let band1 = paises[jogo1.time1][1];
    let pais2 = paises[jogo1.time2][0];
    let band2 = paises[jogo1.time2][1];
    div.innerHTML = `
        <h2>Jogo ${jogo1.idj}</h2>
        <p><img src="${band1}">${pais1} X ${pais2}<img src="${band2}"></p>
        <p>${hora.toDateString()}, ${jogo1.local}</p>
    `;
}

main();
