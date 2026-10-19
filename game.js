// 1. ESTADO GLOBAL DEL JUEGO
let juego = {
    monedas: 0,
    monedasTotalesObtenidas: 0,
    almas: 0,
    monedasPorClic: 1,
    multiplicadores: {
        oro: 1, almas: 1, clic: 1,
        tiempoOroRestante: 0, tiempoClicRestante: 0,
        almasPrestigioActivo: false
    },
    edificios: {
        cursor:   { cantidad: 0, costoBase: 15,   mpsBase: 0.5, costoActual: 15,   nombre: "Auto-Cursor" },
        mina:     { cantidad: 0, costoBase: 100,  mpsBase: 4,   costoActual: 100,  nombre: "Mina de Monedas" },
        alquimia: { cantidad: 0, costoBase: 1100, mpsBase: 32,  costoActual: 1100, nombre: "Torre Alquímica" }
    },
    ultimoGuardado: Date.now()
};

// 2. REFERENCIAS AL DOM
const ui = {
    monedas: document.getElementById('ui-monedas'),
    mps: document.getElementById('ui-mps'),
    almas: document.getElementById('ui-almas'),
    monedasClic: document.getElementById('ui-monedas-clic'),
    btnClick: document.getElementById('click-button'),
    clickTextContainer: document.getElementById('click-text-container'),
    shopList: document.getElementById('shop-list'),
    prestigeAlmas: document.getElementById('ui-prestige-almas'),
    btnPrestige: document.getElementById('btn-prestige'),
    timerOro: document.getElementById('timer-oro'),
    timerClic: document.getElementById('timer-clic'),
    timerAlmas: document.getElementById('timer-almas'),
    btnAdOro: document.getElementById('btn-ad-oro'),
    btnAdClic: document.getElementById('btn-ad-clic'),
    btnAdAlmas: document.getElementById('btn-ad-almas'),
    adModal: document.getElementById('ad-modal'),
    adCountdown: document.getElementById('ad-countdown'),
    offlineModal: document.getElementById('offline-modal'),
    offlineAmount: document.getElementById('offline-amount'),
    btnClaimOffline: document.getElementById('btn-claim-offline'),
    btnClaimNormal: document.getElementById('btn-claim-normal')
};

// 3. AUDIO 8-BIT
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); }
function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    if (type === 'click') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'buy') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'prestige') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }
}

// 4. MATEMÁTICAS
function formatearNumero(num) {
    if (num < 1000) return num.toFixed(1).replace('.0', '');
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const exp = Math.floor(Math.log10(num) / 3);
    return (num / Math.pow(1000, exp)).toFixed(2) + ' ' + suffixes[exp];
}

function calcularCosto(edificio) { return Math.floor(edificio.costoBase * Math.pow(1.15, edificio.cantidad)); }

function calcularMPS() {
    let mpsBaseTotal = 0;
    for (let key in juego.edificios) mpsBaseTotal += juego.edificios[key].cantidad * juego.edificios[key].mpsBase;
    return mpsBaseTotal * (1 + (juego.almas * 0.05)) * juego.multiplicadores.oro;
}

function calcularAlmasPrestigio() {
    let almas = Math.floor(15 * Math.sqrt(juego.monedasTotalesObtenidas / 100000));
    if (juego.multiplicadores.almasPrestigioActivo) almas *= 2;
    return almas;
}

// 5. UI Y JUEGO
function updateUI() {
    ui.monedas.textContent = formatearNumero(juego.monedas);
    ui.mps.textContent = formatearNumero(calcularMPS());
    ui.almas.textContent = formatearNumero(juego.almas);
    ui.monedasClic.textContent = formatearNumero(juego.monedasPorClic * juego.multiplicadores.clic * juego.multiplicadores.oro);

    for (let key in juego.edificios) {
        let ed = juego.edificios[key];
        let btn = document.getElementById(`btn-buy-${key}`);
        let qty = document.getElementById(`qty-${key}`);
        let cost = document.getElementById(`cost-${key}`);
        if (btn) {
            cost.textContent = formatearNumero(ed.costoActual) + ' Oro';
            qty.textContent = ed.cantidad;
            btn.classList.toggle('disabled', juego.monedas < ed.costoActual);
        }
    }

    ui.prestigeAlmas.textContent = formatearNumero(calcularAlmasPrestigio());
    ui.btnPrestige.disabled = calcularAlmasPrestigio() < 1;

    if (juego.multiplicadores.tiempoOroRestante > 0) { ui.timerOro.textContent = formatearTiempo(juego.multiplicadores.tiempoOroRestante); ui.btnAdOro.disabled = true; } 
    else { ui.timerOro.textContent = ''; ui.btnAdOro.disabled = false; }

    if (juego.multiplicadores.tiempoClicRestante > 0) { ui.timerClic.textContent = formatearTiempo(juego.multiplicadores.tiempoClicRestante); ui.btnAdClic.disabled = true; } 
    else { ui.timerClic.textContent = ''; ui.btnAdClic.disabled = false; }

    if (juego.multiplicadores.almasPrestigioActivo) { ui.timerAlmas.textContent = 'ACTIVO'; ui.btnAdAlmas.disabled = true; } 
    else { ui.timerAlmas.textContent = ''; ui.btnAdAlmas.disabled = false; }
}

function formatearTiempo(segundos) {
    let h = Math.floor(segundos / 3600), m = Math.floor((segundos % 3600) / 60), s = Math.floor(segundos % 60);
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}

function generarTienda() {
    ui.shopList.innerHTML = '';
    for (let key in juego.edificios) {
        let ed = juego.edificios[key];
        let div = document.createElement('div');
        div.className = 'shop-item';
        div.id = `btn-buy-${key}`;
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name">${ed.nombre}</span>
                <span class="item-cost" id="cost-${key}">0</span>
            </div>
            <div class="item-stats">
                <span class="item-qty" id="qty-${key}">0</span>
                <span class="item-mps">+${ed.mpsBase} MPS</span>
            </div>`;
        div.addEventListener('click', () => comprarEdificio(key));
        ui.shopList.appendChild(div);
    }
}

function comprarEdificio(key) {
    let ed = juego.edificios[key];
    if (juego.monedas >= ed.costoActual) {
        juego.monedas -= ed.costoActual;
        ed.cantidad++;
        ed.costoActual = calcularCosto(ed);
        playSound('buy');
        updateUI();
    }
}

function clicManual(e) {
    initAudio();
    let ganancia = juego.monedasPorClic * juego.multiplicadores.clic * juego.multiplicadores.oro;
    juego.monedas += ganancia;
    juego.monedasTotalesObtenidas += ganancia;
    playSound('click');
    crearTextoFlotante(e, `+${formatearNumero(ganancia)}`);
    updateUI();
}

function crearTextoFlotante(e, texto) {
    const span = document.createElement('span');
    span.className = 'floating-text'; span.textContent = texto;
    const rect = ui.btnClick.getBoundingClientRect();
    span.style.left = `${e.clientX - rect.left}px`;
    span.style.top = `${e.clientY - rect.top}px`;
    ui.clickTextContainer.appendChild(span);
    setTimeout(() => span.remove(), 1000);
}

function reiniciarPrestigio() {
    let almasGanadas = calcularAlmasPrestigio();
    if (almasGanadas < 1) return;
    if(confirm(`¿Reiniciar? Ganarás ${almasGanadas} Almas Astrales.`)) {
        juego.almas += almasGanadas;
        juego.monedas = 0; juego.monedasTotalesObtenidas = 0;
        juego.multiplicadores.almasPrestigioActivo = false;
        for (let key in juego.edificios) {
            juego.edificios[key].cantidad = 0;
            juego.edificios[key].costoActual = juego.edificios[key].costoBase;
        }
        playSound('prestige'); saveGame(); updateUI();
    }
}

// 6. ANUNCIOS
function simularAnuncio(tipo) {
    ui.adModal.classList.remove('hidden');
    let timeLeft = 5; ui.adCountdown.textContent = timeLeft;
    let interval = setInterval(() => {
        timeLeft--; ui.adCountdown.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval); ui.adModal.classList.add('hidden'); otorgarRecompensa(tipo);
        }
    }, 1000);
}

function otorgarRecompensa(tipo) {
    if (tipo === 'oro') { juego.multiplicadores.oro = 2; juego.multiplicadores.tiempoOroRestante = 3600; } 
    else if (tipo === 'clic') { juego.multiplicadores.clic = 2; juego.multiplicadores.tiempoClicRestante = 1800; } 
    else if (tipo === 'almas') { juego.multiplicadores.almasPrestigioActivo = true; }
    updateUI(); saveGame();
}

// 7. OFFLINE Y GUARDADO
function checkOfflineEarnings() {
    let timeDiff = (Date.now() - juego.ultimoGuardado) / 1000;
    if (timeDiff > 60) {
        let ganancias = calcularMPS() * Math.min(timeDiff, 28800);
        if (ganancias > 0) {
            ui.offlineAmount.textContent = formatearNumero(ganancias);
            ui.offlineModal.classList.remove('hidden');
            ui.btnClaimNormal.onclick = () => { juego.monedas += ganancias; ui.offlineModal.classList.add('hidden'); updateUI(); };
            ui.btnClaimOffline.onclick = () => {
                ui.offlineModal.classList.add('hidden'); ui.adModal.classList.remove('hidden');
                let timeLeft = 5; ui.adCountdown.textContent = timeLeft;
                let interval = setInterval(() => {
                    timeLeft--; ui.adCountdown.textContent = timeLeft;
                    if (timeLeft <= 0) {
                        clearInterval(interval); ui.adModal.classList.add('hidden');
                        juego.monedas += (ganancias * 2); updateUI();
                    }
                }, 1000);
            };
        }
    }
}

function saveGame() { juego.ultimoGuardado = Date.now(); localStorage.setItem('chavitaClickerSave', JSON.stringify(juego)); }
function loadGame() {
    let saved = localStorage.getItem('chavitaClickerSave');
    if (saved) {
        juego = { ...juego, ...JSON.parse(saved) };
        for (let key in juego.edificios) juego.edificios[key].costoActual = calcularCosto(juego.edificios[key]);
    }
}

// 8. INICIO
function init() {
    loadGame(); generarTienda(); checkOfflineEarnings(); updateUI();
    ui.btnClick.addEventListener('mousedown', clicManual);
    ui.btnPrestige.addEventListener('click', reiniciarPrestigio);
    ui.btnAdOro.addEventListener('click', () => simularAnuncio('oro'));
    ui.btnAdClic.addEventListener('click', () => simularAnuncio('clic'));
    ui.btnAdAlmas.addEventListener('click', () => simularAnuncio('almas'));
    setInterval(() => {
        let ganancia = calcularMPS() / 10;
        juego.monedas += ganancia; juego.monedasTotalesObtenidas += ganancia;
        if (juego.multiplicadores.tiempoOroRestante > 0) { juego.multiplicadores.tiempoOroRestante -= 0.1; if (juego.multiplicadores.tiempoOroRestante <= 0) juego.multiplicadores.oro = 1; }
        if (juego.multiplicadores.tiempoClicRestante > 0) { juego.multiplicadores.tiempoClicRestante -= 0.1; if (juego.multiplicadores.tiempoClicRestante <= 0) juego.multiplicadores.clic = 1; }
        updateUI();
    }, 100);
    setInterval(saveGame, 5000);
}
init();