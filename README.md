# Céu de Ferro 3D

Jogo de combate aéreo em um único arquivo HTML, com missão solo e PvP online.

## Como rodar

Precisa do Node.js 18 ou mais novo.

```
npm install
npm start
```

Abra `http://localhost:8080` no navegador. Para trocar a porta, use `PORT=9000 npm start`.

A missão solo também funciona abrindo o arquivo `Céu de Ferro 3D.html` direto, sem servidor. O PvP precisa do servidor.

Na missão solo dá para jogar de avião, tanque, antiaérea, artilharia, infantaria (veja a seção Infantaria) ou, na Frente atual, helicóptero. Tudo o que anda no chão entra pela base principal do seu lado: ao lado da estrada por onde a coluna inimiga vem, a pouco mais de um quilômetro da pista (antiaérea a 1000 m, artilharia a 1200 m, tanque a 1400 m, soldado a 1450 m) e de frente para o inimigo. A linha dos tanques aliados fica uns três quilômetros adiante. A outra entrada é uma base de suprimento pronta do seu lado, escolhida na tela de troca (veja "Bases de suprimento"). Perto da pista ou de uma base de suprimento o veículo é remuniciado e reparado.

Desde a primeira onda o inimigo traz caça, avião de ataque, tanques, uma antiaérea móvel e um obuseiro autopropulsado (dois a partir da quinta onda), e o seu lado tem caça, avião de ataque, tanques, antiaérea e um obuseiro da IA, seja qual for a sua classe. Cada lado tem também um pelotão de infantaria, que chega de caminhão.

## Dano por partes

Cada avião, tanque, antiaérea e obuseiro é feito de peças, e o tiro vale pelo lugar onde acerta. O casco (ou a fuselagem) continua sendo a vida do veículo; as peças têm vida própria e, feridas, tiram alguma coisa dele. Caminhões continuam com uma vida só.

- **Avião.** Asa esquerda e direita, profundor, leme, motor (dois nos bimotores), combustível e piloto. Asa ferida perde sustentação e puxa o avião para o lado dela; asa arrancada sai voando e o avião cai. Sem profundor não há comando de arfagem, e sem leme o nariz passeia. Motor ferido perde força e fumaça; destruído, para (um bimotor perde metade por motor) e pode pegar fogo. Tanque de combustível furado deixa um rastro e pode incendiar. O fogo come a fuselagem até apagar sozinho, até o avião explodir ou até um mergulho acima de 90% da velocidade máxima soprar a chama. Piloto ferido deixa os comandos lentos e escurece a vista por um instante; piloto morto, o avião cai e conta como abate. Peça em estado crítico pode travar o comando dela, e a fuselagem em estado crítico pode travar o canhão.
- **Tanque.** Lagartas, motor, canhão, torre, munição e três tripulantes. A blindagem depende da face: frente grossa, lados mais finos, traseira e teto finos. Tiro de canhão que chega muito de raspão ricocheteia e não faz nada. Uma lagarta quebrada deixa o tanque se arrastando e girando em volta dela; as duas, ou o motor, e ele não anda. Canhão ferido recarrega devagar e espalha o tiro; destruído, não atira. Torre ferida gira devagar; destruída, trava. Tiro que entra pelo lado na altura do casco pode chegar à munição: metade das vezes ela explode, a torre voa e o tanque acaba ali. Cada tripulante perdido deixa tudo mais lento, e sem tripulação o tanque está perdido. O canhão dos aviões pega o teto.
- **Antiaérea.** Sem blindagem: rodas, motor, armamento, radar (ou mira, em 1944) e tripulação. Sem radar o míssil não trava.
- **Artilharia.** Blindagem fina: lagartas, motor, obuseiro, munição e três tripulantes. Os de 1944 (Hummel e M7 Priest) são abertos em cima: estilhaço e rajada de avião ferem a tripulação e podem chegar à munição, que explode. Os atuais (PzH 2000 e 2S19 Msta-S) são fechados.

No canto de baixo, à esquerda, o painel de danos mostra o veículo visto de cima, com cada peça na cor do estado dela (inteira, ferida, crítica, destruída), a lista do que está ferido, os avisos de fogo, vazamento e comando travado, a tripulação e o andamento do reparo. Na cabine dos aviões ele fica em cima, à esquerda. Quem atira vê o nome da peça que acertou, e "ricochete" quando o tiro resvala.

**Reparo.** No tanque, na antiaérea e na artilharia, segure **T** com o veículo parado: a tripulação apaga o fogo (3 s) e depois conserta uma peça por vez, lagartas ou rodas primeiro, depois motor, canhão, obuseiro ou armamento, torre ou radar (5 s cada, 8 s se estava destruída). O reparo de campo devolve a peça à metade, não mexe no casco, na munição nem na tripulação perdida, e o veículo não anda nem atira enquanto isso. Um tiro recebido interrompe. O conserto completo é perto da pista na missão solo, e no PvP só voltando em outro veículo. Avião não se conserta em voo: só sobrevoando a própria pista, baixo e perto, junto com o rearme.

A IA joga pelas mesmas regras: tanques e antiaéreas consertam quando ninguém está atirando neles, e um avião aleijado larga a briga e volta para a base.

## Artilharia

Um obuseiro autopropulsado por lado em cada época: Hummel (15 cm) e M7 Priest (105 mm) em 1944, PzH 2000 (155 mm) e 2S19 Msta-S (152 mm) hoje. É lento, tem blindagem fina e recarrega devagar (10 a 13 s em 1944, 7 s hoje), mas atira granadas de alto explosivo por cima dos morros: até 6,1 km em 1944 e 12,1 km hoje. A granada voa de verdade, em arco, e leva de dez segundos a quase um minuto para cair: contra quem está andando é preciso mirar à frente. Só atira com o veículo parado.

- **Tiro direto.** Pela mira ou pela luneta (tecla C), como no tanque: a elevação para o ponto sob a mira é automática, com a carga cheia.
- **Mapa de tiro (M).** O campo visto de cima, com o norte para cima, as curvas de nível, as estradas, o círculo do alcance, os aliados e os inimigos avistados. O mouse move o ponto de pontaria no terreno. O painel mostra a distância e o azimute, a elevação e a carga, o tempo de voo e a dispersão, e a elipse no mapa é onde a granada deve cair: ela cresce com a distância, e os obuseiros atuais espalham menos. O tiro sai quando o cano termina de apontar ("PRONTO"). Cada granada no ar aparece com a contagem dos segundos que faltam, e a explosão fica marcada por alguns segundos. A roda do mouse ou R aproxima o mapa em volta do ponto de pontaria.
- **Carga e arco.** A direção de tiro escolhe a carga mais fraca que alcança e o arco tenso; se um morro está no caminho, passa ao arco mergulhante, por cima dele. "FORA DE ALCANCE" e "SEM SOLUÇÃO: RELEVO NO CAMINHO" dizem quando não dá.
- **Avistamento.** No mapa de tiro (e no mapa do canto, para quem está de artilharia) só aparecem os veículos inimigos que alguém do seu lado está vendo: um veículo a até 2,5 km ou um avião a até 4,5 km, com linha de visada livre de morro e de fumaça. O alvo some seis segundos depois de perdido o contato.
- **Efeito.** O estilhaço destrói caminhões e antiaéreas a dez ou vinte metros e só fere os tanques, que deixam passar um terço dele. O acerto direto vale pela face: pouco na frente de um tanque, muito no teto, que é onde cai uma granada de arco alto.
- **Quem está embaixo.** A granada assobia nos últimos dois segundos, e o aviso "ARTILHARIA CAINDO PERTO" aparece quando ela vai cair perto do seu veículo.

A IA também tem artilharia: o obuseiro vem no fim da coluna, para quando há alvo avistado ao alcance e escolhe o que está parado (tanque em posição, antiaérea, jogador que ficou no mesmo lugar por mais de oito segundos) e os grupos. O primeiro tiro cai longe, os seguintes vão sendo corrigidos, e depois de duas a quatro granadas ele muda de posição. Coluna da IA que leva granada por perto sai do lugar em vez de ficar parada.

## Fumaça contra mísseis

Tanques (três salvas) e obuseiros (duas) levam lançadores de granadas de fumaça. A tecla **G** dispara uma salva: em um segundo forma-se uma cortina de uns 36 m de raio em volta do veículo, que dura cerca de 20 s. Entre uma salva e outra passam 8 s. A fumaça volta junto com a munição, perto da pista, na missão solo.

A regra é uma só: linha de visada que atravessa a cortina está cortada.

- O míssil ar-solo que vinha travado no veículo perde a trava, segue sem guia e quase sempre cai longe. Fumaça disparada no último segundo e meio não salva.
- O avião não consegue travar um míssil novo através dela (o losango some), e a IA não dispara.
- A IA não enxerga através de fumaça, em nenhuma classe: tanque (canhão e metralhadora), antiaérea (canhões, Flak e mísseis), artilharia, aviões de ataque (canhão, foguetes, bombas e mísseis) e soldados seguem a mesma regra. Ela não escolhe um alvo que a fumaça esconde. Se o alvo que ela já seguia entra na fumaça, ela lembra só de onde o viu por último durante uns 4 s: nesse tempo pode atirar nesse ponto, bem espalhado, e não em onde o alvo está de verdade; depois larga o alvo e procura outro que consiga ver. Nada guiado é lançado sem a linha livre.
- A fumaça vale para os dois lados e para quem olha de cima: um veículo da IA dentro da própria cortina também não vê para fora, e um avião não vê o que está embaixo dela. Quem sai da cortina volta a ser visto.
- A artilharia continua atirando sem ver, mas só no ponto em que um observador viu o alvo por último: se ninguém mais o vê, as granadas caem onde ele estava.
- A sua própria vista fica tapada enquanto você está dentro dela, e as marcas e os nomes dos alvos somem do outro lado.
- O veículo dentro dela sai do mapa de tiro da artilharia inimiga.

O tanque e o obuseiro recebem o alerta de míssil desde o lançamento, com um bipe, a contagem "IMPACTO EM n s" e uma seta para o lado de onde ele vem, para dar tempo de decidir. Em 1944 não há míssil guiado: a fumaça serve contra o tiro direto e contra o avião que vem no mergulho. Os tanques da IA usam a fumaça quando percebem o míssil ou o avião (metade das vezes) e andam alguns metros debaixo dela.

## Infantaria

Soldados andam pelo campo de batalha dos dois lados, como pelotões da IA e como classe jogável.

**Pelotões da IA.** Um pelotão tem um líder, dois fuzileiros, um metralhador e um soldado anticarro (hoje, mais um de defesa antiaérea): 5 soldados em 1944 e 6 hoje. Há pelotões dos dois lados desde o primeiro segundo, de dois tipos.

*Pelotões de campo.* Cada lado começa com doze pelotões a pé, já nos seus postos (os dez de antes, a equipe de morteiro e a de emboscada), e o comandante do lado (veja "Comando da IA, morteiros e emboscadas") cuida deles a cada 3 s. Os postos: um de engenheiros, que ergue a base de suprimento avançada e fica de guarda nela; um na linha de cada estrada, onde as colunas do lado param; dois de guarnição na vila do lado (a de oeste é do lado da base oeste, a de leste do outro), agachados nas quinas das casas; um piquete na mata perto da linha; uma patrulha em cada estrada, indo e voltando num trecho de 750 m atrás da linha; um ao lado da estrada que sai da base principal; e um de assalto, que começa a 750 m da vila inimiga e avança sobre ela. Uma vila é de quem tem pelo menos três soldados a menos de 430 m do centro dela sem inimigo ali. Cada pelotão tem uma ordem (guardar um posto, patrulhar, assaltar, escoltar a coluna, construir, reabastecer) e é ela que diz para onde ele vai. Quando um posto fica sem pelotão, o planejador manda outro, um a cada 40 s enquanto houver vaga: ele entra pela base principal do lado, ou por uma base de suprimento segura que esteja no caminho, a pé se o posto fica a menos de 500 m e de caminhão se fica mais longe. O caminhão larga o pelotão 120 m antes do posto, volta para de onde saiu e some lá.

*Pelotões da coluna.* A coluna de veículos leva pelotões em caminhões (dois por lado na missão solo; no PvP, dois por lado com até um jogador nele e um com mais). O caminhão desembarca bem antes do contato: com inimigo a 1100 m, quando um veículo da própria coluna a menos de 500 m entra em combate, quando é atingido, quando uma granada cai a menos de 130 m, quando um avião mergulha nele ou uma bomba vem caindo perto, e onde a coluna para. Depois de desembarcar ele recua de 90 a 170 m. Se o caminhão é destruído ainda carregado, cada soldado tem 70% de chance de sair vivo, ferido e pregado no chão por alguns segundos. O pelotão da coluna escolta os tanques dela, sem passar à frente do primeiro. Quando a coluna não tem mais nenhum veículo, os sobreviventes viram pelotão de campo e ficam onde estão: na missão solo eles deixam de contar para a onda, que termina com os aviões e os veículos dela.

Nunca há mais de 160 soldados no mapa, e nenhum lado passa da metade disso.

O pelotão anda em formação aberta ao lado da estrada (mais depressa quando não há inimigo a menos de 800 m), para a uns 260 m do inimigo (o de assalto só a 110 m) e procura cobertura por perto. Sob fogo os soldados se deitam e atiram pior por alguns segundos. O metralhador se deita e sustenta o fogo, o soldado anticarro contorna o veículo para atirar pelo flanco dentro do alcance do lançador, o de defesa antiaérea trava nos aviões baixos e próximos, e todos jogam granadas a menos de 30 m. Quando sobra um terço do pelotão, ele solta fumaça e recua 300 m.

O resto da IA reage: o tanque abre fogo de metralhadora nos soldados que vê, segue avançando quando só há soldados à vista e recua de um soldado anticarro a menos de 280 m por até 10 s, para a coluna não ficar presa; o avião de ataque sem míssil guiado ataca um pelotão quando não há veículo por perto; a artilharia bombardeia um pelotão parado que alguém esteja vendo.

**Kits.**

| Época | Lado | Fuzileiro | Metralhador | Anticarro | Antiaéreo |
|---|---|---|---|---|---|
| 1944 | Luftwaffe | Kar 98k | MG 42 | Kar 98k e Panzerfaust 60 | |
| 1944 | Aliados | M1 Garand | BAR M1918A2 | M1 Garand e Bazooka M9 | |
| Hoje | Força Azul | M4A1 | M249 | M4A1 e FGM-148 Javelin (guiado) | M4A1 e FIM-92 Stinger |
| Hoje | Força Vermelha | AK-12 | PKP Pecheneg | AK-12 e RPG-7 | AK-12 e 9K38 Igla |

Todos levam duas granadas de mão e uma de fumaça. Fuzil e metralhadora não fazem nada na blindagem de um tanque nem no casco de um obuseiro: ferem soldados, caminhões, antiaéreas e a tripulação de canhões de teto aberto. Panzerfaust, Bazooka e RPG são foguetes sem guia de carga oca: o dano depende da face atingida, e de frente quase nunca destroem um tanque; pelo lado ou por trás, sim. O Javelin precisa do alvo na mira por um segundo e meio e da linha livre de fumaça, e cai no teto; fumaça depois do disparo tira a trava. Stinger e Igla buscam o calor do avião e são enganados por flares.

**Posturas.** Em pé, agachado e deitado. Mais baixo o soldado anda mais devagar, atira com menos dispersão e é visto de mais perto: em campo aberto, a 1100 m em pé, 660 m agachado e 330 m deitado (de um avião, duas vezes e meia isso). Deitado, uma explosão fere 30% do que feriria em pé. Só se corre em pé, por uns 9 s de fôlego.

**Cobertura.** As casas são sólidas: tiro, estilhaço e linha de visão param na parede, então quem está atrás de uma casa está coberto de verdade (veja "Casas, árvores e destroços"). O resto vem do terreno. Dentro da mata o soldado é visto pela metade da distância e 45% dos tiros e de cada explosão param nas árvores, de qualquer lado. Agachado ou deitado a menos de 3 m de uma parede ou de um monte de escombros, ele é visto a 70% da distância e a quina segura metade dos tiros e de cada explosão que vêm do lado dela; em pé, ou do lado aberto, nada. O painel do canto diz quando você está coberto.

**Ferimentos.** O corpo tem zonas: tronco, cabeça (três vezes o dano), pernas e braços. Perna ferida deixa mais lento, braço ferido aumenta a dispersão. Explosão e estilhaço são o que mais mata. Um veículo inimigo em movimento atropela quem está na frente.

**Jogar de soldado.** Aba **Infantaria** no hangar e na troca de veículo (H), um cartão por kit. Você entra a pé ao lado da estrada que sai da base principal do seu lado, ou junto de uma base de suprimento pronta (veja "Bases de suprimento"): a pé a base principal fica a mais de dez minutos da linha de frente, então a base avançada que os engenheiros da IA erguem no primeiro minuto é a entrada que importa. Ao lado de um caminhão aliado, de uma base de suprimento ou perto da pista você recebe munição, granadas e curativo em 3 s; o kit de construção e a carga de demolição, só nas bases. O servidor do PvP precisa ser o desta versão: com um servidor que não conhece a infantaria a aba continua aparecendo, mas a entrada é recusada e a IA não põe pelotões na sala.

## Comando da IA, morteiros e emboscadas

Cada lado tem um comandante de IA, o mesmo código para os dois, que pensa a cada 3 s acima das IAs de pelotão e de veículo. Ele só usa o que o lado dele sabe (as próprias tropas e o inimigo onde foi visto pela última vez, por até 40 s) e só age por ordens aos pelotões, por missões de tiro que morteiros e baterias cumprem e por poucos recados aos veículos. Online ele roda no anfitrião e é refeito a partir do mundo quando o anfitrião muda.

**O que ele decide.** Por estrada, compara a força própria com a inimiga conhecida e fica em ataque, espera ou defesa. O objetivo é a vila que o inimigo segura; se a linha inimiga fica no caminho, ela vem primeiro. Um assalto só sai com dois pelotões pelo menos e força suficiente para o que se sabe do objetivo (tanques da estrada contam), então quase sempre espera reforço ou blindado.

**O assalto, em fases.** *Reunir:* os pelotões se juntam a 720 m do objetivo, fora do alcance dos fuzis, e os tanques da estrada esperam por eles (até 90 s). *Preparação:* morteiro e artilharia batem o que foi avistado no objetivo e recebem o pedido de uma cortina de quatro fumaças entre atacantes e defensores. *Assalto:* com a fumaça de pé, os pelotões correm sem parar para atirar, um fica em apoio atirando para dentro do objetivo e, com vantagem, outro dá a volta pelo flanco; a fumaça é renovada enquanto eles estão atrás dela, o fogo de preparação cessa quando chegam a 300 m, os líderes lançam a própria fumaça no fim e tanques ao lado soltam a deles. Sem fumaça disponível, os pelotões avançam por lances, um cobrindo o outro. *No objetivo:* combate normal, com granadas nas trincheiras. Se sobrar menos de 40% da força, recuam com fumaça para onde se reuniram e o próximo assalto demora.

**Defesa.** Pelotão parado sem inimigo a 500 m fica deitado (bem mais difícil de avistar e de acertar com artilharia); pelotão bombardeado no posto muda de lugar 70 a 140 m; posto de linha que perdeu metade dos homens recua 300 m em ordem, com fumaça; a reserva (o pelotão junto da base principal) sobe para trás da vila ameaçada e contra-ataca quando o ataque inimigo perde força. Os piquetes da mata só observam: não atiram até serem achados, e o que eles veem vai para os mapas de tiro. Cada base de suprimento tem um pelotão de guarda garantido (dois com inimigo por perto); depois de perder uma base, a próxima fica mais atrás, e uma vila tomada ganha a sua.

**Emboscadas.** Cada lado mantém uma equipe de emboscada (duas na doutrina cautelosa) num trecho de estrada com mata densa ou terreno alto ao lado, curva, saída de vila ou travessia do rio, perto da própria linha. Os homens ficam deitados e escondidos sem atirar até dois inimigos entrarem na zona de morte (veículo vale por dois), alguém chegar a 55 m, um deles ser atingido ou um jogador do lado atirar dali. Então tudo atira junto: os lançadores no primeiro e no último veículo, o morteiro fecha a saída. Depois de 25 a 40 s recuam 280 m e armam outra em outro lugar. Um tanque próximo pode ficar de tocaia fora da estrada, calado, com o canhão na zona de morte. Uma patrulha às vezes serve de isca: avança até ser vista e recua pela emboscada.

**Quem sofre a emboscada.** Veículo atingido de perto solta fumaça e segue adiante para sair da zona em vez de parar nela; o que leva tropa desembarca, e os pelotões da coluna atacam o lado de onde veio o fogo. Antes de um trecho suspeito a coluna para e manda o pelotão dela na frente (até 50 s), o que dá chance de achar a emboscada primeiro.

**Aviação.** Aviões de ataque e helicópteros dão preferência ao que está no objetivo do assalto, ao que emboscou uma coluna ou ao que ataca a vila do lado.

**Morteiro.** Cada lado tem uma equipe de morteiro (líder, morteiro, fuzileiro) uns 700 m atrás da linha. Tiro curvo de 150 m a 3 km, granada explosiva ou de fumaça (cortina de 28 m por 45 s), 5 s para montar, uns 3 s entre tiros, 18 a 20 granadas, assobio curto antes de cair. A IA cumpre primeiro as missões do comandante (fumaça antes de tudo), guarda metade das granadas para ele, bate alvos avistados e parados, trincheiras e bases, e muda de lugar depois de oito tiros. As baterias de artilharia da IA também atiram fumaça quando o comandante pede.

**Jogando de morteiro.** É um kit da infantaria nas duas épocas. **Q** pega o morteiro (monta em 5 s, parado), o botão esquerdo dispara no ponto do chão sob a mira, **M** abre o mapa de tiro igual ao da artilharia (anel de alcance, elipse de dispersão, tempo de voo, granadas no ar), **V** troca entre explosiva e fumaça.

**O que o jogador vê.** Uma linha sob o mapa do canto diz o que o comando do seu lado está fazendo, e o mapa (também o de tiro) mostra: **X** o objetivo, **+** onde o assalto se reúne, círculo cinza a fumaça pedida, círculo laranja o fogo pedido, triângulo verde uma emboscada à espera (vermelho depois de aberta). A pé perto de uma emboscada aliada aparece **EMBOSCADA: AGUARDE**. Ninguém manda no jogador: quem entra num assalto ou numa emboscada só passa a contar.

**Doutrinas.** A tabela `CMD.doc` da página tem três, `cautious`, `balanced` e `aggressive`, e `CMD.use` diz qual cada lado usa (as duas em `balanced`). Elas mudam a vantagem exigida para atacar, quando passar à defesa, o número de pelotões por assalto e de emboscadas, quanto esperar pela fumaça, a preparação e o ritmo dos reforços.

**Servidor.** O `server.js` novo anuncia `cmd: 1`. Com um servidor antigo o jogo continua igual, mas sem equipe de morteiro, sem fumaça de artilharia, sem as marcas do comando para os convidados, e quem escolher o kit de morteiro é recusado na entrada.

## Casas, árvores e destroços

Tudo o que está de pé no mapa tem volume e pode ser destruído: as casas das duas vilas, a torre da igreja, os hangares, a torre de controle e o mastro de cada base, as árvores e as carcaças de veículos.

**O que para onde.** Bala, granada de tanque, foguete, míssil, bomba, granada de mão e estilhaço de flak param no que acertam e é ali que causam dano. Uma casa protege quem está atrás dela, do tiro direto e também da explosão: com uma parede no meio, só um quarto da explosão passa. Linha de visão também para na parede: a IA não enxerga nem atira através de casa, o míssil guiado bate na parede que estiver no caminho, e nomes e marcas de inimigos somem atrás de construção. Árvore não esconde ninguém sozinha (a mata continua valendo como cobertura), mas o tronco para bala.

**Movimento.** Veículo e soldado não atravessam casa: escorregam pela parede. Tanque e obuseiro derrubam árvore, mastro e carcaça passando por cima, perdendo um pouco de velocidade (20% numa árvore, bem mais numa carcaça). Caminhão, antiaérea e soldado são parados pelo tronco e passam entre as árvores. Avião que bate em construção ou árvore é destruído; se foi atingido nos últimos 12 s, o abate é de quem atingiu. As estradas ficam livres: nenhuma casa a menos de 11 m do eixo, nenhuma árvore a menos de 14 m.

**Destruição.** Cada casa tem pontos de estrutura conforme o tamanho (de uns 90 a 300). Arma leve quase não faz nada (milhares de tiros), canhão automático lasca devagar, uma casa pequena cai com 3 ou 4 granadas de tanque e uma grande com 7 a 9. Bomba, obuseiro, foguete grande e míssil ar-solo derrubam ou quase derrubam no impacto, e a explosão fere as casas vizinhas conforme a distância. Abaixo de 55% a casa escurece, fica com os buracos dos impactos e solta fumaça. Quando cai, levanta poeira e pedaços, mata o soldado encostado na parede e fere caminhão e antiaérea a até 4 m. Sobra um monte de escombros de 1,6 m: não tapa mais a visão por cima, veículo e soldado passam por ele na metade da velocidade, e quem deita atrás dele continua coberto. Árvore cai com explosão ou com tanque e fica deitada, sem atrapalhar ninguém. Carcaça some depois de 45 s, como antes, ou antes disso se for destruída ou esmagada por um tanque.

**Base.** Hangares e torre podem ser danificados e derrubados, mas isso é só o cenário: a missão solo continua decidida pela barra da base.

**IA.** Tanques e soldados contornam as casas por um caminho calculado dentro da vila. Um tanque que está mantendo distância do alvo procura um lugar ao lado de uma casa, com o alvo à vista e os outros inimigos tapados pela parede. Avião de ataque e artilharia não caçam casas: derrubam uma só como efeito de atacar quem está perto dela.

**Limites.** Não dá para entrar nas casas: são blocos sólidos. Avião que cai não deixa carcaça. A câmera de perseguição pode atravessar uma parede.

**Online.** O estado das casas e árvores é do anfitrião. Cada jogador avisa o anfitrião do dano que os seus próprios tiros causaram, e o anfitrião avisa a sala quando algo muda de estágio. Quem entra depois recebe a lista do que já está danificado ou no chão, e se o anfitrião sai o seguinte continua de onde estava (o dano parcial de uma casa ainda de pé volta para o valor do estágio). Carcaças são locais de cada jogador. Isso usa duas mensagens novas do servidor: reinicie-o depois de atualizar o jogo. Com um servidor antigo no ar, casas e árvores continuam sólidas para todos, mas nada é danificado.

## Bases de suprimento

Soldados constroem bases de suprimento pelo mapa, os seus e os da IA. Uma base pronta remunicia e repara o que é do lado dela, serve de ponto de entrada e é um alvo.

**Construir.** De soldado, a tecla **N** mostra o contorno da obra alguns metros à frente (de 7 a 13 m, mais longe quanto mais alta a mira): verde onde dá para construir, vermelho com o motivo onde não dá. Os motivos: fora do mapa, na água, terreno inclinado demais, em cima da estrada (a menos de 16 m dela), encostado em casa, árvore ou destroço (2 m de folga), a menos de 350 m de outra base ou de 1350 m de uma pista, a menos de 220 m de um inimigo, ou o seu lado já ter três bases. O clique começa a obra e gasta o kit de construção, um por soldado; o botão direito ou N de novo cancela. Para construir, fique parado a menos de 8 m das paredes: onde quer que o contorno esteja, você já está nesse alcance. Sozinho leva 70 s; cada soldado do seu lado parado junto da obra soma metade disso, até seis construindo (três levam 35 s, seis ou mais 20 s). Um tiro recebido interrompe o trabalho desse soldado por 4 s. A obra abandonada espera 25 s e depois perde 1,2% por segundo até sumir; qualquer soldado do lado retoma de onde parou. A obra aparece em estágios: o piso e os postes, as paredes subindo, o telhado, os caixotes ao lado, os sacos de areia e, pronta, o mastro com a bandeira. Uma barra sobre ela mostra o quanto falta.

**Limites.** Três bases por lado, contando as obras. O kit volta em uma base pronta ou na base principal. A IA não usa kits: o planejador dela constrói até duas das três, o que deixa uma vaga para os jogadores.

**O que a base faz.** A até 70 m, soldados e veículos de solo do lado recebem munição, granadas, fumaça, kit e carga, e o conserto completo de todas as peças, no ritmo da base principal (soldado em 3 s, veículo em 2,5 s); a tela mostra REABASTECENDO. Aviões não são atendidos. Quem joga de tanque, antiaérea, artilharia ou soldado pode entrar junto dela: na tela de troca (H) e na volta depois de perder o veículo aparece a lista "onde entrar", com a base principal, cada base do lado e a distância de cada uma até a linha de frente, num mapa pequeno; as setas para cima e para baixo escolhem. A base principal é o padrão. Uma base com inimigo a menos de 300 m não é oferecida (a lista diz por quê), e se a base escolhida é destruída durante a espera você entra pela principal.

**Como alvo.** A base tem 230 pontos, e a obra leva duas vezes e meia o dano. Fuzil e metralhadora mal arranham (400 tiros de fuzil tiram 21 pontos) e granada de mão tira 3 por vez. Destroem: uns 10 tiros de 75 mm ou 8 de 120 mm, 6 Panzerfaust ou 5 RPG, 3 granadas de obuseiro de 1944 ou 2 de 155 mm, 3 foguetes HVAR, uma bomba de 500 lb em cima ou duas de 250 kg perto, um AGM-65, uns 235 tiros do canhão de 30 mm do A-10. Encostado em uma base inimiga (a menos de 8 m), N arma a carga de demolição, uma por soldado: ela explode em 5 s e duas destroem a base. Ao ser destruída a munição dela explode e fere quem está a menos de 16 m, de qualquer lado; os destroços ficam 40 s e a vaga do lado volta. A base inimiga só aparece nos mapas e na tela enquanto alguém do seu lado a viu nos últimos dois minutos.

**A IA.** Os engenheiros começam a base avançada no primeiro segundo, 260 m atrás da linha do lado e 34 m ao lado da estrada, e ela fica pronta em menos de meio minuto. Depois o planejador ergue a segunda na outra estrada, ou atrás de uma vila que o lado tem, sempre com o pelotão sem inimigo a menos de 500 m. Um pelotão fica de guarda em cada base. Base perdida, outra é começada 45 s depois. Um pelotão com soldado sem carregadores ou com menos de metade da saúde, e um veículo da IA com menos de metade do casco e nada para combater, recuam até a base do lado a menos de 1600 m pela estrada e voltam depois. As colunas e os pelotões de reforço entram pela base principal, ou pela base de suprimento segura mais avançada. Do outro lado, o tanque sem veículo para combater atira na base que vê, a artilharia a bombardeia, o avião de ataque a ataca quando não há veículo mais perto, e o pelotão de assalto que chega a 1200 m dela vai até lá com as cargas.

**Online.** As bases são do anfitrião, como as casas: ele dá o número de cada uma e manda a lista para a sala uma vez por segundo e a cada mudança. O soldado de um convidado pede a obra ao anfitrião, que confere se o pedido é do soldado que está ali e aplica as regras; se recusar, o kit volta. Quem entra depois recebe as bases como estão, e o próximo anfitrião continua as obras. O dano de um convidado vai ao anfitrião como o das casas. Isso usa duas mensagens novas do servidor (`base` e `build`): reinicie-o depois de atualizar o jogo. Com o servidor antigo no ar ninguém constrói, a IA não ergue bases, os veículos e soldados dos jogadores continuam entrando na estrada do meio do mapa, a cerca de um quilômetro do centro, e as colunas da IA continuam saindo 2600 m atrás dele.

Na missão solo as regras são as mesmas e os dois lados constroem. Destruir uma base inimiga vale 120 pontos e não muda quem ganha: continua valendo a base principal e as reservas. Só a primeira onda inimiga já começa avançada; as seguintes entram pela base de suprimento inimiga segura mais avançada, ou, sem nenhuma, pela base principal deles, do outro lado do mapa.

## Antiaérea contra mísseis

As antiaéreas atuais (NASAMS e Pantsir-S1) derrubam mísseis ar-solo. Só os guiados: bomba, foguete e granada não são alvo.

- O míssil que vem na direção do seu veículo tem prioridade na trava quando está dentro do cone da mira, antes de qualquer avião. Ele aparece com um losango amarelo e um círculo, o bipe vira um trinado rápido de dois tons, e o aviso mostra "IMPACTO EM n s · TRAVADO". Sem ele, a trava é do avião; sem avião, de um míssil que vai para um aliado.
- O eco de um míssil é pequeno: a trava só pega a 3,2 km (contra 8,5 km de um avião), e três em cada dez interceptadores perdem a trava no caminho. O que chega a 18 m do míssil o destrói no ar.
- O canhão de 30 mm também derruba o míssil, de perto: o círculo de avanço aparece na frente dele, como nos aviões.
- A recarga de 8 s não muda. Um míssil só costuma dar para parar; vários ao mesmo tempo, não.

A antiaérea da IA se defende, e defende os veículos a até 450 m dela, antes de atirar em avião. Com o lançador pronto e a linha livre ela para cerca de metade dos mísseis apontados para ela. Uma salva de três, um ataque por trás de um morro, foguetes, bombas e o canhão continuam matando.

## Cargas dos aviões

Cada avião tem grupos de pontos de fixação (ventre, asas, baias, pontas das asas) e uma lista do que cada grupo pode levar. A carga é uma escolha por grupo: um armamento e uma quantidade, ou nada. Há cargas prontas por avião, e dá para montar a sua na ficha do hangar:

- **Padrão**: a carga de sempre do avião.
- **Bombardeio**: bombas de queda livre, as mais pesadas que ele levanta.
- **Ataque ao solo**: bombas guiadas, mísseis ar-solo e foguetes.
- **Superioridade aérea**: só mísseis ar-ar nos jatos; nos caças de 1944, nada pendurado e mais munição para os canhões.
- **Mista**: bombas de cacho com mísseis ou foguetes, nos aviões de ataque.

O que existe para pendurar:

- **Bombas de queda livre** em vários tamanhos (SC 50 a SC 1000, 250 a 1000 lb, Mk 82 a Mk 84, FAB-250 e FAB-500). A cruz no chão mostra onde caem.
- **Bombas de cacho** (AB 250, CBU-87, RBK-500): abrem a 110 m do chão e espalham de 10 a 16 bombinhas num círculo de 45 a 65 m de raio. Matam soldados, caminhões e antiaéreas; num tanque fazem pouco.
- **Bombas guiadas** (GBU-12, GBU-32, KAB-500L): com um veículo no losango, vão até ele, mesmo que ande; sem veículo travado, vão até o ponto do chão para onde o nariz aponta no momento em que são soltas. Corrigem algumas centenas de metros, não mais.
- **Mísseis ar-solo** (GBU-39, AGM-65, Kh-25ML, Kh-38M) e **foguetes** (WGr 21, HVAR, Hydra 70, S-8), como antes.
- **Mísseis ar-ar** de médio alcance (AIM-120, R-77M: travam até 6,5 km, perto do nariz) e de curto alcance (AIM-9M, AIM-9X, R-73: travam até 5 km, num cone bem mais aberto, e curvam mais).
- **Munição extra** para os canhões de alguns caças de 1944, no lugar de bombas.

Cada avião só leva o que faz sentido para ele: os caças furtivos carregam pouco, tudo dentro das baias; os aviões de ataque carregam muito. A barra de peso mostra a carga contra o que o avião levanta, com uma marca no peso da carga padrão.

**O peso conta.** A massa do avião é a que ele tinha com a carga padrão, mais ou menos a diferença para o que está pendurado agora. Mais carregado, ele acelera, sobe e curva pior; conforme solta o armamento, melhora. Um A-10 com doze Mk 82 pesa 924 kg a mais que com a carga padrão e, depois de soltar tudo, 2,9 t a menos do que decolou. O que vai por fora também freia; o que vai nas baias, não.

**Teclas.** B e V disparam o primeiro e o segundo armamento da lista. Com três ou mais, G passa a lista para a frente, e o que era o terceiro vira o segundo. A lista da tela, a página de armamento da cabine e os botões de toque mostram sempre a carga de verdade, com B, V e G na frente de cada linha.

**Onde vale.** A carga escolhida entra na decolagem, a cada aeronave nova e ao rearmar sobre a pista. Escolher outra carga no meio do voo (H) não troca nada na hora nem custa a aeronave: ela é pendurada na próxima passada baixa sobre a pista. A escolha fica guardada por avião neste navegador.

**IA.** Os caças da IA decolam com a carga de combate aéreo. Os aviões de ataque olham o que o inimigo tem no chão: contra tanques, a carga padrão de mísseis; contra o resto, bombas de cacho, foguetes ou bombas de queda livre.

**PvP.** A carga viaja com a entrada na sala e com a troca de veículo, e o servidor confere cada uma contra a tabela do avião: grupos, armamentos conhecidos, quantidades e peso. Uma carga recusada vira a carga padrão. Os outros jogadores veem o armamento certo sob as asas e saindo do avião. Um servidor antigo, que não conhece cargas, continua servindo: nele todo mundo voa com a carga padrão.

## Trocar de veículo no meio da partida

Dá para trocar de avião, helicóptero, tanque, antiaérea, artilharia ou soldado sem sair da partida, entre todos os modelos da época que são do seu lado. Para mudar de lado, saia e entre de novo. Em telas de toque só os aviões aparecem, como no hangar.

- **Depois de perder o veículo.** Na espera de "Abatido" ou "Destruído" aparece um quadro com as classes e os veículos. Se você não mexer nele, volta no mesmo veículo depois do tempo de sempre. Se mexer, a volta espera: escolha e confirme, ou feche com Esc para voltar no mesmo.
- **A qualquer momento.** A tecla H ou o botão "Trocar veículo", no alto da tela, abrem o mesmo quadro. Confirmar abandona o veículo atual, que explode onde está, e o novo entra depois da espera normal, no ponto de entrada (avião perto da base; helicóptero pousado ao lado da pista; veículo e soldado na base principal ou na base de suprimento escolhida na lista "onde entrar") e com a proteção de sempre.

No quadro, 1 a 6 escolhem a classe (1 a 5 em 1944, que não tem helicóptero), as setas para os lados escolhem o veículo, as setas para cima e para baixo escolhem onde entrar, Enter confirma e Esc fecha sem trocar. O mouse também serve, e ele é solto enquanto o quadro está aberto.

Na missão solo o jogo fica pausado enquanto o quadro aberto pela tecla está na tela. Abandonar um veículo inteiro gasta um de reserva, e sem reserva a troca é recusada. Trocar depois de perder o veículo não custa nada além do que já se perdeu. Ondas, base e pontos seguem como estavam, e o que o veículo abandonado ainda tinha no ar (bombas, granadas, mísseis) continua contando para você.

No PvP a batalha não para enquanto você escolhe. Abandonar um veículo inteiro conta como uma queda no placar. Se alguém acertou você nos últimos 12 segundos, o abate é dele, então trocar não serve para fugir de um abate. Os outros jogadores veem o veículo antigo explodir e o novo aparecer, e o placar passa a mostrar o novo. O servidor só aceita veículo da época da sala e do lado em que você já está. Quem estava simulando a IA continua simulando depois de trocar. Essa troca usa uma mensagem nova do servidor: reinicie-o depois de atualizar o jogo. Com um servidor antigo no ar, o resto do PvP funciona e o quadro avisa que a troca não está disponível.

## PvP online

No hangar, escolha "PvP online", digite um nome, escolha a época, a classe e o veículo e clique em "Entrar na sala". Cada época é uma sala. O lado do veículo define o time: quem escolhe um avião, tanque ou antiaérea do outro lado é inimigo.

A sala nunca fica vazia: a IA mantém, dos dois lados, caças, aviões de ataque, uma coluna de tanques com antiaérea, caminhões e um obuseiro na estrada do meio e uma antiaérea fixa na base, com reforços saindo do lado de cada um. Quanto mais gente entra em um lado, menos IA esse lado recebe. Derrubar ou destruir uma unidade da IA conta na coluna "IA" do placar, ao lado dos abates de jogadores. Quem simula a IA é o navegador do jogador mais antigo da sala (o anfitrião); se ele sai, o seguinte assume a mesma batalha. Se o anfitrião deixar a aba em segundo plano, a IA para até ele voltar.

- Na rede local: ao iniciar, o servidor imprime os endereços `http://IP:8080`. Os outros jogadores abrem um deles no navegador.
- Pela internet: é preciso expor a porta 8080 (redirecionamento no roteador) ou usar um túnel, como `cloudflared` ou `ngrok`.

### Classes

- **Avião.** Decola perto da base do seu lado. Rearma e repara sobrevoando a própria pista, baixo e perto.
- **Tanque.** Os quatro tanques da época, dois por lado. Canhão com projétil de verdade (tem tempo de voo e cai com a gravidade) e metralhadora.
- **Antiaérea.** Uma por lado. Em 1944, canhão automático e granada de tempo, que explode na distância do avião mais perto da mira. Hoje, míssil guiado e canhão de 30 mm, que também derrubam mísseis ar-solo.
- **Artilharia.** Um obuseiro autopropulsado por lado. O tiro de cada um é visto por todos no mesmo arco e no mesmo ponto de queda, e o dano é de quem atirou.
- **Infantaria.** Três kits por lado em 1944 e quatro hoje. Os tiros de fuzil dos outros aparecem para todos, foguetes, granadas e fumaça voam em todos os clientes a partir dos mesmos números, e o dano é sempre de quem atirou. Os pelotões da IA são do anfitrião da sala, como o resto da batalha, e passam para o próximo anfitrião se ele sair, a pé ou ainda dentro do caminhão.
- **Helicóptero** (só na Frente atual): AH-64D Apache e UH-60M Black Hawk pela Força Azul, Mi-28N e Mi-8AMTSh pela Força Vermelha. Entra pousado num ponto de pouso ao lado da pista. Paira, sobe e desce na vertical, voa de lado e de ré; sem tecla ele se estabiliza e mantém a altura. O de ataque tem canhão de 30 mm numa torre que segue a mira, foguetes e mísseis anticarro guiados (fumaça corta a trava). O de transporte tem metralhadoras nas portas, uma salva de foguetes e leva um pelotão: pousado ao lado de um pelotão aliado da IA, G embarca; pousado onde quiser, G desembarca. O rotor não pode encostar em nada. Pousado e parado ao lado da pista ele é rearmado e reparado. A carga dele é fixa: o editor de carga do hangar é só dos aviões.

A fumaça de cada veículo aparece para todos no mesmo lugar, e quem decide a perda da trava é o dono do míssil. Na interceptação quem decide é o dono do interceptador: o míssil parado some para todos. O servidor conhece as classes e essas mensagens, então reinicie-o depois de atualizar o jogo: a infantaria só existe no PvP com o servidor desta versão. O servidor também precisa conhecer helicópteros (`welcome.hl`) e cargas (`welcome.lo`): com um servidor antigo a página funciona sem eles, ninguém escolhe um helicóptero, a IA não põe nenhum em campo e todos os aviões voam com a carga padrão.

Tanques, antiaéreas, obuseiros e soldados entram pela base principal do lado, ao lado da estrada do meio do mapa e a pouco mais de um quilômetro da pista, de frente para o inimigo e com alguns segundos de proteção, ou junto de uma base de suprimento pronta do lado, escolhida na tela de troca. Da base principal até o centro do mapa são 5 km em 1944 e quase 9 km hoje: de 6 a 10 minutos de veículo e mais de 20 a pé, contra um ou dois minutos de veículo e cinco a pé saindo da base avançada, que a IA de cada lado ergue no primeiro minuto a pouco mais de um quilômetro do centro. Ao ser destruído, o jogador volta em outro veículo, inteiro e com a munição completa. Perto da pista ou de uma base de suprimento o veículo é remuniciado e reparado; fora delas, só o reparo de campo. As colunas da IA também entram pela base principal ou por uma base de suprimento segura, e só as primeiras já começam perto do centro. As classes de solo, infantaria incluída, existem na missão solo e no PvP e pedem mouse: em telas de toque o hangar mostra só os aviões.

## Hangar

Época e modo de jogo ficam no alto. Abaixo, a faixa de classes e o carrossel: o veículo escolhido gira no centro, sobre a batalha de demonstração, com os vizinhos menores dos lados. Troque com as setas da tela, clicando num vizinho, arrastando, com a roda do mouse, com ← e → (Home e End vão ao primeiro e ao último) ou deslizando o dedo. A ficha ao lado mostra velocidade, proteção e poder de fogo em barras, o armamento e, nos aviões, a carga. O botão de decolar fica sempre à vista, e "Controles" abre o painel com o esquema de controle, as teclas do veículo escolhido e o resumo da missão.

A troca de veículo no meio da partida (H) e a tela depois de uma perda usam o mesmo carrossel, em tamanho menor.

## Controles

### Avião

No painel "Controles" do hangar há dois esquemas. "Clássico" usa o manche no teclado. "Mira com mouse" trava o ponteiro no jogo: você aponta a mira e o avião voa até ela. Os flares saem de dois em dois. A legenda de teclas do painel acompanha o esquema e o avião escolhidos.

A tecla C troca entre a câmera externa e a cabine. Na cabine os instrumentos funcionam: velocímetro, horizonte, altímetro, variômetro, RPM, bússola e contadores de munição nos aviões de 1944, e HUD com dois painéis (radar e armas) nos jatos. Com a mira no mouse a cabeça acompanha a mira. No esquema clássico, segure 1, 3, 2 ou 4 para olhar para a esquerda, a direita, para trás ou para cima.

A tecla H abre a troca de veículo no meio da partida.

A tecla G tem um sentido por classe: no avião com três ou mais armamentos ela passa a lista para a frente, no helicóptero de transporte pousado embarca e desembarca o pelotão, no tanque e na artilharia solta a fumaça e no soldado joga a granada de fumaça.

### Helicóptero

Clássico: W/S nariz, A/D inclinação, Q/E pedais, Shift/Z coletivo, X pairado automático, Espaço canhão, B foguetes, V míssil guiado, F flares, G pelotão (transporte), C câmera. Com mira no mouse: o nariz gira até a mira e acompanha a altura dela; W/S/A/D inclinam; com o pairado automático ligado o nariz fica parado e só a torre segue a mira.

### Infantaria

| Tecla | Ação |
|---|---|
| Mouse | Apontar; o soldado vira com a mira |
| W / S / A / D | Andar para a frente, para trás e para os lados |
| Shift | Correr (em pé, enquanto houver fôlego) |
| Z | Postura: em pé, agachado, deitado |
| Botão esquerdo ou Espaço | Atirar |
| Botão direito | Mirar pela alça ou pela luneta: campo mais fechado, menos dispersão |
| Q | Trocar entre a arma principal e o lançador |
| R | Recarregar |
| F | Granada de mão |
| G | Granada de fumaça |
| N | Base de suprimento: abre e fecha o contorno da obra; o clique começa a obra, o botão direito cancela. Encostado em uma base inimiga, arma a carga de demolição |
| C | Visão por cima do ombro ou primeira pessoa |
| H | Trocar de classe ou de kit |

### Tanque, antiaérea e artilharia

Sempre com o mouse travado no jogo.

| Tecla | Ação |
| --- | --- |
| Mouse | Apontar. A torre gira até a mira no ritmo dela |
| W / S | Avançar e dar ré |
| A / D | Girar o casco |
| Botão esquerdo ou Espaço | Arma principal: canhão do tanque, canhão automático da antiaérea de 1944, míssil da antiaérea atual, obuseiro |
| Botão direito | Arma secundária: metralhadora do tanque e do obuseiro, granada de tempo, canhão de 30 mm |
| M | Artilharia: abrir e fechar o mapa de tiro |
| G | Tanque e artilharia: salva de granadas de fumaça |
| X | Freio |
| T | Segurar, parado: reparo de campo, uma peça por vez |
| C | Trocar a visão. Tanque: externa, luneta do atirador e comandante na escotilha. Antiaérea: externa e mira de anéis (1944) ou tela do operador (hoje). Artilharia: externa, luneta de tiro direto e mapa de tiro |
| Roda do mouse ou R | Aproximar e afastar a luneta, a câmera do rastreador ou o mapa de tiro |
| H | Trocar de veículo sem sair da partida |
| Esc | Soltar o mouse. Clique no jogo para voltar |

Na tela, o círculo é a mira e a cruz é para onde o cano aponta de verdade: atire quando os dois se encontrarem. Ao lado da mira aparece a distância até o chão sob ela, e o canhão do tanque já sobe o cano para essa distância. Na antiaérea, um círculo pequeno à frente do avião inimigo mostra onde apontar o canhão. O míssil só sai com um avião travado na mira (caixa vermelha com o nome do míssil e um bipe) ou com um míssil travado (losango amarelo e trinado).


# Texto para o README (ramo fort)

## Matas

As matas agora são densas: entre 28 e 30 mil árvores por mapa (eram 3 mil), em bosques fechados, faixas ao longo de trechos das estradas e das margens do rio, e um bosque a cada 800 m de estrada. A mancha verde-escura do mapa é a mata densa; o verde mais claro é mata rala, com árvores soltas, que não esconde ninguém.

- Um soldado dentro da mata densa é visto da metade da distância. Mata derrubada deixa de esconder.
- Tanque e obuseiro atravessam derrubando as árvores e perdem velocidade a cada uma.
- Veículo de rodas é parado pelo tronco: passa pelos vãos ou pelos aceiros, as faixas retas sem árvore que cortam os bosques.
- Tronco para bala e granada de canhão. Explosão derruba e queima as árvores dentro do raio. Avião que entra na copa é destruído.

## Trincheiras e sacos de areia

No modo de construção do soldado (N), a tecla N de novo troca o tipo: base de suprimento, trincheira, sacos de areia, e fecha. O contorno verde ou vermelho e o motivo valem para os três. O clique começa a obra atravessada à linha de visada, de frente para onde o soldado olha. Trincheira e sacos de areia não gastam kit e o modo continua aberto para a próxima peça. O botão direito sai.

| | Trincheira | Sacos de areia |
|---|---|---|
| Tamanho | 14 m por 2,6 m | 7 m de parede |
| Um soldado constrói em | 40 s | 12 s |
| Limite por lado (fora as já cavadas) | 12 | 16 |
| Onde não pode | estrada, água, casa, árvore, em cima de outra obra, inimigo a menos de 25 m | idem; pode dentro da vila e ao lado de base |

Cada soldado a mais parado junto da obra acelera, como na base. Obra abandonada por 25 s se desfaz.

**Na trincheira** o soldado em pé fica só com a cabeça para fora e atira por cima da borda. Agachado ou deitado some inteiro e não vê nada. Tiro reto só acerta o que aparece. Explosão que cai fora quase não o atinge. Granada, morteiro ou obus que cai dentro mata. O HUD mostra ABRIGADO.

**Atrás dos sacos de areia** o soldado agachado atira por cima e só mostra cabeça e ombros; deitado fica todo coberto. A parede só protege do lado em que está.

**Veículos.** Tanque e obuseiro cruzam a trincheira devagar. Veículo de rodas não cruza, a não ser pelas pranchas das trincheiras que têm passagem. Tanque passa por cima dos sacos de areia e os achata; um ou dois tiros de canhão ou um foguete abrem a parede.

**Já cavadas no começo da partida:** nos postos de linha dos dois lados, a 1500 m de cada base principal, num arco na frente de cada vila, e duas paredes de sacos de areia em cada posto de guarnição.

**A IA** ocupa as trincheiras dos seus postos, corre para a obra mais próxima sob fogo, cava quando está parada num posto sem inimigo a menos de 500 m, ergue sacos de areia em volta de base de suprimento que guarda, lança granada em arco para dentro da trincheira ocupada e manda a artilharia nela.

**Online.** Com servidor antigo ninguém constrói trincheira nem sacos de areia (o contorno avisa); as já cavadas existem e são danificadas normalmente.


# Texto para o README (ramo transport)

## Na lista de classes

- **Transporte**: carro leve, caminhão e, na Frente atual, blindado sobre rodas. Em 1944: Kübelwagen e Opel Blitz (Luftwaffe), Jeep Willys com .50 e GMC CCKW (Aliados). Hoje: HMMWV M1151, HEMTT e LAV-25 (Força Azul), GAZ Tigr-M, Ural-4320 e BTR-82A (Força Vermelha).

## Seção nova: Transporte

A base principal fica a quilômetros do combate. Nos 3 km da entrada até a linha, um pelotão a pé leva uns 15 minutos; de carro, 2 a 2,5; de caminhão, 3 a 4; de blindado, 2.

- **Embarcar**: um soldado ao lado de um carro, caminhão ou blindado aliado parado aperta **E**. No modo solo ele senta ao volante se o veículo estiver vazio, senão na metralhadora ou no canhão (a IA continua dirigindo), senão de passageiro; **Q**, com o veículo parado, troca de assento; **E** de novo desembarca. Online o soldado vai sempre de passageiro, em veículo de outro jogador ou da IA; para dirigir, entre como Transporte.
- **Veículos estacionados**: perto de onde os soldados entram, ao lado da estrada, cada lado mantém um carro e um caminhão vazios. Quem leva um, outro aparece depois de um minuto.
- **Levar o pelotão**: ao volante, **F** chama a bordo os pelotões aliados a até 70 m que não estejam em combate; com eles a bordo, **F** manda descer. Eles também descem sozinhos com inimigo perto (260 m do carro, 300 m do caminhão, 150 m do blindado) ou quando o veículo é atingido, e ficam guardando o lugar.
- **Proteção**: no carro aberto, quase nenhuma; no caminhão, parcial; no blindado, fuzil, metralhadora e quase todo estilhaço não passam, mas canhão de tanque, foguete anticarro e calibre .50 nos lados e na traseira passam. Quando o veículo é destruído, cada um a bordo tem uma chance de sair, ferido: 70% se foi fogo ou tiro leve, perto da metade ou menos se foi granada perfurante, míssil ou a munição explodindo.
- **Caminhão**: remunicia os soldados ao lado, como os caminhões da IA, e leva material de obra: estacionado a até 20 m de uma base de suprimento em construção, com alguém construindo, a obra anda no ritmo de mais um construtor por 70 s (uma base com um construtor só fica pronta em metade do tempo). O material é reposto numa base.
- **Blindado sobre rodas** (Hoje): canhão automático de 25 ou 30 mm e metralhadora coaxial na torre, granadas de fumaça, pelotão inteiro lá dentro, anfíbio (atravessa o rio a uns 10 km/h, o que nenhum outro veículo de solo faz), dano por peça como os tanques, com rodas no lugar das lagartas. Forte contra infantaria, caminhões, carros, antiaéreas, outros blindados leves e aeronaves baixas; fraco contra a frente de um tanque.
- **A IA**: cada lado mantém um carro de patrulha na estrada atrás da linha, manda um carro ou caminhão buscar o pelotão que ficou longe do seu posto, e na Frente atual as colunas trazem um ou dois blindados sobre rodas, cada um com um pelotão.

## Seção nova: Atirador de elite

Um kit a mais na Infantaria de cada lado: Kar 98k com luneta e Springfield M1903A4 em 1944; Barrett M82A1 e OSV-96, calibre .50, hoje. Pistola como arma secundária (**Q**).

- **Luneta** (botão direito) com dois aumentos (roda do mouse): 4× e 7× em 1944, 7× e 15× hoje. O projétil cai de verdade e leva tempo para chegar (a 600 m, 0,7 a 0,8 s e de 2,4 a 3 m de queda): as marcas abaixo do centro mostram onde mirar a cada 200 m.
- **A mira oscila**: muito em pé, menos agachado, pouco deitado e parado depois de um segundo e meio. **Shift** prende o fôlego e firma a mira por até 4,5 s; segurar até o fim deixa a mira tremendo.
- Fora da luneta o tiro sai disperso, a cadência é baixa e a recarga é lenta: de perto, use a pistola. Tiro na cabeça mata.
- **Deitado e parado** por 2,5 s, o atirador fica muito mais difícil de ver (a uns 70 m em campo aberto, contra 330 m de um fuzileiro deitado). Atirar ou rastejar o revela.
- **Antimaterial** (Hoje): o .50 fere veículos leves pela peça que estiver na linha do tiro (motor, rodas, e a tripulação pelo casco): caminhões, carros, antiaéreas, obuseiros abertos, os lados e a traseira dos blindados sobre rodas, e aeronaves quando acerta. Nada contra tanque. Os fuzis de 1944 não fazem nada em veículo.
- **A IA** troca um fuzileiro por um atirador em cada guarnição e em cada piquete da mata: ele fica deitado, escolhe primeiro outro atirador, depois o metralhador, a tripulação exposta e o líder, e muda de posição depois de alguns tiros.

## Em "Teclas"

| Tecla | Quem | O que faz |
|---|---|---|
| E | soldado | embarcar no transporte aliado ao lado; a bordo, desembarcar |
| Q | soldado a bordo (solo) | trocar de assento, com o veículo parado |
| F | quem dirige um transporte | chamar o pelotão a bordo, ou mandar descer |
| Shift | atirador na luneta | prender o fôlego |
| Roda do mouse | atirador na luneta | trocar o aumento |

## Em "Servidor"

`welcome` informa `trn: 1`. Mensagens novas: `board` (soldado pede assento ao dono do veículo), `seats` (quem está a bordo, do dono para a sala), `eject` (o dono de um veículo perdido diz a quem estava a bordo o que sofreu e quem causou), `cargo` (convidado ao volante pede ao anfitrião para chamar ou descer pelotões). Com um servidor que não diz `trn`, a página funciona como antes, sem transporte e sem atirador.

## Em "Testes"

```
node tests/transport.js            # transporte e atirador: assentos, proteção, destruição, caminhão, tempos de viagem, blindado, balística, IA (N=400)
node tests/transport-relay.js      # servidor: classe trn, kits de atirador, board, seats, eject, cargo
node tests/transport-online.js     # pelo servidor de verdade: passageiro humano e pelotão num caminhão vistos por um terceiro, veículo perdido, abates de blindado e de atirador, troca no meio, troca de anfitrião com caminhão carregado
node tests/transport-oldserver.js  # a página nova contra um servidor que não conhece transporte, SERVER=<server.js antigo>
node tests/transport-battle.js     # batalhas só de IA, antes e depois, BASE=<página de antes> (SECS=600)
```


# Texto para o README (ramo crew)

## Na seção Transporte, no lugar do parágrafo "Embarcar"

- **Um corpo, vários veículos**: quem entra como Transporte é um soldado ao volante (o fuzileiro do seu lado, ou o último kit de infantaria que você usou). Parado ou devagar, **E** desce: você segue a pé, com os comandos, o painel e as visões da infantaria, e o veículo fica estacionado onde está, com o dano, a munição, a fumaça e o pelotão que tinha a bordo. Descer não conta como perda.
- **Entrar**: qualquer soldado, o que entrou como infantaria ou o que desceu de um veículo, ao lado de um carro, caminhão ou blindado sobre rodas aliado parado aperta **E**. O aviso na tela diz o assento: motorista se ninguém dirige, senão atirador, senão passageiro. No volante vale tudo o que vale para quem entrou de Transporte; na arma você aponta e atira. **Q**, com o veículo parado, troca de assento: sozinho num carro armado, do volante para a arma e de volta (no modo solo também para os assentos de passageiro).
- **Veículo deixado**: fica vazio e calado, não some enquanto houver um jogador a menos de 300 m, e depois de 4 min sem ninguém por perto é recolhido (longe dos jogadores, o lado guarda no máximo 4 assim). O inimigo não entra nele, mas pode destruí-lo: veículo vazio destruído não é perda de ninguém. A IA usa um veículo deixado junto da estrada quando um pelotão ali perto precisa de carona.
- **Veículo destruído com você dentro**: o motorista é arremessado como qualquer passageiro. Se sair vivo continua a pé, sem perder nada; se morrer, é uma perda. Um tiro que atravessa um carro aberto pode matar o motorista e deixar o veículo inteiro.
- **Volta**: você volta sempre na classe que escolheu por último (quem entrou de Transporte e morreu a pé volta de Transporte). **H** ao volante faz o soldado descer antes de abandonar o posto: o veículo fica.
- **Só nos veículos de transporte**: tanque, antiaérea, artilharia, avião e helicóptero continuam sendo o próprio veículo.

## Online

`welcome` informa `crew: 1`. O registro do jogador no servidor acompanha o corpo: `inf` a pé, `trn` no volante ou na arma. Um veículo sem humano no volante nem na arma é do anfitrião, como qualquer veículo estacionado da IA; com humano, é desse jogador. Mensagens novas: `crew` (mudei de corpo; ao descer leva o estado do veículo deixado, e `x` quando ele foi perdido), `drive` (um soldado pede ao anfitrião o volante ou a arma de um veículo estacionado) e `grant` (o anfitrião entrega, com o estado do veículo). Um veículo perdido com o motorista vivo conta na coluna de veículos de quem o destruiu, sem abate nem queda. Quem sai da sala ao volante deixa o veículo estacionado. Com um servidor antigo vale o de antes: quem entra de Transporte é o veículo e não desce, e o soldado só embarca como passageiro.

Online ainda não dá para ser atirador de um veículo que outro jogador ou a IA está dirigindo, nem trocar para um assento de passageiro sem descer.

## Onde entrar

Quem entra numa partida de classe de chão quando o seu lado já tem uma base de suprimento pronta e segura vê por 10 s a escolha "Onde entrar": sem escolher, fica na base principal. A tela depois de uma perda aponta para a mesma lista.

## Na tabela de teclas

| Tecla | Quem | O que faz |
|---|---|---|
| E | no volante ou na arma de um transporte, parado ou devagar | descer; o veículo fica estacionado |
| E | soldado ao lado de um transporte aliado | entrar: motorista, atirador ou passageiro |
| Q | a bordo, parado | próximo assento |

## Em Testes

```
node tests/crew.js            # tripulação, solo
node tests/crew-relay.js      # servidor: crew, drive, grant
node tests/crew-online.js     # troca de dono do veículo pelo servidor de verdade
```
