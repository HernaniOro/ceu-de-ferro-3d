# Cérebro do soldado, parte 1: corpo e voz (não testado)

Tarefa `cf-cerebro-soldado`. Pedido do capitão: dar ao Céu a profundidade do Defilade no "cérebro" dos NPCs e no jeito dos soldados fazerem as coisas (prisioneiros que dão informação, devolver granada, buscar abrigo, colega ferido), e depois granadas mais reais e soldados que não pareçam um bot andando no meio do nada.

No meio da tarefa o capitão pediu para pesquisar a melhor arquitetura antes de mexer na decisão (scout `cf-cerebro-pesquisa`). Esta parte 1 traz só o que não depende de como o soldado decide: a física da granada, a avaliação de abrigo como dado, os balões de fala e o empurrão e atordoamento da explosão. As decisões (devolver a granada, rastejar, render-se, pegar a arma do caído, avisar contato, corpo a corpo, reagir ao FPV) ficam para a parte 2, sobre a arquitetura que a pesquisa recomendar.

## Referência Defilade

Fontes: a [página da Steam](https://store.steampowered.com/app/5246700) ("The Small Details"), o [anúncio](https://shazoo.ru/2026/09/23/191107/anonsirovana-rts-defilade-s-fpv-dronami-i-glubokoi-simuliaciei-boia) e o [vídeo de gameplay na vila de inverno](https://shazoo.ru/2026/10/02/191756/realisticnoe-srazenie-za-zimniuiu-derevusku-v-geimplee-strategii-defilade) (Shazoo, set/out 2026). Não há devlog técnico público: o "como" abaixo é o que se vê e o que a loja diz, não o código deles.

| Comportamento | Gatilho | Decisão | O que se vê |
| --- | --- | --- | --- |
| Abrigo real | fogo inimigo chegando | o soldado lê o terreno, sem pontos de abrigo marcados: muro, veículo, janela, trincheira, escombro, árvore em pé ou caída; evita o aberto | corre e se joga atrás do objeto; desliza para o abrigo |
| Aviso aos aliados | ver o inimigo | grita onde ele está | balão de texto sobre a cabeça (ordens, "médico!") |
| Ferido | ferimento grave | rasteja sozinho até o abrigo mais perto e espera; os colegas dão fogo de cobertura e um vai buscá-lo e arrasta | rastejando; o médico leva de maca; se o médico cai, outro larga a maca e arrasta; se o resgate falha, resgate com corda |
| Granada | granada caindo perto | se joga no chão, ou pega e devolve | mergulho; arremesso de volta |
| Prisioneiros | quebrado e cercado | se rende; o capturado é interrogado na volta | a informação revelada sobre a posição do inimigo |
| Arma do caído | aliado morto perto | pega a arma; pega munição dos corpos por onde passa | o soldado se arma com a arma largada |
| Explosão | explosão perto | — | é jogado longe, alguns ficam atordoados e cambaleiam um tempo; ragdoll |
| Obstáculos | muro baixo, relevo | pula e usa a altura | pula muros, sobe obstáculos |
| Corpo a corpo | inimigo muito perto | luta de perto | corpo a corpo |
| Drone FPV | ouve o drone chegando | tenta derrubar ou se joga no último instante | atira para o alto; mergulho antes do impacto |

O que o Céu já tinha antes desta tarefa: abrigo ao ser pregado no aberto (`sqMan`, `covBest`), o exercício `fogo-distante` (#59), ferido que cai em vez de morrer e o colega que arrasta e trata, médico primeiro (`WND`, `rescue`), estabilizado e evacuação por ambulância e helicóptero (W18), fugir da granada (`sqMan`), esconder-se do drone (`dHide`, atiradores `DSHOT`), exercícios de infantaria (#36), percepção em degraus (#8), pedidos de ajuda (W9).

## O que mudou (tudo em `Céu de Ferro 3D.html`, bloco "the soldier's body and voice" no fim da parte de simulação)

- **Granada (`NADE`, por cima da granada com espoleta do `cf-casas-paredes`, #126)**: a espoleta, o quique, a rolagem e a parede (`GRN`, `nadeStep`) chegaram ao main pelo #126 enquanto eu fazia a minha; no merge fiquei com a física deles (melhor: normal da face, casco, ladeira) e tirei a minha. Esta parte acrescenta:
  - **Fundo da trincheira**: a granada que cai numa trincheira cai no fundo dela (`nadeFloor`, com `trenchAt`), dentro do chão do `nadeStep`.
  - **Cozinhar**: `m.nCook` (s) sai da espoleta no arremesso (`toss`). Ainda nenhum soldado da IA cozinha: é decisão (parte 2).
  - **Mira de arremesso**: o soldado da IA que vai jogar granada (`c.nade = 1`, o que já decidia antes) agora joga para cair num ponto (`nadeAt`, `nadeAim`): no inimigo (no chão aberto um pouco antes, 30% da distância até 6 m, pelo quique e a rolagem), numa janela do andar dele quando está num prédio (arco baixo), dentro da trincheira ou atrás do abrigo (arco alto), com erro de 6% da distância. Antes ele jogava sempre na mesma força, para onde olhava. O assalto a prédio (`bAtk`, `sqBound`) mira a janela mais próxima do prédio.
  - **Estilhaço e dobra do terreno**: numa explosão pequena (raio até 16 m), uma dobra do terreno entre a explosão e o soldado corta o dano para 35% (`nadeFold`). Paredes (`OBJS.shield`), trincheira e sacos de areia (`fortHit`) e a postura deitada (`STANCE.blast`) já cortavam.
  - **Devolver**: `nadeBack(m, b, P)` é a ação física de pegar a granada do chão e jogá-la de volta com o que resta da espoleta. Ninguém a chama ainda (decisão, parte 2).
  - **Fugir da granada**: quem corre da granada (o que já existia) agora fica longe até ela explodir, em vez de voltar ao lugar depois de 2 s.
  - **Online**: além do `f: 1` do #126, quem joga manda o resto da espoleta (`fl`, a cozinhada chega certa) e a granada devolvida (`rb`); cada cliente tira a cópia da primeira (`nadeTaken`).
- **Abrigo lido do terreno (`CVR`, `cvPick`)**: a melhor posição a até `r` m contra um inimigo em `e`, pontuada pelo que fica entre ela e ele: a linha cortada pelo terreno, parede ou mata (`los`), o que o chão dá (`coverAt`), o vão de um prédio, a sombra de um veículo parado ou casco, um lugar numa trincheira ou atrás de sacos de areia do lado, rocha ou tronco, menos a distância e o lugar de um colega. É dado para a decisão usar; ainda não está ligado a nenhuma decisão. Lê as paredes e janelas do térreo das casas pela API do `cf-casas-paredes` (`covBld`: fora da parede, dentro da janela), os vãos (`bldBays`), as trincheiras e moitas (`coverAt`, `fortSlots`, `trenchAt`). A trincheira como corredor do `cf-trincheiras-tuneis` ainda não está no main: deve entrar pelo `fortSlots`/`trenchAt` (gancho a conferir).
- **Balões de fala (`SAY`, `say`)**: um balão sobre a cabeça do soldado por 2,4 s, uma fala a cada 2,5 s no máximo, visto até 140 m (o do inimigo só enquanto ele é percebido). Já falam: o líder ao começar um exercício ("Ao chão!", "Blindado!", "Artilharia!", "Fogo de longe!", "Por lances!", "Recuar!" etc., `SAYDR`), quem cai ferido ("Médico!"), quem vai buscá-lo ("Vou buscá-lo!"), quem joga granada ("Lá vai granada!") ou fumaça ("Fumaça!"). Online, o código da fala vai na linha do soldado do anfitrião (último campo, `k + 32 * hora`); o convidado só vê o que o anfitrião manda.
- **Empurrão e atordoamento (`STUN`)**: a explosão joga o soldado para longe dela (até 2,2 m, menos deitado, nunca dentro de trincheira nem através de parede) e o deixa atordoado até 3,5 s, mais perto e maior a explosão. O soldado da IA atordoado mira pior, não atira no começo, não corre e cambaleia. Cada cliente empurra só quem ele move (o próprio jogador e, no anfitrião, a IA). O cartão da unidade diz quantos homens estão atordoados (`get_unit`: `stun`).

## O que NÃO foi testado

Só o smoke: o script passa no `node --check`, o servidor sobe, o harness carrega a simulação e roda 25 s de IA × IA nas duas épocas sem erro, e uma granada da IA jogada numa caixa de areia num alvo a 18 m quica, para a ~1 m dele e explode em 3,6 s; `cvPick` roda no aberto. Não rodei nenhuma suíte (`tests/infantry.js`, `drills.js`, `squads.js`, `inf-drills.js`, `help.js`, `rec.js` e as online), nem partida no navegador (o navegador compartilhado deu timeout ao abrir a página), nem partida online.

## Riscos que vejo

- **Mira da granada**: o ponto mais curto no aberto foi medido só com o alvo a 18 m num terreno; em ladeira ou de perto pode cair longe. A granada mirada na janela pode bater no batente e voltar para quem jogou.
- **Cliente antigo**: um cliente do #126 sem esta parte ignora `fl` e `rb`: vê a granada cozinhada com a espoleta cheia e a devolvida junto com a original. Só a imagem diverge; o dano continua com quem já o aplicava.
- **Empurrão**: artilharia e bombas grandes empurram homens a até 1,6 × o raio; o empurrão não confere objetos baixos e pode pôr um homem num lugar ruim. O atordoado não atira no começo: pode mudar duelos de infantaria sob morteiro.
- **Balões**: são desenhados por quadro para todos os soldados até 140 m; numa cidade cheia pode haver muitos de uma vez.
- **Dobra do terreno**: a amostra é de 6 pontos do chão; em terreno com textura grossa pode cortar estilhaço demais ou de menos.

## Como testar depois

1. `node tests/infantry.js`, `node tests/drills.js`, `node tests/inf-drills.js`, `node tests/squads.js`, `node tests/help.js`, `node tests/rec.js` comparando com o main de antes (`PAGE=<página antiga>`).
2. Granada: no harness, `sandbox('modern')`, um soldado em (1000, 0) e um alvo a 10, 18 e 28 m; `m.nAt = nadeAt(m, alvo); toss(m, 1)` e conferir onde `b.rest` acontece e que explode em `nadeFuse()` s. Repetir com o alvo a 8 e 28 m, em ladeira, dentro de um prédio (deve mirar a janela) e numa trincheira (arco alto, cai no fundo).
3. Dobra: uma granada atrás de uma crista contra um homem do outro lado: o dano deve ser ~35% do aberto.
4. `cvPick(m, e, 25)` perto de um tanque parado, de uma casa, de uma trincheira e no aberto: ver `why` (`veiculo`, `predio`, `trincheira`, `dobra`, `chao`).
5. Balões: partida IA × IA no navegador, câmera perto de uma esquadra em contato: devem aparecer "Ao chão!", "Médico!", "Lá vai granada!". Online: um convidado vê as falas dos soldados do anfitrião.
6. Explosão: um morteiro caindo a 5 m de um soldado em pé: ele se desloca ~1-2 m e o cartão da unidade mostra "1 homem atordoado".
7. Online: um convidado joga granada; anfitrião e convidado devem ver a mesma granada quicar e explodir no mesmo tempo (o campo `f`).
