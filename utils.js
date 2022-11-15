export function now_ts() {
    return to_ts(new Date());
}

export function to_ts(date) {
    return date.getTime() / 1000;
}

export function from_ts(ts) {
    return new Date(ts * 1000);
}

export function seconds2str (total_segundos) {
    function numberEnding (number) {
        return (number > 1) ? 's' : '';
    }

    let temp = Math.floor(total_segundos);
    let dias = Math.floor((temp %= 31536000) / 86400);
    let horas = Math.floor((temp %= 86400) / 3600);
    let minutos = Math.floor((temp %= 3600) / 60);
    let segundos = temp % 60;

    if (dias) {
        return `${dias} dia${numberEnding(dias)}, ${horas}h ${minutos}m ${segundos}s`;
    } else {
        return `${horas}h ${minutos}m ${segundos}s`;
    }
}

export function parse_token(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
