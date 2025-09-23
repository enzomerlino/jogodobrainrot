const TIME_LIMIT = 60;

// IMAGES — catálogo de cartas (cada item vira um par)
const IMAGES = [
    { key: 'BallerinaCapuccina', src: '../img/BallerinaCapuccina.png', alt: 'Ballerina Capuccina', sound: '../audio/BallerinaCapuccina.mpeg' },
    { key: 'BrrBrrPatapim', src: '../img/BrrBrrPatapim.png', alt: 'Brr Brr Patapim', sound: '../audio/BrrBrrPatapim.mp3' },
    { key: 'CappuccinoAssassino', src: '../img/CappuccinoAssassino.png', alt: 'Cappuccino Assassino', sound: '../audio/CappuccinoAssassino.mp3' },
    { key: 'ChimpanziniBananini', src: '../img/ChimpanziniBananini.png', alt: 'Chimpanzini Bananini', sound: '../audio/ChimpanziniBananini.mp3' },
    { key: 'EspressoSignora', src: '../img/EspressoSignora.png', alt: 'Espresso Signora', sound: '../audio/EspressoSignora.mp3' },
    { key: 'LiliriLalira', src: '../img/LiliriLalira.png', alt: 'Liliri Lalira', sound: '../audio/Lirililarila.mp3' },
    { key: 'TralaleroTralala', src: '../img/TralaleroTralala.png', alt: 'Tralalero Tralala', sound: '../audio/TralaleroTralala.mp3' },
    { key: 'TungTungSahur', src: '../img/TungTungSahur.png', alt: 'Tung Tung Sahur', sound: '../audio/TungTungSahur.mp3' },
    { key: 'OdinDinDun', src: '../img/OdinDinDun.png', alt: 'Odin Din Dun', sound: '../audio/OdinDinDun.mp3' }
];

// Referências de DOM
const grid = document.getElementById('grid');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const resetBtn = document.getElementById('resetBtn');
const playBtn = document.getElementById('playBtn');
const liveEl = document.getElementById('live');

// state — estado global da partida
let state = {
    first: null,
    lock: false,
    pairsLeft: IMAGES.length,
    moves: 0,
    seconds: 0,
    tick: null,
    gameOver: false
};

/* shuffle(arr)
   — Embaralha um array in-place (Fisher–Yates) e retorna o próprio array. */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* buildBoard()
   — Monta o tabuleiro: duplica IMAGES, embaralha, cria as cartas e define estado inicial (viradas). */
function buildBoard() {
    grid.innerHTML = '';
    const deck = shuffle([...IMAGES, ...IMAGES]);

    deck.forEach((item, idx) => {
        const card = document.createElement('button');
        card.className = 'card';
        card.type = 'button';
        card.setAttribute('aria-label', 'Carta virada');
        card.dataset.symbol = item.key;
        card.dataset.index = idx.toString();
        card.dataset.label = item.alt;

        const inner = document.createElement('div');
        inner.className = 'inner';

        const front = document.createElement('div');
        front.className = 'face front';

        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt;
        img.decoding = 'async';
        img.loading = 'eager';
        front.appendChild(img);

        const back = document.createElement('div');
        back.className = 'face back';

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        // estado inicial: carta virada para o verso
        gsap.set(inner, { rotateY: 180 });

        card.addEventListener('click', () => onFlip(card));
        grid.appendChild(card);
    });
}

/* formatMMSS(total)
   — Converte segundos em "MM:SS". */
function formatMMSS(total) {
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/* updateTimerLabel(elapsed)
   — Atualiza o rótulo do cronômetro com o tempo restante. */
function updateTimerLabel(elapsed) {
    const remaining = Math.max(0, TIME_LIMIT - elapsed);
    timerEl.textContent = `Tempo: ${formatMMSS(remaining)}`;
}

/* startTimer()
   — Reinicia e inicia o cronômetro; dispara gameOver quando zera. */
function startTimer() {
    clearInterval(state.tick);
    state.seconds = 0;
    updateTimerLabel(0);
    state.tick = setInterval(() => {
        state.seconds++;
        updateTimerLabel(state.seconds);
        if (state.seconds >= TIME_LIMIT && !state.gameOver) {
            gameOver();
        }
    }, 1000);
}

/* onFlip(card)
   — Lida com o clique: vira carta, checa par, aplica animações e controla travas. */
function onFlip(card) {
    if (state.lock || state.gameOver) return;

    const inner = card.querySelector('.inner');
    const angle = (gsap.getProperty(inner, 'rotateY') + 360) % 360;
    const isFaceUp = (angle < 90 || angle > 270);

    if (!isFaceUp) {
        flipUp(card);

        // 🔊 Toca o som da carta
        const symbol = card.dataset.symbol;
        const imgData = IMAGES.find(item => item.key === symbol);
        if (imgData && imgData.sound) {
            const audio = new Audio(imgData.sound);
            audio.play().catch(err => console.log("Erro ao reproduzir som:", err));
        }

        if (!state.first) {
            state.first = card;
        } else {
            state.lock = true;
            state.moves++;
            movesEl.textContent = `Movimentos: ${state.moves}`;

            const match = state.first.dataset.symbol === card.dataset.symbol && state.first !== card;

            setTimeout(() => {
                if (match) {
                    celebrateMatch([state.first, card]);
                    state.pairsLeft--;
                    if (liveEl) {
                        liveEl.textContent = `Acertou um par de ${card.dataset.label}. Restam ${state.pairsLeft} pares.`;
                    }
                    if (state.pairsLeft === 0) {
                        winGame();
                    }
                } else {
                    shakeMismatch([state.first, card]);
                    flipDown(state.first);
                    flipDown(card);
                }
                state.first = null;
                state.lock = false;
            }, 450);
        }
    }
}

/* flipUp(card)
   — Anima a virada para mostrar a frente. */
function flipUp(card) {
    const inner = card.querySelector('.inner');
    gsap.to(inner, { duration: .35, rotateY: 0, ease: 'power2.out', force3D: true });
}

/* flipDown(card)
   — Anima a virada para mostrar o verso. */
function flipDown(card) {
    const inner = card.querySelector('.inner');
    gsap.to(inner, { duration: .35, rotateY: 180, ease: 'power2.in', force3D: true });
}

/* shakeMismatch(cards)
   — Efeito de “erro” (sacode) e bloqueia cliques durante a animação. */
function shakeMismatch(cards) {
    cards.forEach(c => c.disabled = true);
    gsap.fromTo(cards, { x: 0 }, {
        x: 8, duration: .12, yoyo: true, repeat: 3, ease: 'power1.inOut',
        onComplete: () => cards.forEach(c => c.disabled = false)
    });
}

/* celebrateMatch(cards)
   — Efeito simples de acerto (pulse + destaque). */
function celebrateMatch(cards) {
    cards.forEach(c => {
        c.disabled = true;
        c.setAttribute('aria-label', 'Par encontrado');
    });
    const tl = gsap.timeline();
    tl.to(cards, { duration: .18, scale: 1.06, ease: 'power2.out' })
        .to(cards, { duration: .22, scale: 1, ease: 'power2.in' })
        .to(cards, { duration: .25, boxShadow: '0 0 0 3px var(--win), 0 12px 24px rgba(0,0,0,.45)' }, 0)
        .to(cards.map(c => c.querySelector('.front')), { duration: .25, color: 'var(--win)' }, 0);
}

/* winGame()
   — Finaliza a partida com mensagem de vitória. */
function winGame() {
    if (state.gameOver) return;   // evita conflito com gameOver por tempo
    clearInterval(state.tick);
    state.lock = true;

    const msg = document.createElement('div');
    msg.textContent = `Parabéns! Você venceu em ${state.moves} movimentos e ${formatMMSS(state.seconds)}.`;
    Object.assign(msg.style, {
        position: 'fixed', inset: 'auto 0 24px 0', margin: '0 auto', width: 'fit-content',
        padding: '12px 16px', borderRadius: '12px', background: 'var(--win)', color: '#052e16',
        fontWeight: '700', boxShadow: '0 10px 30px rgba(0,0,0,.35)', zIndex: 9999
    });
    document.body.appendChild(msg);
    gsap.from(msg, { y: 40, opacity: 0, duration: .35, ease: 'power2.out' });
    setTimeout(() => gsap.to(msg, { opacity: 0, duration: .4, onComplete: () => msg.remove() }), 3000);
}

/* gameOver()
   — Dispara quando o tempo acaba: bloqueia cartas e mostra overlay simples. */
function gameOver() {
    state.gameOver = true;
    clearInterval(state.tick);
    state.lock = true;

    grid.querySelectorAll('.card').forEach(c => c.disabled = true);
    if (liveEl) { liveEl.textContent = 'Tempo esgotado. Fim de jogo.'; }

    let layer = document.getElementById('gameover-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'gameover-layer';
        Object.assign(layer.style, {
            position: 'fixed', inset: '0', background: 'rgba(0,0,0,.55)',
            display: 'grid', placeItems: 'center', zIndex: 9998
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            padding: '16px 20px', borderRadius: '12px',
            background: '#ef4444', color: '#111827', fontWeight: '700',
            boxShadow: '0 10px 30px rgba(0,0,0,.4)', textAlign: 'center'
        });
        box.innerHTML = `⏱️ Tempo esgotado!<br>Tente novamente.`;
        layer.appendChild(box);
        document.body.appendChild(layer);
        gsap.from(box, { y: 30, opacity: 0, duration: .35, ease: 'power2.out' });
        layer.addEventListener('click', () => gsap.to(layer, { opacity: 0, duration: .3, onComplete: () => layer.remove() }));
    }
}

/* resetGame()
   — Zera o estado da partida e reconstrói o tabuleiro. */
function resetGame() {
    clearInterval(state.tick);
    state = {
        first: null,
        lock: false,
        pairsLeft: IMAGES.length,
        moves: 0,
        seconds: 0,
        tick: null,
        gameOver: false
    };
    const layer = document.getElementById('gameover-layer');
    if (layer) layer.remove();

    movesEl.textContent = 'Movimentos: 0';
    updateTimerLabel(0);
    buildBoard();
    startTimer();
}

/* Listeners — ações dos botões */
resetBtn.addEventListener('click', resetGame);
playBtn.addEventListener('click', () => { buildBoard(); startTimer(); });

/* Bootstrap — monta e inicia o jogo imediatamente */
buildBoard();
startTimer();