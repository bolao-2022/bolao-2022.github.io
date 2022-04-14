import json

from flask import Flask
from flask import jsonify

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

FIFA = json.loads(open("fifa.json").read())
PAISES, JOGOS = FIFA["paises"], FIFA["jogos"]

@app.route('/')
def root():
    return jsonify({'msg': 'Bolão 2022!'}), 200


@app.route('/fifa')
def tabela():
    return jsonify(FIFA), 200


@app.route('/paises')
def paises():
    return jsonify(PAISES), 200


@app.route('/jogo/<jid>')
def hello(jid):
    if jid not in JOGOS:
        return jsonify({"msg": "ops"}), 404
    return jsonify(JOGOS[jid]), 200


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers',
                         'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH')
    return response

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)
