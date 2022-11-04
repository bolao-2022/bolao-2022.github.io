# Rotas frontend

Dado que o GitHub Pages não executa código no backend que serve
as páginas precisaremos usar o `#` nas rotas de frontend, pra
evitar que sejam repassadas para o backend.

> Se forem poucas rotas, podemos usar falsas páginas nas rotas
> equivalentes no GitHub Pages, para simular o roteamento.
> Inicialmente, contudo, usaremos apenas rotas com `#`, por
> simplicidade.

- `/:setid` Um `setid` é o identificador de um conjunto de
  jogos. No caso da copa o `setid` pode ser `copa`, por exemplo.
  A rota deve dar acesso à view geral do conjunto de jogos. Isso
  deve incluir a listagem dos jogos, com os palpites do jogador
  logado (e os pontos feitos, pros jogos passados ou os campos
  editáveis, pros jogos futuros). Também deve dar acesso aos
  rankings existentes para aquele conjunto. Cada elemento deve
  dar acesso à view individual daquele elemento (subconjunto de
  jogos, jogos, rankings, e usuários). Subconjuntos de jogos têm
  seus próprios ids hierárquicos (`/#/:setid/:subsetid`), de
  forma que se possam ser considerados como pertencentes a esta
  mesma rota e possam ter a mesma estrutura de view. Quando a
  rota for acessada de um viewport pequeno, o elemento principal
  deve ser a listagem de jogos e os demais elementos podem ser
  colocados em menus (ou ao final da listagem). Em um viewport
  maior, os demais componentes pode ter algum posicionamento
  lateral ou menos central na página.

- `/:setid/:jid`. Um `jid` é o identificador de um jogo em
  particular. Esta é a view de um jogo individualmente. Se o jogo
  for futuro e ainda estiver aberto para apostas, a view deve
  permitir editar os palpites. Se já estiver fechado para
  palpites, pode estar aguardando a busca dos palpites dos demais
  jogadores. Se os palpites dos demais estiverem liberados, eles
  devem ser listados na view. Devem poder ser agrupados pelo
  valor do palpite ou alfabeticamente pelo id do palpiteiro. Se o
  jogo já tiver acontecido, ainda devem ser incluídos os pontos
  feitos por cada palpiteiro. Links devem ser incluídos em todos
  os elementos. Se um jogo for acessado por uma rota de um
  subconjunto, a rota (location) será reescrito para o nome
  canônico que não inclui o subset.

- `/:setid/ranking`. Rota para acesso direto ao ranking de um
  conjunto (ou subconjunto) de jogos. Isso permite ter acesso ao
  ranking da copa como um todo ou de qualquer subconjunto, se
  existir ranking para qualquer um deles. Se o ranking acessado
  não existir, a página apenas exibe a mensagem indicando que o
  ranking não existe (a menos que o ranking possa ser gerado a
  baixo custo sob demanda).

## exemplos de rotas

- `https://bolao-2022.github.io/#/`: acesso à página principal;
  antes da copa iniciar, deve dar acesso à página de inscrição,
  dar informações etc; depois do início deve simplesmente
  redirecionar para `/copa`.

- `https://bolao-2022.github.io/#/copa`
- `https://bolao-2022.github.io/#/copa/oitavas`
- `https://bolao-2022.github.io/#/copa/jogo/1`
- `https://bolao-2022.github.io/#/copa/ranking`
- `https://bolao-2022.github.io/#/copa/fase2/ranking`
