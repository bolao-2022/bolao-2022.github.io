export function now_ts() {
    return to_ts(new Date());
}

export function to_ts(date) {
    return date.getTime() / 1000;
}

export function from_ts(ts) {
    return new Date(ts * 1000);
}
