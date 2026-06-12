
// === SISTEMA EXPLICALIA: núcleo de lógica + banco de frases ===
const ExplicaliaSystem = (() => {
  let inGameMessagesShown = 0;
  let lastInGameMessageTime = 0;

  const MAX_IN_GAME_MESSAGES_PER_GAME = 3;
  const IN_GAME_MESSAGE_COOLDOWN_MS = 12000;

  function getPlayerNameSafe() {
    try {
      const saved = window.SecureStorage?.load?.("bubbleShooterSave");
      return saved?.playerName?.trim() || localStorage.getItem("playerName")?.trim() || "";
    } catch (e) {
      return "";
    }
  }

    // Banco de frases
    const QUOTES = [
        // PRE PARTIDA
        {
            id: "pre_new_player_start",
            context: "pre",
            tone: "sardonic",
            condition: "playerIsNew && totalGames == 0",
            text: "Nadie acierta el primer disparo que importa."
        },
        {
            id: "pre_many_games",
            context: "pre",
            tone: "sardonic",
            condition: "totalGames >= 20",
            text: "Si sigues viniendo es que el tablero aún gana algunas."
        },
        {
            id: "pre_many_retries",
            context: "pre",
            tone: "sardonic",
            condition: "retriesOnCurrentLevel >= 3",
            text: "Hay niveles que se superan. Y niveles que se estudian."
        },

        // EN PARTIDA
        {
            id: "mid_big_cascade",
            context: "in_game",
            tone: "tactical",
            condition: "fallenByDisconnectionThisShot >= 10",
            text: "Eso no ha sido suerte. Ha sido secuencia."
        },
        {
            id: "mid_many_shots_no_cascade",
            context: "in_game",
            tone: "sardonic",
            condition: "shotsSinceLastCascade >= 3 && boardNotImproving",
            text: "Tres disparos sin derribo. Ensayo prolongado."
        },
        {
            id: "mid_wasted_bounce",
            context: "in_game",
            tone: "sardonic",
            condition: "isBounceShot && !createdCluster && !improvedBoard",
            text: "El ángulo era válido. La jugada, no tanto."
        },
        {
            id: "mid_board_near_death",
            context: "in_game",
            tone: "tactical",
            condition: "nearDeathState == true",
            text: "Cuando todo sube, solo sirve un disparo que haga caer."
        },

        // POST PARTIDA
        {
            id: "post_heavy_disconnect_play",
            context: "post",
            tone: "tactical",
            condition: "fallenByDisconnectionRatio >= 0.6 && result == 'win'",
            text: "Has jugado a derribar, no a decorar el tablero."
        },
        {
            id: "post_fast_loss",
            context: "post",
            tone: "sardonic",
            condition: "result == 'lose' && gameDurationMs < 60000",
            text: "Hay partidas cortas. Y luego está esta."
        },
        {
            id: "post_long_fight_loss",
            context: "post",
            tone: "sardonic",
            condition: "result == 'lose' && nearDeathMoments > 0 && totalShots > 25",
            text: "El tablero te dio varias salidas. Elegiste quedarte dentro."
        },
        {
            id: "post_clean_win",
            context: "post",
            tone: "tactical",
            condition: "result == 'win' && remainingBubbles <= 5",
            text: "Así se ve un tablero bien leído."
        }
    ];

  function resetForNewGame() {
    inGameMessagesShown = 0;
    lastInGameMessageTime = 0;
  }

  function onEnterMainMenu(playerState, globalStats) {
    const name = getPlayerNameSafe();
    const message = pickPreGameMessage(playerState, globalStats, name);
    if (message) {
      window.UIController.showExplicaliaPreMessage(message);
    }
  }

  function onShotResolved(result, boardState, analytics) {
    if (!canShowInGameMessage()) return;
    const name = getPlayerNameSafe();
    const message = pickInGameMessage(result, boardState, analytics, name);
    if (!message) return;
    window.UIController.showExplicaliaBar(message);
    inGameMessagesShown++;
    lastInGameMessageTime = performance.now();
  }

  function onGameEnded(result, analytics) {
    const name = getPlayerNameSafe();
    const lines = pickPostGameMessages(result, analytics, name);
    if (lines && lines.length) {
      window.UIController.showExplicaliaPostMessage(lines, analytics);
    }
  }

  function canShowInGameMessage() {
    if (inGameMessagesShown >= MAX_IN_GAME_MESSAGES_PER_GAME) return false;
    const now = performance.now();
    if (now - lastInGameMessageTime < IN_GAME_MESSAGE_COOLDOWN_MS) return false;
    return true;
  }

  // --- Selección de mensajes por contexto ---

  function pickPreGameMessage(playerState, globalStats, name) {
    const context = "pre";
    const candidates = QUOTES.filter(q =>
      q.context === context &&
      evaluateCondition(q.condition, { playerState: playerState || {}, globalStats: globalStats || {}, analytics: {} })
    );
    if (!candidates.length) {
      if (name) return `Sistema Explicalia:\nHola, ${name}. Tablero preparado.`;
      return "";
    }
    return personalizeText(randomFrom(candidates).text, name, null);
  }

  function pickInGameMessage(result, boardState, analytics, name) {
    const context = "in_game";
    const env = { result: result || {}, boardState: boardState || {}, analytics: analytics || {} };
    const candidates = QUOTES.filter(q =>
      q.context === context && evaluateCondition(q.condition, env)
    );
    if (!candidates.length) return "";
    return personalizeText(randomFrom(candidates).text, name, analytics);
  }

    function pickPostGameMessages(result, analytics, name) {
        const context = "post";
        const env = { result, analytics: analytics || {} };
        const candidates = QUOTES.filter(q =>
            q.context === context && evaluateCondition(q.condition, env)
        );
        
        const lines = [];
        
        // 1. Datos matemáticos espectaculares
        if (analytics) {
            const ratio = analytics.totalShots > 0 ? ((analytics.successfulShots * 3 + analytics.totalDropped) / analytics.totalShots).toFixed(2) : 0;
            const time = Math.round(analytics.gameDurationMs / 1000);
            lines.push(`DATOS TÁCTICOS: Eficiencia ${ratio}x | Nodos destruidos: ${analytics.successfulShots * 3 + analytics.totalDropped} | Ejecución: ${time}s`);
        }
        
        // 2. Frase sarcástica/contextual (de los QUOTES)
        if (candidates.length) {
            const primary = randomFrom(candidates);
            lines.push(personalizeText(primary.text, name, analytics));
        } else {
            lines.push(result === 'win' ? "Has sobrevivido a la probabilidad." : "La gravedad y la probabilidad han ganado esta vez.");
        }
        
        // 3. Frase inspiradora/motivacional premium
        const motivacionales = [
            "El caos es solo orden esperando ser descifrado.",
            "Un disparo perfecto no requiere fuerza, requiere visión.",
            "Las grandes victorias se construyen burbuja a burbuja.",
            "No juegues contra el tablero, haz que el tablero juegue para ti.",
            "Cada fallo es simplemente telemetría para tu próximo éxito."
        ];
        lines.push(randomFrom(motivacionales));

        return lines;
    }

  // --- Utilidades internas ---

  function evaluateCondition(cond, env) {
    const ps = env.playerState || {};
    const gs = env.globalStats || {};
    const a = env.analytics || {};
    const res = env.result || "";
    const bs = env.boardState || {};

    switch (cond) {
      case "playerIsNew && totalGames == 0":
        return !!ps.playerIsNew && (gs.totalGames || 0) === 0;
      case "totalGames >= 20":
        return (gs.totalGames || 0) >= 20;
      case "retriesOnCurrentLevel >= 3":
        return (ps.retriesOnCurrentLevel || 0) >= 3;

      case "fallenByDisconnectionThisShot >= 10":
        return (a.fallenByDisconnectionThisShot || 0) >= 10;
      case "shotsSinceLastCascade >= 3 && boardNotImproving":
        return (a.shotsSinceLastCascade || 0) >= 3 && !!a.boardNotImproving;
      case "isBounceShot && !createdCluster && !improvedBoard":
        return !!res?.isBounceShot && !res?.createdCluster && !res?.improvedBoard;
      case "nearDeathState == true":
        return !!bs?.nearDeathState;

      case "fallenByDisconnectionRatio >= 0.6 && result == 'win'":
        return (a.fallenByDisconnectionRatio || 0) >= 0.6 && res === "win";
      case "result == 'lose' && gameDurationMs < 60000":
        return res === "lose" && (a.gameDurationMs || 0) < 60000;
      case "result == 'lose' && nearDeathMoments > 0 && totalShots > 25":
        return res === "lose" && (a.nearDeathMoments || 0) > 0 && (a.totalShots || 0) > 25;
      case "result == 'win' && remainingBubbles <= 5":
        return res === "win" && (a.remainingBubbles || 0) <= 5;

      default:
        return false;
    }
  }

  function personalizeText(text, name, analytics) {
    let res = text;
    if (name) res = res.replace(/\\[nombre\\]/g, name);
    return res;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  return {
    resetForNewGame,
    onEnterMainMenu,
    onShotResolved,
    onGameEnded
  };
})();

// === SISTEMA EXPLICALIA: integración UI ===
// No redefinas UIController en otro lugar ni declares otro QUOTES.
// Solo extiende UIController aquí con estas tres funciones.
window.UIController = (() => {
  const base = window.UIController || {};

  // showExplicaliaPreMessage: mensaje en #screen-start, debajo de .brand-sub.
  function showExplicaliaPreMessage(text) {
    const card = document.getElementById("screen-start");
    if (!card) return;

    let slot = card.querySelector(".explicalia-pre");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "explicalia-pre";
      slot.style.margin = "12px 0";
      slot.style.padding = "12px";
      slot.style.background = "rgba(0,0,0,0.4)";
      slot.style.border = "1px solid var(--border)";
      slot.style.borderRadius = "var(--ios-radius-medium)";
      slot.style.fontSize = "13px";
      slot.style.color = "var(--text-sub)";
      slot.style.lineHeight = "1.4";
      slot.style.textAlign = "center";
      slot.style.whiteSpace = "pre-line";

      const brandSub = card.querySelector(".brand-sub");
      if (brandSub && brandSub.parentNode) {
        brandSub.parentNode.insertBefore(slot, brandSub.nextSibling);
      } else {
        const startMain = document.getElementById("start-main");
        if (startMain) {
          card.insertBefore(slot, startMain);
        } else {
          card.appendChild(slot);
        }
      }
    }

    slot.textContent = text;
    slot.style.opacity = "0";
    slot.style.transition = "opacity 0.4s ease-out";
    requestAnimationFrame(() => {
      slot.style.opacity = "1";
    });
  }

  // showExplicaliaBar: barra entre #menu-message y la línea de muerte en #game-container.
  function showExplicaliaBar(text) {
    const container = document.getElementById("game-container");
    if (!container) return;

    let bar = document.getElementById("explicalia-bar");

    if (!bar) {
      bar = document.createElement("div");
      bar.id = "explicalia-bar";
      bar.style.position = "absolute";
      bar.style.left = "50%";
      bar.style.transform = "translateX(-50%)";
      bar.style.bottom = "90px"; // encima del HUD
      bar.style.maxWidth = "88%";
      bar.style.padding = "10px 16px";
      bar.style.borderRadius = "16px";
      bar.style.background = "rgba(0,0,0,0.55)";
      bar.style.border = "1px solid rgba(255,255,255,0.15)";
      bar.style.backdropFilter = "blur(12px)";
      bar.style.color = "var(--text-main)";
      bar.style.fontSize = "13px";
      bar.style.lineHeight = "1.4";
      bar.style.textAlign = "center";
      bar.style.opacity = "0";
      bar.style.transition = "opacity 0.35s ease-out";
      bar.style.pointerEvents = "none";
      bar.style.whiteSpace = "pre-line";
      bar.style.zIndex = "12";

      container.appendChild(bar);
    }

    bar.textContent = text;
    bar.style.opacity = "1";

    setTimeout(() => {
      bar.style.opacity = "0";
    }, 2800);
  }

  // showExplicaliaPostMessage: usa .quote-container de #screen-summary y #informe-content.
  function showExplicaliaPostMessage(lines, analytics) {
    const summary = document.getElementById("screen-summary");
    if (!summary) return;

    const sarcasmEl = summary.querySelector("#sum-sarcasm");
    const motivationEl = summary.querySelector("#sum-motivation");
    const signatureEl = summary.querySelector(".quote-signature");
    const informeEl = document.getElementById("informe-content");

    if (sarcasmEl && lines && lines.length >= 3) {
      sarcasmEl.innerHTML = `<span style="font-size: 11px; color: var(--gold); letter-spacing: 0.5px; opacity: 0.9; text-transform: uppercase;">${lines[0]}</span><br><br><span style="font-size: 15px; font-style: italic; font-weight: 500;">"${lines[1]}"</span>`;
    }
    if (motivationEl && lines && lines.length >= 3) {
      motivationEl.innerHTML = `<strong style="color: white; font-size: 16px;">${lines[2]}</strong>`;
    }
    if (signatureEl) {
      signatureEl.style.display = 'none'; // Don't waste space with the signature
    }

    if (informeEl && analytics) {
      let html = "";

      if (typeof analytics.maxCascadeSize === "number") {
        html += `<div>Derribo máximo en un disparo: <strong>${analytics.maxCascadeSize}</strong> burbujas</div>`;
      }
      if (typeof analytics.fallenByDisconnectionRatio === "number") {
        const pct = Math.round(analytics.fallenByDisconnectionRatio * 100);
        html += `<div>Caídas por desconexión: <strong>${pct}%</strong></div>`;
      }
      if (typeof analytics.totalShots === "number") {
        html += `<div>Disparos totales: <strong>${analytics.totalShots}</strong></div>`;
      }

      informeEl.innerHTML = html;
    }
  }

  return {
    ...base,
    showExplicaliaPreMessage,
    showExplicaliaBar,
    showExplicaliaPostMessage
  };
})();


    // ============================================================
    // CONSTANTES Y CONFIGURACIÓN
    // ============================================================
    const GameState = { 
        MENU: 'MENU', 
        READY: 'READY', 
        FIRING: 'FIRING', 
        ANIMATING: 'ANIMATING', 
        PAUSED: 'PAUSED', 
        GAMEOVER: 'GAMEOVER' 
    };
    
    const Events = { 
        AUDIO_PLAY: 'audio:play', 
        AUDIO_MELODY: 'audio:melody', 
        SHAKE: 'render:shake', 
        PARTICLES: 'render:particles', 
        DROP: 'render:drop', 
        TEXT_FLOAT: 'render:text' 
    };
    
    const Config = {
        GRID_COLS: 11, 
        GRID_ROWS: 18, 
        MAX_LEVEL: 9,
        PHYSICS_STEP: 8, 
        BULLET_SPEED: 32, 
        HITBOX_RATIO: 0.8,
        SIGNATURE: "> SYSTEM LOG: EXPLICALIA",
        COLORS: [
            { id: 0, main: '#E91E63', light: '#F48FB1', name: 'Rosa' },
            { id: 1, main: '#00E676', light: '#69F0AE', name: 'Verde' },
            { id: 2, main: '#00BCD4', light: '#80DEEA', name: 'Cian' },
            { id: 3, main: '#FFD700', light: '#FFF59D', name: 'Oro' },
            { id: 4, main: '#9C27B0', light: '#CE93D8', name: 'Violeta' },
            { id: 5, main: '#FF5722', light: '#FF8A65', name: 'Naranja' }
        ],
        STONE_COLOR: { id: 99, main: '#757575', light: '#BDBDBD', name: 'Piedra', isStone: true },
        QUOTES: { 
            win: { 
                sarcasm: [
                    "Interesante. Mis simulaciones decían que fallarías hoy.",
                    "Aceptable. Para ser humano.",
                    "¿Calculaste eso o fue pura suerte? No respondas.",
                    "Tu estilo es caótico, pero los resultados son irrefutables.",
                    "Supongo que hoy las leyes de la física decidieron ayudarte.",
                    "Limpieza eficiente. Mis circuitos te lo agradecen.",
                    "No ha estado mal. He visto glaciares más rápidos, pero bien.",
                    "He actualizado mis expectativas sobre ti. Ligeramente.",
                    "Por fin. Mi procesador se estaba aburriendo.",
                    "Apuntas como una máquina. Una barata, pero una máquina."
                ], 
                motivation: [
                    "El caos era inevitable, pero tú has traído el orden.",
                    "No fue suerte. Fue la capacidad de ver el futuro antes de que ocurriera.",
                    "Así es como se escribe la historia: un acierto a la vez.",
                    "Has encontrado un camino donde parecía no haber ninguno.",
                    "La verdadera maestría es hacer que lo difícil parezca fácil.",
                    "Hoy has demostrado que la intuición humana supera al cálculo frío.",
                    "Un movimiento brillante que resonará en el código.",
                    "Has convertido un problema complejo en una solución elegante.",
                    "El tablero estaba en tu contra, pero tu voluntad fue más fuerte.",
                    "Momentos como este definen la diferencia entre jugar y dominar."
                ] 
            }, 
            lose: { 
                sarcasm: [
                    "La gravedad es una ley, no una sugerencia. Recuérdalo.",
                    "¿Eso fue un intento táctico?",
                    "He visto algoritmos aleatorios jugar mejor.",
                    "¿Esa era tu estrategia secreta? Muy... abstracta.",
                    "Intenta apuntar a las burbujas la próxima vez.",
                    "Los ángulos eran obvios. Al menos para mí.",
                    "Recalculando tus probabilidades de éxito... Bajando.",
                    "Tranquilo, era un nivel imposible (es broma, era fácil).",
                    "Mi abuela calcula mejor las trayectorias. Y es una tostadora.",
                    "He visto salvapantallas con más instinto de supervivencia."
                ], 
                motivation: [
                    "RECALIBRA Y VUELVE A INTENTARLO.", 
                    "EL ÉXITO ES PERSISTENCIA.", 
                    "ANALIZA EL ERROR. CORRIGE.", 
                    "Incluso los mejores sistemas necesitan un reinicio. Tú puedes.",
                    "LA DERROTA ES UN DATO MÁS.",
                    "RESPIRA. ENFOCA. DISPARA.",
                    "EL SISTEMA CREE EN TI.",
                    "EL FRACASO ES EL CAMINO A LA MAESTRÍA.",
                    "RECARGANDO MÓDULO DE ESTRATEGIA...",
                    "APRENDEMOS DEL CAOS."
                ] 
            } 
        },
        MOTIVATIONAL_PHRASES: [
            "La estrategia es el puente entre el caos y el orden. Sigue construyendo.",
            "Cada nivel superado es una victoria sobre la entropía. Continúa.",
            "El código reconoce tu progreso. La excelencia está cerca.",
            "Has demostrado que la mente humana puede superar cualquier algoritmo.",
            "La perseverancia es la única variable que importa. Adelante.",
            "Tu capacidad de adaptación supera las predicciones del sistema.",
            "Cada decisión correcta te acerca a la maestría absoluta.",
            "El camino del estratega nunca termina. Solo evoluciona."
        ],
        TIME_LIMITS: { // en minutos
            1: 5, 2: 5, 3: 5, 4: 10, 5: 10, 6: 20, 7: 20
        }
    };

    // ============================================================
    // GAME SETTINGS
    // ============================================================
    const GameSettings = {
        bulletSpeed: 52,
        showTrajectory: true,
        visualEffects: true,
        bubbleSize: 1.15,
        darkMode: true,
        trajectoryWidth: 2,
        haptics: true,
        colorblind: false,
        screenshake: true,
        load: function() {
            try {
                const saved = localStorage.getItem('bubbleShooterSettings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.bulletSpeed = parsed.bulletSpeed || 52;
                    this.visualEffects = parsed.visualEffects !== false;
                    this.bubbleSize = parsed.bubbleSize || 1.15;
                    this.darkMode = parsed.darkMode !== false;
                    this.showTrajectory = parsed.showTrajectory !== false;
                    this.trajectoryWidth = parsed.trajectoryWidth || 2;
                    this.haptics = parsed.haptics !== false;
                    this.colorblind = parsed.colorblind === true;
                    this.screenshake = parsed.screenshake !== false;
                } else {
                    this.bulletSpeed = 52;
                    this.visualEffects = true;
                    this.bubbleSize = 1.15;
                    this.darkMode = true;
                    this.showTrajectory = true;
                    this.haptics = true;
                    this.colorblind = false;
                    this.screenshake = true;
                }
            } catch(e) { console.warn('Settings load failed', e); }
        },
        save: function() {
            try {
                localStorage.setItem('bubbleShooterSettings', JSON.stringify({
                    bulletSpeed: this.bulletSpeed,
                    visualEffects: this.visualEffects,
                    bubbleSize: this.bubbleSize,
                    darkMode: this.darkMode,
                    showTrajectory: this.showTrajectory,
                    trajectoryWidth: this.trajectoryWidth,
                    haptics: this.haptics,
                    colorblind: this.colorblind,
                    screenshake: this.screenshake
                }));
            } catch(e) { console.warn('Settings save failed', e); }
        },
        apply: function() {
            if (this.darkMode) {
                document.body.style.background = '#000000';
            } else {
                document.body.style.background = 'var(--bg-main)';
            }
            
            const dmToggle = document.getElementById('toggle-dark-mode');
            if (dmToggle) {
                if (this.darkMode) dmToggle.classList.add('active');
                else dmToggle.classList.remove('active');
            }
            const trajToggle = document.getElementById('toggle-trajectory');
            if (trajToggle) {
                if (this.showTrajectory) trajToggle.classList.add('active');
                else trajToggle.classList.remove('active');
            }
            const hapticToggle = document.getElementById('toggle-haptics');
            if (hapticToggle) {
                if (this.haptics) hapticToggle.classList.add('active');
                else hapticToggle.classList.remove('active');
            }
            const colorblindToggle = document.getElementById('toggle-colorblind');
            if (colorblindToggle) {
                if (this.colorblind) colorblindToggle.classList.add('active');
                else colorblindToggle.classList.remove('active');
            }
            const screenshakeToggle = document.getElementById('toggle-screenshake');
            if (screenshakeToggle) {
                if (this.screenshake) screenshakeToggle.classList.add('active');
                else screenshakeToggle.classList.remove('active');
            }
        },
        vibrate: function(pattern) {
            if (this.haptics && navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        }
    };


    // ============================================================
    // SECURE STORAGE
    // ============================================================
    const SecureStorage = {
        _salt: "EXPL_V17_SECURE",
        _hash: function(str) {
            let hash = 0x811c9dc5;
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = (hash * 0x01000193) >>> 0;
            }
            return hash.toString(16);
        },
        save: function(key, data) {
            try {
                const jsonStr = JSON.stringify(data);
                const b64 = btoa(encodeURIComponent(jsonStr));
                const checksum = this._hash(b64 + this._salt);
                const packet = JSON.stringify({ d: b64, s: checksum });
                localStorage.setItem(key, packet);
            } catch(e) { console.warn("Save Failed", e); }
        },
        load: function(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const packet = JSON.parse(raw);
                if (!packet.d || !packet.s) return null;
                const calcHash = this._hash(packet.d + this._salt);
                if (calcHash !== packet.s) {
                    console.error("SECURITY ALERT: Save file modified externally.");
                    this.remove(key);
                    return null;
                }
                const jsonStr = decodeURIComponent(atob(packet.d));
                return JSON.parse(jsonStr);
            } catch(e) { 
                console.warn("Load Failed or Corrupt", e); 
                this.remove(key);
                return null; 
            }
        },
        remove: function(key) { localStorage.removeItem(key); }
    };

    // ============================================================
    // EVENT EMITTER
    // ============================================================
    class EventEmitter {
        constructor() { this.listeners = {}; }
        on(e, f) { (this.listeners[e] = this.listeners[e] || []).push(f); }
        emit(e, d) { (this.listeners[e] || []).forEach(f => f(d)); }
    }

    // ============================================================
    // AUDIO SYSTEM
    // ============================================================
    class AudioSystem {
        constructor(events) { 
            this.ctx = null; 
            this.isMuted = false; 
            events.on(Events.AUDIO_PLAY, ({type, param}) => {
                this.play(type, param);
                if (type === 'shoot') GameSettings.vibrate(10);
                if (type === 'pop') GameSettings.vibrate(15);
                if (type === 'drop') {
                    GameSettings.vibrate([15, 30, 20]);
                    if (GameSettings.screenshake) {
                        const gc = document.getElementById('game-container');
                        if (gc) {
                            gc.classList.remove('shake-epic');
                            void gc.offsetWidth;
                            gc.classList.add('shake-epic');
                        }
                    }
                }
                if (type === 'combo') {
                    GameSettings.vibrate([20, 20, 30]);
                    if (GameSettings.screenshake && param > 1) {
                        const gc = document.getElementById('game-container');
                        if (gc) {
                            gc.classList.remove('shake-epic');
                            void gc.offsetWidth;
                            gc.classList.add('shake-epic');
                        }
                    }
                }
            }); 
            events.on(Events.AUDIO_MELODY, ({type}) => {
                this.playMelody(type);
                if (type === 'start') GameSettings.vibrate([30, 50, 40]);
                if (type === 'over') GameSettings.vibrate([50, 100, 100, 200]);
            }); 
        }
        
        init() { 
            if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
            if (this.ctx.state === 'suspended') this.ctx.resume(); 
        }
        
        toggleMute() { this.isMuted = !this.isMuted; return this.isMuted; }
        
        play(type, param = 1) {
            if (this.ctx && this.ctx.state === 'suspended') return; 
            if (this.isMuted || !this.ctx) return;
            const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            if (type === 'shoot') { 
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(350, now); 
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.2); 
                gain.gain.setValueAtTime(0, now); 
                gain.gain.linearRampToValueAtTime(0.5, now + 0.01); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); 
                osc.start(now); 
                osc.stop(now + 0.2); 
            }
            else if (type === 'pop') { 
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(800, now); 
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); 
                gain.gain.setValueAtTime(0, now); 
                gain.gain.linearRampToValueAtTime(0.4, now + 0.005); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); 
                osc.start(now); 
                osc.stop(now + 0.1); 
            }
            else if (type === 'combo') { 
                let n = [261, 293, 329, 392, 440, 523][Math.min(param, 5)]; 
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(n, now); 
                gain.gain.setValueAtTime(0, now); 
                gain.gain.linearRampToValueAtTime(0.5, now + 0.02); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4); 
                osc.start(now); 
                osc.stop(now + 0.4); 
            }
            else if (type === 'drop') { 
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(150, now); 
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.5); 
                gain.gain.setValueAtTime(0, now); 
                gain.gain.linearRampToValueAtTime(0.6, now + 0.05); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); 
                osc.start(now); 
                osc.stop(now + 0.5); 
            }
        }
        
        playMelody(type) {
            if (this.isMuted || !this.ctx) return;
            const now = this.ctx.currentTime, play = (f, t, d) => { 
                const o = this.ctx.createOscillator(), g = this.ctx.createGain(); 
                o.connect(g); 
                g.connect(this.ctx.destination); 
                o.frequency.value = f; 
                g.gain.setValueAtTime(0, t); 
                g.gain.linearRampToValueAtTime(0.3, t + 0.02); 
                g.gain.linearRampToValueAtTime(0, t + d); 
                o.start(t); 
                o.stop(t + d); 
            };
            if (type === 'start') { play(523, now, 0.1); play(659, now+0.1, 0.1); play(783, now+0.2, 0.1); }
            else { play(392, now, 0.2); play(369, now+0.2, 0.2); play(196, now+0.6, 0.8); }
        }
    }
    // ============================================================
    // GAME HEALTH MONITOR - SISTEMA DE DIAGNÓSTICO PROFESIONAL
    // ============================================================
    class GameHealthMonitor {
        constructor(game) {
            this.game = game;
            this.VERSION = 'v21.0-SWAP-FIX';
            
            this.baseline = {
                timestamp: Date.now(),
                canvasListeners: 0,
                particles: 0,
                dropped: 0,
                floaters: 0
            };
            
            this.metrics = {
                frameDeltas: [],
                avgFPS: 60,
                minFPS: 60,
                maxFPS: 60,
                frameDrops: 0,
                memorySnapshots: [],
                memoryGrowthRate: 0,
                peakMemory: 0,
                particlesPeak: 0,
                droppedPeak: 0,
                floatersPeak: 0,
                errors: [],
                warnings: [],
                criticalErrors: [],
                stateTransitions: [],
                invalidTransitions: [],
                totalClicks: 0,
                totalShots: 0,
                totalAIUses: 0,
                totalSwaps: 0,
                sessionStart: Date.now(),
                totalPlayTime: 0,
                timePerLevel: {},
                levelAttempts: [],
                levelCompletions: [],
                levelFailures: []
            };
            
            this.eventLog = [];
            this.maxEventLogSize = 2000;
            this.stateSnapshots = [];
            this.maxSnapshots = 100;
            this.alerts = [];
            this.activeAlerts = new Set();
            this.frameCount = 0;
            this.snapshotInterval = 180;
            
            this.buttonDiagnostics = {
                registered: [],
                clicks: {},
                failures: {}
            };
            
            this.setupGlobalErrorHandling();
            setTimeout(() => this.captureBaseline(), 100);
            this.startMemoryTracking();
            this.logEvent('MONITOR_INITIALIZED', { version: this.VERSION });
        }
        
        setupGlobalErrorHandling() {
            const self = this;
            
            window.onerror = function(message, source, lineno, colno, error) {
                self.logEvent('GLOBAL_ERROR', {
                    message: message,
                    source: source,
                    line: lineno,
                    column: colno,
                    stack: error ? error.stack : 'No stack available'
                });
                self.metrics.criticalErrors.push({
                    timestamp: Date.now(),
                    type: 'UNCAUGHT_ERROR',
                    message: message,
                    location: `${source}:${lineno}:${colno}`,
                    stack: error ? error.stack : null
                });
                self.triggerAlert('CRITICAL_ERROR', message);
                return false;
            };
            
            window.onunhandledrejection = function(event) {
                self.logEvent('UNHANDLED_REJECTION', {
                    reason: event.reason ? event.reason.toString() : 'Unknown',
                    stack: event.reason && event.reason.stack ? event.reason.stack : null
                });
                self.metrics.criticalErrors.push({
                    timestamp: Date.now(),
                    type: 'UNHANDLED_PROMISE',
                    message: event.reason ? event.reason.toString() : 'Unknown rejection'
                });
            };
            
            const originalConsoleError = console.error;
            console.error = function(...args) {
                self.logEvent('CONSOLE_ERROR', { args: args.map(a => String(a)) });
                self.metrics.errors.push({
                    timestamp: Date.now(),
                    type: 'CONSOLE_ERROR',
                    message: args.map(a => String(a)).join(' ')
                });
                originalConsoleError.apply(console, args);
            };
            
            const originalConsoleWarn = console.warn;
            console.warn = function(...args) {
                self.logEvent('CONSOLE_WARN', { args: args.map(a => String(a)) });
                self.metrics.warnings.push({
                    timestamp: Date.now(),
                    type: 'CONSOLE_WARN',
                    message: args.map(a => String(a)).join(' ')
                });
                originalConsoleWarn.apply(console, args);
            };
        }
        
        captureBaseline() {
            if (!this.game || !this.game.renderer) return;
            
            this.baseline = {
                timestamp: Date.now(),
                canvasListeners: this.countCanvasListeners(),
                particles: this.game.renderer.parts ? this.game.renderer.parts.length : 0,
                dropped: this.game.renderer.dropped ? this.game.renderer.dropped.length : 0,
                floaters: this.game.renderer.floaters ? this.game.renderer.floaters.length : 0
            };
            
            this.logEvent('BASELINE_CAPTURED', this.baseline);
        }
        
        countCanvasListeners() {
            try {
                const canvas = this.game.renderer.canvas;
                if (typeof window.getEventListeners === 'function') {
                    const listeners = window.getEventListeners(canvas);
                    return Object.keys(listeners).reduce((sum, key) => sum + listeners[key].length, 0);
                }
            } catch(e) { /* ignore */ }
            return -1;
        }
        
        startMemoryTracking() {
            if (!performance.memory) {
                this.logEvent('MEMORY_API_UNAVAILABLE', { browser: navigator.userAgent });
                return;
            }
            
            setInterval(() => {
                const mem = performance.memory;
                const snapshot = {
                    timestamp: Date.now(),
                    usedMB: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2),
                    totalMB: (mem.totalJSHeapSize / 1024 / 1024).toFixed(2),
                    limitMB: (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
                    usedBytes: mem.usedJSHeapSize
                };
                
                this.metrics.memorySnapshots.push(snapshot);
                if (this.metrics.memorySnapshots.length > 60) {
                    this.metrics.memorySnapshots.shift();
                }
                
                if (this.metrics.memorySnapshots.length >= 10) {
                    const first = this.metrics.memorySnapshots[0];
                    const last = snapshot;
                    const timeDiffMin = (last.timestamp - first.timestamp) / 1000 / 60;
                    const memDiffMB = (last.usedBytes - first.usedBytes) / 1024 / 1024;
                    this.metrics.memoryGrowthRate = timeDiffMin > 0 ? (memDiffMB / timeDiffMin).toFixed(3) : 0;
                    
                    if (parseFloat(this.metrics.memoryGrowthRate) > 5) {
                        this.triggerAlert('MEMORY_LEAK_SUSPECTED', `Crecimiento: ${this.metrics.memoryGrowthRate} MB/min`);
                    }
                }
                
                if (snapshot.usedBytes > this.metrics.peakMemory) {
                    this.metrics.peakMemory = snapshot.usedBytes;
                }
            }, 5000);
        }
        
        logEvent(type, data = {}) {
            const event = {
                id: this.eventLog.length,
                timestamp: Date.now(),
                timeFormatted: new Date().toISOString(),
                frame: this.frameCount,
                type: type,
                data: data,
                gameState: this.game ? this.game.state : 'UNKNOWN',
                level: this.game ? this.game.level : 0,
                mode: this.game ? this.game.mode : 'UNKNOWN'
            };
            
            this.eventLog.push(event);
            
            if (this.eventLog.length > this.maxEventLogSize) {
                this.eventLog.shift();
            }
            
            if (type.includes('ERROR') || type.includes('CRITICAL') || type.includes('FAIL')) {
                this.metrics.errors.push(event);
                if (this.metrics.errors.length > 200) this.metrics.errors.shift();
            } else if (type.includes('WARNING') || type.includes('WARN')) {
                this.metrics.warnings.push(event);
                if (this.metrics.warnings.length > 200) this.metrics.warnings.shift();
            }
            
            return event;
        }
        
        trackStateTransition(fromState, toState, trigger = 'unknown') {
            fromState = fromState || 'UNKNOWN';
            toState = toState || 'UNKNOWN';
            const from = fromState;
            const to = toState;
            const transition = {
                timestamp: Date.now(),
                frame: this.frameCount,
                from: from,
                to: to,
                trigger: trigger,
                level: this.game.level,
                valid: this.isValidTransition(from, to)
            };
            
            this.metrics.stateTransitions.push(transition);
            if (this.metrics.stateTransitions.length > 100) {
                this.metrics.stateTransitions.shift();
            }
            
            if (!transition.valid) {
                this.metrics.invalidTransitions.push(transition);
                this.logEvent('INVALID_STATE_TRANSITION', transition);
                this.triggerAlert('INVALID_TRANSITION', `${from} → ${to}`);
            } else {
                this.logEvent('STATE_TRANSITION', transition);
            }
            
            return transition;
        }
        
        isValidTransition(from, to) {
            const validTransitions = {
                'MENU': ['READY', 'PAUSED'],
                'READY': ['FIRING', 'PAUSED', 'MENU', 'GAMEOVER'],
                'FIRING': ['ANIMATING', 'READY', 'GAMEOVER'],
                'ANIMATING': ['READY', 'GAMEOVER', 'PAUSED'],
                'PAUSED': ['READY', 'MENU', 'GAMEOVER'],
                'GAMEOVER': ['MENU', 'READY', 'PAUSED']
            };
            
            if (!validTransitions[from]) return true;
            return validTransitions[from].includes(to);
        }
        
        trackInteraction(type, data = {}) {
            switch(type) {
                case 'SHOT': this.metrics.totalShots++; break;
                case 'AI_USE': this.metrics.totalAIUses++; break;
                case 'SWAP': this.metrics.totalSwaps++; break;
                case 'CLICK': this.metrics.totalClicks++; break;
            }
            this.logEvent(`INTERACTION_${type}`, data);
        }
        
        trackButtonClick(buttonId, success = true) {
            if (!this.buttonDiagnostics.clicks[buttonId]) {
                this.buttonDiagnostics.clicks[buttonId] = 0;
                this.buttonDiagnostics.failures[buttonId] = 0;
            }
            
            this.buttonDiagnostics.clicks[buttonId]++;
            if (!success) {
                this.buttonDiagnostics.failures[buttonId]++;
                this.logEvent('BUTTON_CLICK_FAILED', { buttonId: buttonId });
            } else {
                this.logEvent('BUTTON_CLICK_SUCCESS', { buttonId: buttonId });
            }
        }
        
        registerButton(buttonId, handler) {
            this.buttonDiagnostics.registered.push({
                id: buttonId,
                timestamp: Date.now(),
                hasHandler: typeof handler === 'function'
            });
            this.logEvent('BUTTON_REGISTERED', { buttonId: buttonId, hasHandler: typeof handler === 'function' });
        }
        
        captureStateSnapshot(reason = 'PERIODIC') {
            if (!this.game || !this.game.renderer) return null;
            
            const canvas = this.game.renderer.canvas;
            
            let gridCapture = [];
            if (this.game.model && this.game.model.grid) {
                for (let r = 0; r < Config.GRID_ROWS; r++) {
                    gridCapture[r] = [];
                    for (let c = 0; c < Config.GRID_COLS; c++) {
                        const cell = this.game.model.grid[r] ? this.game.model.grid[r][c] : null;
                        if (cell && cell.color) {
                            gridCapture[r][c] = {
                                colorId: cell.color.id,
                                colorName: cell.color.name,
                                colorMain: cell.color.main
                            };
                        } else {
                            gridCapture[r][c] = null;
                        }
                    }
                }
            }
            
            const snapshot = {
                id: this.stateSnapshots.length,
                timestamp: Date.now(),
                timeFormatted: new Date().toISOString(),
                frame: this.frameCount,
                reason: reason,
                gameState: this.game.state,
                level: this.game.level,
                mode: this.game.mode,
                maxLevelReached: this.game.maxLevelReached,
                isGodMode: this.game.isGodMode,
                attemptsLeft: this.game.attemptsLeft,
                aiUsesLeft: this.game.aiUsesLeft,
                swapUses: this.game.swapUses,
                ammoCount: this.game.ammoCount,
                currentBubble: this.game.currentBubble ? {
                    exists: true,
                    x: this.game.currentBubble.x,
                    y: this.game.currentBubble.y,
                    angle: this.game.currentBubble.angle,
                    colorId: this.game.currentBubble.color ? this.game.currentBubble.color.id : -1,
                    colorName: this.game.currentBubble.color ? this.game.currentBubble.color.name : 'NONE'
                } : { exists: false },
                bullet: this.game.bullet ? { 
                    exists: true, 
                    x: this.game.bullet.x, 
                    y: this.game.bullet.y,
                    angle: this.game.bullet.angle,
                    bounces: this.game.bullet.bounces
                } : { exists: false },
                nextBubbleColor: this.game.nextBubbleColor ? this.game.nextBubbleColor.name : 'NONE',
                secondNextBubbleColor: this.game.secondNextBubbleColor ? this.game.secondNextBubbleColor.name : 'NONE',
                thirdNextBubbleColor: this.game.thirdNextBubbleColor ? this.game.thirdNextBubbleColor.name : 'NONE',
                swapReserveColor: this.game.swapReserveColor ? this.game.swapReserveColor.name : 'NONE',
                gridExact: gridCapture,
                gridRows: gridCapture.length,
                gridBubbleCount: this.countGridBubbles(),
                gridEmpty: this.game.model ? this.game.model.isEmpty() : true,
                canvasDisplay: canvas.style.display,
                canvasOpacity: canvas.style.opacity,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                overlayHidden: document.getElementById('overlay') ? document.getElementById('overlay').classList.contains('hidden') : null,
                currentScreen: this.getCurrentScreen(),
                hudAICount: document.getElementById('aiCount') ? document.getElementById('aiCount').innerText : 'N/A',
                hudSwapCount: document.getElementById('swapCount') ? document.getElementById('swapCount').innerText : 'N/A',
                hudShotsEl: document.getElementById('shotsEl') ? document.getElementById('shotsEl').innerText : 'N/A',
                hudLevelEl: document.getElementById('levelEl') ? document.getElementById('levelEl').innerText : 'N/A',
                particles: this.game.renderer.parts ? this.game.renderer.parts.length : 0,
                dropped: this.game.renderer.dropped ? this.game.renderer.dropped.length : 0,
                floaters: this.game.renderer.floaters ? this.game.renderer.floaters.length : 0,
                timerRunning: this.game.timerRunning,
                levelElapsedTime: this.game.levelElapsedTime,
                memory: performance.memory ? {
                    usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
                } : null,
                currentFPS: this.metrics.avgFPS
            };
            
            this.stateSnapshots.push(snapshot);
            if (this.stateSnapshots.length > this.maxSnapshots) {
                this.stateSnapshots.shift();
            }
            
            return snapshot;
        }
        
        countGridBubbles() {
            if (!this.game || !this.game.model || !this.game.model.grid) return 0;
            let count = 0;
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.game.model.grid[r] && this.game.model.grid[r][c]) count++;
                }
            }
            return count;
        }
        
        getCurrentScreen() {
            const screens = ['screen-start', 'screen-tutorial', 'screen-summary', 'screen-summary-step2', 'screen-closure'];
            for (let id of screens) {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('display-none')) return id;
            }
            
            if (document.getElementById('pause-overlay') && document.getElementById('pause-overlay').classList.contains('visible')) return 'pause-overlay';
            if (document.getElementById('settings-overlay') && document.getElementById('settings-overlay').classList.contains('visible')) return 'settings-overlay';
            if (document.getElementById('tutorial-overlay') && document.getElementById('tutorial-overlay').classList.contains('visible')) return 'tutorial-overlay';
            
            return 'GAMEPLAY';
        }
        
        runDiagnostics() {
            this.frameCount++;
            
            if (!this.game || this.game.state === 'MENU') return;
            
            if (this.game.lastFrameTime) {
                const delta = Date.now() - this.game.lastFrameTime;
                this.metrics.frameDeltas.push(delta);
                if (this.metrics.frameDeltas.length > 60) this.metrics.frameDeltas.shift();
                
                const avgDelta = this.metrics.frameDeltas.reduce((a, b) => a + b, 0) / this.metrics.frameDeltas.length;
                this.metrics.avgFPS = Math.round(1000 / avgDelta);
                this.metrics.minFPS = Math.round(1000 / Math.max(...this.metrics.frameDeltas));
                this.metrics.maxFPS = Math.round(1000 / Math.min(...this.metrics.frameDeltas));
                
                if (delta > 50) {
                    this.metrics.frameDrops++;
                    if (delta > 200) {
                        this.logEvent('SEVERE_FRAME_DROP', { delta: delta, fps: Math.round(1000/delta) });
                    }
                }
            }
            
            if (this.frameCount % this.snapshotInterval === 0) {
                this.captureStateSnapshot('PERIODIC');
            }
            
            if (this.frameCount % 180 !== 0) return;
            
            const issues = [];
            
            if (this.game.renderer) {
                const parts = this.game.renderer.parts ? this.game.renderer.parts.length : 0;
                const dropped = this.game.renderer.dropped ? this.game.renderer.dropped.length : 0;
                const floaters = this.game.renderer.floaters ? this.game.renderer.floaters.length : 0;
                
                if (parts > this.metrics.particlesPeak) this.metrics.particlesPeak = parts;
                if (dropped > this.metrics.droppedPeak) this.metrics.droppedPeak = dropped;
                if (floaters > this.metrics.floatersPeak) this.metrics.floatersPeak = floaters;
                
                if (parts > 500) {
                    issues.push({ severity: 'WARNING', type: 'PARTICLE_OVERFLOW', value: parts });
                }
                if (dropped > 300) {
                    issues.push({ severity: 'WARNING', type: 'DROPPED_OVERFLOW', value: dropped });
                }
            }
            
            if (this.game.state === 'READY' && !this.game.currentBubble) {
                issues.push({ severity: 'CRITICAL', type: 'NO_BUBBLE_IN_READY_STATE' });
            }
            
            if (this.game.state === 'FIRING' && !this.game.bullet) {
                issues.push({ severity: 'CRITICAL', type: 'NO_BULLET_IN_FIRING_STATE' });
            }
            
            if (this.game.state !== 'MENU' && this.game.state !== 'GAMEOVER') {
                const canvas = this.game.renderer.canvas;
                if (canvas.style.display === 'none' || canvas.style.opacity === '0') {
                    issues.push({ severity: 'CRITICAL', type: 'CANVAS_HIDDEN_DURING_GAMEPLAY' });
                }
            }
            
            if (this.metrics.avgFPS < 20) {
                issues.push({ severity: 'WARNING', type: 'LOW_FPS', value: this.metrics.avgFPS });
            }
            
            if (parseFloat(this.metrics.memoryGrowthRate) > 5) {
                issues.push({ severity: 'WARNING', type: 'MEMORY_GROWTH_HIGH', value: this.metrics.memoryGrowthRate });
            }
            
            if (issues.length > 0) {
                this.generateIssueReport(issues);
            }
        }
        
        triggerAlert(type, message) {
            const alertKey = `${type}_${message}`;
            if (this.activeAlerts.has(alertKey)) return;
            
            this.activeAlerts.add(alertKey);
            setTimeout(() => this.activeAlerts.delete(alertKey), 30000);
            
            const alert = {
                timestamp: Date.now(),
                type: type,
                message: message,
                frame: this.frameCount,
                gameState: this.game ? this.game.state : 'UNKNOWN'
            };
            
            this.alerts.push(alert);
            this.logEvent('ALERT_TRIGGERED', alert);
            
            const devBtn = document.getElementById('devConsoleBtn');
            if (devBtn && type === 'CRITICAL_ERROR') {
                devBtn.classList.add('has-errors');
            }
            
            console.warn(`🚨 HEALTH ALERT [${type}]: ${message}`);
        }
        
        generateIssueReport(issues) {
            const report = {
                timestamp: Date.now(),
                timeFormatted: new Date().toISOString(),
                frame: this.frameCount,
                sessionDuration: ((Date.now() - this.metrics.sessionStart) / 1000 / 60).toFixed(2) + ' min',
                gameState: this.game.state,
                level: this.game.level,
                issues: issues,
                snapshot: this.captureStateSnapshot('ISSUE')
            };
            
            for (const issue of issues) {
                if (issue.severity === 'CRITICAL') {
                    this.triggerAlert(issue.type, JSON.stringify(issue));
                }
            }
            
            this.logEvent('ISSUE_REPORT', report);
            return report;
        }
        
        generateFullReport() {
            return {
                version: this.VERSION,
                generatedAt: new Date().toISOString(),
                sessionDuration: ((Date.now() - this.metrics.sessionStart) / 1000 / 60).toFixed(2) + ' min',
                metrics: this.metrics,
                recentEvents: this.eventLog.slice(-100),
                recentSnapshots: this.stateSnapshots.slice(-10),
                alerts: this.alerts,
                buttonDiagnostics: this.buttonDiagnostics
            };
        }
        
        downloadReport() {
            const report = this.generateFullReport();
            const json = JSON.stringify(report, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bubble-shooter-diagnostic-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logEvent('REPORT_DOWNLOADED', { size: json.length });
            return report;
        }
        
        getQuickDiagnosis() {
            const issues = [];
            
            if (this.game.state === 'READY' && !this.game.currentBubble) {
                issues.push('❌ NO HAY BURBUJA CARGADA en estado READY');
            }
            
            if (this.game.state === 'FIRING' && !this.game.bullet) {
                issues.push('❌ NO HAY BALA en estado FIRING');
            }
            
            const canvas = this.game.renderer.canvas;
            if (canvas.style.display === 'none') {
                issues.push('❌ CANVAS OCULTO (display:none)');
            }
            if (canvas.style.opacity === '0') {
                issues.push('❌ CANVAS INVISIBLE (opacity:0)');
            }
            
            const overlay = document.getElementById('overlay');
            if (overlay && !overlay.classList.contains('hidden') && this.game.state === 'READY') {
                issues.push('⚠️ OVERLAY VISIBLE durante gameplay');
            }
            
            if (this.metrics.criticalErrors.length > 0) {
                issues.push(`🔴 ${this.metrics.criticalErrors.length} ERRORES CRÍTICOS`);
            }
            
            if (this.metrics.avgFPS < 30) {
                issues.push(`⚠️ FPS BAJO: ${this.metrics.avgFPS}`);
            }
            
            if (parseFloat(this.metrics.memoryGrowthRate) > 5) {
                issues.push(`⚠️ POSIBLE MEMORY LEAK: ${this.metrics.memoryGrowthRate} MB/min`);
            }
            
            if (issues.length === 0) {
                return '✅ Sin problemas detectados';
            }
            
            return issues.join('\n');
        }
    }

    // ============================================================
    // DEVELOPER CONSOLE - PANEL DE DIAGNÓSTICO INTERACTIVO
    // ============================================================
    class DeveloperConsole {
        constructor(healthMonitor) {
            this.monitor = healthMonitor;
            this.panel = null;
            this.isOpen = false;
            this.updateInterval = null;
        }
        
        createPanel() {
            if (this.panel) return;
            
            this.panel = document.createElement('div');
            this.panel.id = 'dev-console';
            
            const isMobile = window.innerWidth <= 768;
            
            this.panel.style.cssText = `
                position: fixed;
                ${isMobile ? 'top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;' : 'bottom: 0; right: 0; width: 450px; height: 600px;'}
                background: rgba(0, 0, 0, 0.98);
                border: ${isMobile ? 'none' : '2px solid #9C27B0'};
                border-radius: ${isMobile ? '0' : '20px 0 0 0'};
                padding: 15px;
                padding-top: ${isMobile ? '50px' : '15px'};
                z-index: 10000;
                color: white;
                font-family: 'Courier New', monospace;
                font-size: ${isMobile ? '11px' : '12px'};
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(156, 39, 176, 0.5);
                display: none;
            `;
            
            this.panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #9C27B0; padding-bottom: 10px;">
                    <h3 style="margin: 0; color: #9C27B0; font-size: 16px;">🔧 DEV CONSOLE v21</h3>
                    <button id="dev-close-btn" style="background: #FF453A; border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">✕</button>
                </div>
                
                <div style="display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap;">
                    <button class="dev-tab active" data-tab="status" style="background: #9C27B0; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Estado</button>
                    <button class="dev-tab" data-tab="grid" style="background: #333; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Grid</button>
                    <button class="dev-tab" data-tab="errors" style="background: #333; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Errores</button>
                    <button class="dev-tab" data-tab="events" style="background: #333; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Eventos</button>
                    <button class="dev-tab" data-tab="explicalia" style="background: #333; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">Explicalia Test</button>
                </div>
                
                <div id="dev-content" style="background: rgba(0,0,0,0.5); border-radius: 10px; padding: 10px; min-height: 300px; max-height: ${isMobile ? '60vh' : '400px'}; overflow-y: auto;">
                    <div id="dev-tab-status"></div>
                    <div id="dev-tab-grid" style="display:none;"></div>
                    <div id="dev-tab-errors" style="display:none;"></div>
                    <div id="dev-tab-events" style="display:none;"></div>
                    <div id="dev-tab-explicalia" style="display:none;"></div>
                </div>
                
                <div id="dev-diagnosis" style="background: rgba(255,69,58,0.2); border: 1px solid #FF453A; border-radius: 10px; padding: 10px; margin-top: 10px; font-size: 11px; white-space: pre-wrap;"></div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                    <button id="dev-export-btn" style="background: #30D158; border: none; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;">💾 Exportar JSON</button>
                    <button id="dev-snapshot-btn" style="background: #FFD60A; border: none; color: black; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;">📸 Snapshot</button>
                    <button id="dev-clear-btn" style="background: #FF453A; border: none; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;">🗑️ Limpiar Logs</button>
                    <button id="dev-copy-btn" style="background: #0A84FF; border: none; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;">📋 Copiar Reporte</button>
                </div>
            `;
            
            document.body.appendChild(this.panel);
            this.bindPanelEvents();
        }
        
        bindPanelEvents() {
            document.getElementById('dev-close-btn').onclick = () => this.toggle();
            
            this.panel.querySelectorAll('.dev-tab').forEach(tab => {
                tab.onclick = () => {
                    this.panel.querySelectorAll('.dev-tab').forEach(t => {
                        t.style.background = '#333';
                        t.classList.remove('active');
                    });
                    tab.style.background = '#9C27B0';
                    tab.classList.add('active');
                    
                    const tabName = tab.dataset.tab;
                    this.panel.querySelectorAll('[id^="dev-tab-"]').forEach(content => {
                        content.style.display = 'none';
                    });
                    document.getElementById(`dev-tab-${tabName}`).style.display = 'block';
                    this.updateTab(tabName);
                };
            });
            
            document.getElementById('dev-export-btn').onclick = () => {
                this.monitor.downloadReport();
                this.showNotification('✅ Reporte exportado');
            };
            
            document.getElementById('dev-snapshot-btn').onclick = () => {
                const snapshot = this.monitor.captureStateSnapshot('MANUAL');
                console.log('📸 Snapshot:', snapshot);
                this.showNotification('✅ Snapshot capturado (ver consola)');
            };
            
            document.getElementById('dev-clear-btn').onclick = () => {
                this.monitor.eventLog = [];
                this.monitor.metrics.errors = [];
                this.monitor.metrics.warnings = [];
                this.showNotification('✅ Logs limpiados');
                this.updateCurrentTab();
            };
            
            document.getElementById('dev-copy-btn').onclick = () => {
                const report = this.monitor.generateFullReport();
                const text = JSON.stringify(report, null, 2);
                navigator.clipboard.writeText(text).then(() => {
                    this.showNotification('✅ Copiado al portapapeles');
                }).catch(() => {
                    this.showNotification('❌ Error al copiar');
                });
            };
        }
        
        showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                z-index: 10001;
                font-size: 14px;
            `;
            notification.innerText = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }
        
        toggle() {
            if (!this.panel) this.createPanel();
            
            this.isOpen = !this.isOpen;
            this.panel.style.display = this.isOpen ? 'block' : 'none';
            
            if (this.isOpen) {
                this.startLiveUpdate();
            } else {
                this.stopLiveUpdate();
            }
        }
        
        startLiveUpdate() {
            this.updateInterval = setInterval(() => this.updateCurrentTab(), 500);
            this.updateCurrentTab();
        }
        
        stopLiveUpdate() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
        
        updateCurrentTab() {
            const activeTab = this.panel.querySelector('.dev-tab.active');
            if (activeTab) {
                this.updateTab(activeTab.dataset.tab);
            }
            this.updateDiagnosis();
        }
        
        updateTab(tabName) {
            switch(tabName) {
                case 'status': this.updateStatusTab(); break;
                case 'grid': this.updateGridTab(); break;
                case 'errors': this.updateErrorsTab(); break;
                case 'events': this.updateEventsTab(); break;
                case 'explicalia': this.updateExplicaliaTab(); break;
            }
        }
        
        updateStatusTab() {
            const m = this.monitor.metrics;
            const g = this.monitor.game;
            
            document.getElementById('dev-tab-status').innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div style="color: #9C27B0; font-weight: bold; margin-bottom: 5px;">⚡ RENDIMIENTO</div>
                    <div>FPS: <span style="color: ${m.avgFPS < 30 ? '#FF453A' : '#30D158'}">${m.avgFPS}</span> (min: ${m.minFPS}, max: ${m.maxFPS})</div>
                    <div>Frame: ${this.monitor.frameCount}</div>
                    <div>Frame drops: ${m.frameDrops}</div>
                    <div>Memoria: ${m.memorySnapshots.length > 0 ? m.memorySnapshots[m.memorySnapshots.length-1].usedMB + ' MB' : 'N/A'}</div>
                    <div>Crecimiento: ${m.memoryGrowthRate} MB/min</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="color: #30D158; font-weight: bold; margin-bottom: 5px;">🎮 ESTADO DEL JUEGO</div>
                    <div>Estado: <span style="color: #FFD60A">${g.state}</span></div>
                    <div>Nivel: ${g.level} (max: ${g.maxLevelReached})</div>
                    <div>Modo: ${g.mode} ${g.isGodMode ? '(GOD)' : ''}</div>
                    <div>Burbuja actual: ${g.currentBubble ? '✅ ' + (g.currentBubble.color ? g.currentBubble.color.name : 'SIN COLOR') : '❌ NULL'}</div>
                    <div>Bala: ${g.bullet ? '✅ En vuelo' : '❌ NULL'}</div>
                    <div>Timer: ${g.timerRunning ? '▶️ Running' : '⏸️ Paused'}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="color: #0A84FF; font-weight: bold; margin-bottom: 5px;">📊 RECURSOS</div>
                    <div>IA usos: ${g.aiUsesLeft}</div>
                    <div>Swaps: ${g.swapUses}</div>
                    <div>Burbujas restantes: ${g.ammoCount}</div>
                    <div>Intentos: ${g.attemptsLeft}</div>
                    <div style="color: #FFD60A;">Swap Reserve: ${g.swapReserveColor ? g.swapReserveColor.name : 'N/A'}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="color: #FF9500; font-weight: bold; margin-bottom: 5px;">🔄 COLA DE BURBUJAS</div>
                    <div>Actual: ${g.currentBubble && g.currentBubble.color ? g.currentBubble.color.name : 'N/A'}</div>
                    <div>Siguiente (next): ${g.nextBubbleColor ? g.nextBubbleColor.name : 'N/A'}</div>
                    <div>2º Siguiente: ${g.secondNextBubbleColor ? g.secondNextBubbleColor.name : 'N/A'}</div>
                    <div>3º Siguiente: ${g.thirdNextBubbleColor ? g.thirdNextBubbleColor.name : 'N/A'}</div>
                    <div style="color: #9C27B0;">Reserva Swap: ${g.swapReserveColor ? g.swapReserveColor.name : 'N/A'}</div>
                </div>
            `;
        }
        
        updateGridTab() {
            const g = this.monitor.game;
            const gridBubbles = this.monitor.countGridBubbles();
            
            let gridVisual = '<div style="font-family: monospace; font-size: 8px; line-height: 1.2;">';
            
            if (g.model && g.model.grid) {
                for (let r = 0; r < Math.min(Config.GRID_ROWS, 15); r++) {
                    const offset = (r % 2 !== 0) ? '  ' : '';
                    gridVisual += `<div>${offset}`;
                    for (let c = 0; c < Config.GRID_COLS; c++) {
                        const cell = g.model.grid[r] ? g.model.grid[r][c] : null;
                        if (cell && cell.color) {
                            const colors = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];
                            gridVisual += colors[cell.color.id] || '⚪';
                        } else {
                            gridVisual += '⚫';
                        }
                    }
                    gridVisual += `</div>`;
                }
            }
            gridVisual += '</div>';
            
            document.getElementById('dev-tab-grid').innerHTML = `
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 10px;">🧩 GRID ACTUAL (${gridBubbles} burbujas)</div>
                <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    ${gridVisual}
                </div>
                <div style="font-size: 10px; color: #666;">
                    🔴Rosa 🟢Verde 🔵Cian 🟡Oro 🟣Violeta 🟠Naranja ⚫Vacío
                </div>
            `;
        }
        
        updateErrorsTab() {
            const m = this.monitor.metrics;
            
            let html = `
                <div style="color: #FF453A; font-weight: bold; margin-bottom: 10px;">
                    🔴 ERRORES CRÍTICOS: ${m.criticalErrors.length}
                </div>
            `;
            
            if (m.criticalErrors.length > 0) {
                m.criticalErrors.slice(-10).reverse().forEach(err => {
                    html += `
                        <div style="background: rgba(255,69,58,0.2); padding: 8px; border-radius: 6px; margin-bottom: 5px; font-size: 10px;">
                            <div style="color: #FF453A;">${err.type}</div>
                            <div>${err.message}</div>
                            <div style="color: #666; font-size: 9px;">${new Date(err.timestamp).toLocaleTimeString()}</div>
                        </div>
                    `;
                });
            }
            
            html += `
                <div style="color: #FFD60A; font-weight: bold; margin: 15px 0 10px 0;">
                    ⚠️ WARNINGS: ${m.warnings.length}
                </div>
            `;
            
            m.warnings.slice(-10).reverse().forEach(warn => {
                html += `
                    <div style="background: rgba(255,214,10,0.1); padding: 8px; border-radius: 6px; margin-bottom: 5px; font-size: 10px;">
                        <div>${warn.message || warn.type}</div>
                        <div style="color: #666; font-size: 9px;">${new Date(warn.timestamp).toLocaleTimeString()}</div>
                    </div>
                `;
            });
            
            document.getElementById('dev-tab-errors').innerHTML = html;
        }
        
        updateEventsTab() {
            const events = this.monitor.eventLog.slice(-30).reverse();
            
            let html = `<div style="color: #9C27B0; font-weight: bold; margin-bottom: 10px;">📋 ÚLTIMOS EVENTOS (${this.monitor.eventLog.length} total)</div>`;
            
            events.forEach(event => {
                const color = event.type.includes('ERROR') ? '#FF453A' : 
                             event.type.includes('WARNING') ? '#FFD60A' : 
                             event.type.includes('TRANSITION') ? '#0A84FF' : 
                             event.type.includes('SWAP') ? '#9C27B0' : '#666';
                
                html += `
                    <div style="border-left: 2px solid ${color}; padding-left: 8px; margin-bottom: 5px; font-size: 10px;">
                        <div style="color: ${color};">${event.type}</div>
                        <div style="color: #999;">${JSON.stringify(event.data).substring(0, 100)}</div>
                        <div style="color: #444; font-size: 9px;">Frame ${event.frame} | ${new Date(event.timestamp).toLocaleTimeString()}</div>
                    </div>
                `;
            });
            
            document.getElementById('dev-tab-events').innerHTML = html;
        }
        
        updateExplicaliaTab() {
            document.getElementById('dev-tab-explicalia').innerHTML = `
                <div style="color: #9C27B0; font-weight: bold; margin-bottom: 10px;">🗣️ TEST EXPLICALIA MESSAGES</div>
                <select id="expl-context" style="width:100%; margin-bottom:10px; padding:5px;">
                    <option value="pre">Pre-game</option>
                    <option value="in_game">In-game</option>
                    <option value="post">Post-game</option>
                </select>
                <input id="expl-condition" type="text" placeholder="Condition (e.g., fallenByDisconnectionThisShot >= 10)" style="width:100%; margin-bottom:10px; padding:5px;">
                <input id="expl-name" type="text" placeholder="Player Name" style="width:100%; margin-bottom:10px; padding:5px;">
                <button id="expl-test-btn" style="background: #30D158; border: none; color: white; padding: 8px; border-radius: 6px; cursor: pointer; width:100%;">Test Message</button>
                <div id="expl-result" style="margin-top:10px; background: rgba(255,255,255,0.1); padding:10px; border-radius:6px; min-height:50px;"></div>
            `;
            
            document.getElementById('expl-test-btn').onclick = () => {
                const context = document.getElementById('expl-context').value;
                const condition = document.getElementById('expl-condition').value;
                const name = document.getElementById('expl-name').value;
                let message;
                const env = { result: 'win', boardState: {nearDeathState: true}, analytics: {fallenByDisconnectionThisShot: 12, shotsSinceLastCascade: 4, boardNotImproving: true, isBounceShot: true, createdCluster: false, improvedBoard: false, gameDurationMs: 50000, nearDeathMoments: 2, totalShots: 30, remainingBubbles: 4} }; // Sample env
                
                if (context === 'pre') {
                    message = ExplicaliaSystem.pickPreGameMessage({playerIsNew: true}, {totalGames: 0}, name);
                } else if (context === 'in_game') {
                    message = ExplicaliaSystem.pickInGameMessage(env.result, env.boardState, env.analytics, name);
                } else {
                    message = ExplicaliaSystem.pickPostGameMessages('win', env.analytics, name).join('\n');
                }
                
                document.getElementById('expl-result').innerText = message || 'No message found for conditions.';
            };
        }
        
        updateDiagnosis() {
            const diagnosis = this.monitor.getQuickDiagnosis();
            const diagnosisEl = document.getElementById('dev-diagnosis');
            
            if (diagnosis.includes('✅')) {
                diagnosisEl.style.background = 'rgba(48,209,88,0.2)';
                diagnosisEl.style.borderColor = '#30D158';
            } else {
                diagnosisEl.style.background = 'rgba(255,69,58,0.2)';
                diagnosisEl.style.borderColor = '#FF453A';
            }
            
            diagnosisEl.innerText = diagnosis;
        }
    }
    // ============================================================
    // GRID MODEL - Modelo de datos del tablero
    // CORREGIDO: Sistema anti-3-consecutivos y generación robusta
    // ============================================================
    class GridModel {
        constructor(game) { this.game = game; this.resetEmpty(); }
        
        resetEmpty() { 
            this.grid = []; 
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                this.grid[r] = new Array(Config.GRID_COLS).fill(null); 
            }
        }
        
        getColorsInPlay() {
            let colors = new Set();
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                if (!this.grid[r]) continue;
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.grid[r][c] && this.grid[r][c].color) {
                        colors.add(this.grid[r][c].color.id);
                    }
                }
            }
            return colors.size;
        }
        
        cloneGrid() {
            return this.grid.map(row => row.map(cell => cell ? { ...cell } : null));
        }

        initLevel(p) { 
            this.resetEmpty();
            const numColors = Math.min(p.colors, Config.COLORS.length);
            const level = p.level || 1;
            
            // Progressive difficulty rows
            p.rows = p.rows || Math.max(4, Math.min(10, 4 + Math.floor(level / 2)));
            const stoneChance = p.stoneChance || 0;
            
            // Pre-fill with random colors
            for (let r = 0; r < p.rows; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (r % 2 !== 0 && c === Config.GRID_COLS - 1) continue;
                    if (stoneChance > 0 && Math.random() < stoneChance) {
                        this.grid[r][c] = { color: Config.STONE_COLOR };
                    } else {
                        this.grid[r][c] = { color: Config.COLORS[Math.floor(Math.random() * numColors)] };
                    }
                }
            }
            
            // Remove Cellular Automata to avoid massive single-color blobs.
            // Pure random generation naturally creates organic, industry-standard clusters (pairs and triplets).
            // We just ensure no massive blocks form by keeping it purely randomized.
            
            // Guarantee at least one massive 3-bubble cluster at the very bottom so the player always has a starting move
            const bottomRow = p.rows - 1;
            const startCol = Math.floor(Config.GRID_COLS / 2);
            const startColor = Math.floor(Math.random() * numColors);
            this.grid[bottomRow][startCol] = { color: Config.COLORS[startColor] };
            if (this.grid[bottomRow][startCol - 1]) this.grid[bottomRow][startCol - 1] = { color: Config.COLORS[startColor] };
            if (this.grid[bottomRow - 1] && this.grid[bottomRow - 1][startCol]) this.grid[bottomRow - 1][startCol] = { color: Config.COLORS[startColor] };
            
            return true;
        }

        countBubbles() {
            let remaining = 0;
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.grid[r] && this.grid[r][c]) remaining++;
                }
            }
            return { total: this.initialBubbleCount || remaining, remaining };
        }

        setInitialBubbleCount() {
            let count = 0;
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.grid[r] && this.grid[r][c]) count++;
                }
            }
            this.initialBubbleCount = count;
        }

        getCell(r, c) { 
            return (r < 0 || r >= Config.GRID_ROWS || c < 0 || c >= Config.GRID_COLS) ? null : this.grid[r][c]; 
        }
        
        setCell(r, c, val) { 
            if (r >= 0 && r < Config.GRID_ROWS && c >= 0 && c < Config.GRID_COLS) this.grid[r][c] = val; 
        }
        
        isEmpty() { 
            for(let r = 0; r < Config.GRID_ROWS; r++) {
                for(let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.grid[r] && this.grid[r][c]) return false;
                }
            }
            return true; 
        }
        
        getNeighbors(r, c) {
            const offsets = (r % 2 === 0) ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
            let res = []; 
            for (let o of offsets) { 
                let nr = r + o[0], nc = c + o[1]; 
                if (nr >= 0 && nr < Config.GRID_ROWS && nc >= 0 && nc < Config.GRID_COLS) res.push({r: nr, c: nc}); 
            } 
            return res;
        }

        findMatches(r, c, id) {
            if (!this.grid[r] || !this.grid[r][c] || this.grid[r][c].color.id !== id || this.grid[r][c].color.isStone) return [];
            let v = new Set(), q = [{r, c}], m = []; 
            v.add(`${r},${c}`); 
            m.push({r, c});
            let iter = 0;
            while (q.length && iter < Config.GRID_ROWS * Config.GRID_COLS * 2) { 
                iter++;
                let cur = q.shift(); 
                for (let n of this.getNeighbors(cur.r, cur.c)) { 
                    let k = `${n.r},${n.c}`; 
                    if (this.grid[n.r] && this.grid[n.r][n.c] && !v.has(k) && this.grid[n.r][n.c].color.id === id) { 
                        v.add(k); m.push(n); q.push(n); 
                    } 
                } 
            } 
            if (m.length < 3) return [];
            return m;
        }

        getFloatingBubbles() {
            let v = new Set(), q = [];
            for (let c = 0; c < Config.GRID_COLS; c++) {
                if (this.grid[0] && this.grid[0][c]) { 
                    let k = `0,${c}`; 
                    if (!v.has(k)) { q.push({r:0, c}); v.add(k); } 
                }
            }
            let iter = 0;
            while(q.length && iter < Config.GRID_ROWS * Config.GRID_COLS * 2) { 
                iter++;
                let cur = q.shift(); 
                for(let n of this.getNeighbors(cur.r, cur.c)) { 
                    let k = `${n.r},${n.c}`; 
                    if(this.grid[n.r] && this.grid[n.r][n.c] && !v.has(k)) { v.add(k); q.push(n); } 
                } 
            }
            let f = []; 
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.grid[r] && this.grid[r][c] && !v.has(`${r},${c}`)) f.push({r,c});
                }
            }
            return f;
        }

        /**
         * Añade filas de techo SIN crear 3 consecutivos
         */
        addCeiling(nColors) {
            for(let c = 0; c < Config.GRID_COLS; c++) {
                if((this.grid[Config.GRID_ROWS-1] && this.grid[Config.GRID_ROWS-1][c]) || (this.grid[Config.GRID_ROWS-2] && this.grid[Config.GRID_ROWS-2][c])) return false;
            }
            this.grid.pop(); 
            this.grid.pop();
            
            // Generar nuevas filas respetando la restricción de 3 consecutivos
            let row1 = new Array(Config.GRID_COLS).fill(null);
            let row2 = new Array(Config.GRID_COLS).fill(null);
            
            // Primera fila nueva (será row 1 después del unshift)
            for (let c = 0; c < Config.GRID_COLS; c++) {
                // Temporalmente insertar para verificar
                this.grid.unshift(row2);
                this.grid.unshift(row1);
                
                const colorId = this.pickColorWithoutConsecutive(0, c, nColors);
                row1[c] = { color: Config.COLORS[colorId] };
                
                // Remover temporales
                this.grid.shift();
                this.grid.shift();
            }
            
            // Segunda fila nueva
            this.grid.unshift(row1);
            for (let c = 0; c < Config.GRID_COLS; c++) {
                if (c === Config.GRID_COLS - 1) continue; // Fila impar
                
                this.grid.unshift(row2);
                const colorId = this.pickColorWithoutConsecutive(0, c, nColors);
                row2[c] = { color: Config.COLORS[colorId] };
                this.grid.shift();
            }
            this.grid.shift(); // Remover row1 temporal
            
            this.grid.unshift(row2);
            this.grid.unshift(row1); 
            return true;
        }

        pickValidColor(hCheck, recentColors = []) {
            let ex = new Set(), da = new Set(), maxR = -1;
            let colorCounts = {};

            for(let r = 0; r < Config.GRID_ROWS; r++) {
                for(let c = 0; c < Config.GRID_COLS; c++) {
                    if(this.grid[r] && this.grid[r][c] && !this.grid[r][c].color.isStone) { 
                        let cid = this.grid[r][c].color.id;
                        ex.add(cid); 
                        if (r > maxR) maxR = r; 
                        colorCounts[cid] = (colorCounts[cid] || 0) + 1;
                    }
                }
            }
            if (!ex.size) return Config.COLORS[0];
            
            if (maxR >= 0) {
                // Zona de peligro ampliada a las últimas 3 filas
                for(let r = Math.max(0, maxR - 2); r <= maxR; r++) {
                    for(let c = 0; c < Config.GRID_COLS; c++) {
                        if(this.grid[r] && this.grid[r][c]) da.add(this.grid[r][c].color.id);
                    }
                }
            }
            
            let all = Array.from(ex), dang = Array.from(da);
            
            // Filtrar colores que crearían 3 consecutivos en la cola
            let validColors = all.filter(colorId => {
                if (recentColors.length >= 2) {
                    const last = recentColors[recentColors.length - 1];
                    const secondLast = recentColors[recentColors.length - 2];
                    if (last === secondLast && colorId === last) return false;
                }
                return true;
            });
            
            if (validColors.length === 0) {
                validColors = all.filter(c => recentColors.length === 0 || c !== recentColors[recentColors.length - 1]);
                if (validColors.length === 0) validColors = all;
            }
            
            // Dopamine Engine: Ajustar probabilidad según el estado del jugador
            let dangerValid = validColors.filter(c => dang.includes(c));
            if (all.length === 1) return Config.COLORS[all[0]];

            // 1. "Momentos Épicos" (Clutch moments): Si queda poca munición, ayudarle
            const ammo = this.game && this.game.ammoCount !== undefined ? this.game.ammoCount : 100;
            if (ammo < 12 && dangerValid.length > 0) {
                if (Math.random() < 0.85) { // 85% de darle lo que necesita abajo
                    return Config.COLORS[dangerValid[Math.floor(Math.random() * dangerValid.length)]];
                }
            }

            // 2. "Satisfacción de Explosión" (Dopamine hit)
            let mostAbundant = validColors[0];
            for (let c of validColors) {
                if (colorCounts[c] > colorCounts[mostAbundant]) mostAbundant = c;
            }
            
            const r = Math.random();
            
            // 3. Sistema Anti-Frustración: Si el nivel baja mucho, dar colores de la zona baja
            if (hCheck(maxR) && dangerValid.length > 0 && r < 0.70) {
                return Config.COLORS[dangerValid[Math.floor(Math.random() * dangerValid.length)]];
            }
            
            // 4. Crear "Derrumbes" (Clusters grandes): Alta prob de dar el color más numeroso
            if (r < 0.40 && colorCounts[mostAbundant] >= 5) {
                return Config.COLORS[mostAbundant];
            }
            
            // Fallback: Aleatorio entre válidos
            return Config.COLORS[validColors[Math.floor(Math.random() * validColors.length)]];
        }

        cloneGrid() { return JSON.parse(JSON.stringify(this.grid)); }

        validateMove(r, c, color) {
            if (r < 0 || r >= Config.GRID_ROWS || c < 0 || c >= Config.GRID_COLS) return false;
            const backupGrid = this.cloneGrid();
            this.setCell(r, c, {color});
            const isConnected = this.isConnectedToTop(r, c);
            if (!isConnected) { this.grid = backupGrid; return false; }
            this.grid = backupGrid;
            return true;
        }

        findNearestValid(r, c, color) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (this.validateMove(nr, nc, color)) return {r: nr, c: nc};
                }
            }
            return null;
        }

        isConnectedToTop(r, c) {
            let v = new Set(), q = [{r, c}]; 
            v.add(`${r},${c}`);
            let iter = 0;
            while (q.length && iter < Config.GRID_ROWS * Config.GRID_COLS * 2) {
                iter++;
                let cur = q.shift();
                if (cur.r === 0) return true;
                for (let n of this.getNeighbors(cur.r, cur.c)) {
                    let k = `${n.r},${n.c}`;
                    if (this.getCell(n.r, n.c) && !v.has(k)) { v.add(k); q.push(n); }
                }
            }
            return false;
        }
    }

    // ============================================================
    // PHYSICS ENGINE - Motor de física
    // ============================================================
    class PhysicsEngine {
        constructor(model) { 
            this.model = model; 
            this.width = 2000; 
            this.height = 2000; 
            this.tileSize = 1; 
            this.radius = 1; 
            this.offsetX = 0; 
            this.rowHeight = 1;
        }

        updateDimensions(w, h) { 
            if (w === 0 || h === 0) return; 
            this.width = w; 
            this.height = h; 
            
            // Garantizar simetría perfecta:
            // Las filas impares sobresalen medio bubble a la derecha, pero tienen una burbuja menos.
            // Ancho total necesario = GRID_COLS burbujas.
            // Dejamos un 4% de ancho total como márgenes (2% izquierda, 2% derecha).
            const paddingX = w * 0.04;
            const usableWidth = w - paddingX;
            
            this.tileSize = usableWidth / Config.GRID_COLS; 
            this.radius = this.tileSize / 2; 
            
            this.offsetX = paddingX / 2; 
            this.rowHeight = this.tileSize * Math.sin(Math.PI/3); 
        }

        getGridPos(r, c) { 
            const tSize = this.tileSize || 1;
            const rHeight = this.rowHeight || 1;
            const offX = this.offsetX || 0;
            let x = c * tSize + tSize/2 + offX; 
            if (r % 2 !== 0) x += tSize/2; 
            return {x, y: r * rHeight + tSize/2}; 
        }
        
        snapToGrid(cx, cy) {
            if (!this.rowHeight || this.rowHeight === 0) return null; 
            let rApprox = Math.round((cy - this.tileSize/2) / this.rowHeight);
            rApprox = Math.max(0, Math.min(Config.GRID_ROWS - 1, rApprox));
            let best = null, minDist = Infinity;
            for (let r = Math.max(0, rApprox - 1); r <= Math.min(Config.GRID_ROWS - 1, rApprox + 1); r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (!this.model.getCell(r, c)) {
                        let hasSupport = this.model.isConnectedToTop(r, c);
                        if (hasSupport) { 
                            let pos = this.getGridPos(r, c); 
                            let dist = (cx - pos.x)**2 + (cy - pos.y)**2; 
                            if (dist < minDist) { minDist = dist; best = {r, c}; } 
                        }
                    }
                }
            }
            if (!best && cy <= this.radius*3) {
                let r = 0, minCDist = Infinity;
                for(let c = 0; c < Config.GRID_COLS; c++) {
                    if(!this.model.getCell(r, c)) { 
                        let pos = this.getGridPos(r, c); 
                        let d = (cx - pos.x)**2 + (cy - pos.y)**2; 
                        if(d < minCDist) { minCDist = d; best = {r,c}; } 
                    }
                }
            }
            return best;
        }

        step(b, stepSize = Config.PHYSICS_STEP) {
            b.x += Math.cos(b.angle) * stepSize;
            b.y += Math.sin(b.angle) * stepSize;
            if (b.x < this.radius) { b.x = this.radius; b.angle = Math.PI - b.angle; b.bounces++; }
            else if (b.x > this.width - this.radius) { b.x = this.width - this.radius; b.angle = Math.PI - b.angle; b.bounces++; }
            if (b.y < this.radius) return true; 
            if (b.bounces > 10) return true;
            let rApprox = Math.round((b.y - this.tileSize/2) / this.rowHeight);
            for (let r = Math.max(0, rApprox-1); r < Math.min(Config.GRID_ROWS, rApprox+2); r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    if (this.model.getCell(r, c)) {
                        let pos = this.getGridPos(r, c);
                        if ((b.x - pos.x)**2 + (b.y - pos.y)**2 < (this.radius*2)**2 * Config.HITBOX_RATIO) return true; 
                    }
                }
            }
            return false; 
        }

        simulateShot(startX, startY, angle, color) {
            let ghost = { x: startX, y: startY, angle: angle, bounces: 0 };
            let steps = 0;
            while (steps < 250) { 
                steps++;
                if (this.step(ghost)) { 
                    let snap = this.snapToGrid(ghost.x, ghost.y);
                    if (!snap) return null;
                    this.model.setCell(snap.r, snap.c, {color});
                    let matches = this.model.findMatches(snap.r, snap.c, color.id);
                    let score = 0;
                    if (matches.length >= 3) {
                        score += matches.length * 10;
                        if (matches.length > 5) score += 50; 
                        
                        // Simulate dropped bubbles for accurate heuristic
                        let backup = matches.map(m => ({r: m.r, c: m.c, cell: this.model.getCell(m.r, m.c)}));
                        backup.forEach(m => this.model.setCell(m.r, m.c, null));
                        let drops = this.model.getFloatingBubbles();
                        score += drops.length * 30; // High value for dropping bubbles
                        backup.forEach(m => this.model.setCell(m.r, m.c, m.cell));
                    }
                    this.model.setCell(snap.r, snap.c, null); 
                    if (score === 0 && matches.length < 3) return { score:0, angle, bounces: ghost.bounces, type:"Posición", snap };
                    return { score, angle, bounces: ghost.bounces, type: ghost.bounces > 0 ? "Rebote" : "Directo", snap };
                }
            }
            return null;
        }
    }

    // ============================================================
    // RENDERER - Motor de renderizado
    // ============================================================
    class Renderer {
        constructor(cId, phys, evs) {
            this.canvas = document.getElementById(cId); 
            this.ctx = this.canvas.getContext('2d', { alpha: false }); 
            this.physics = phys; 
            this.shake = 0; 
            this.parts = []; 
            this.dropped = []; 
            this.floaters = [];
            this.game = null; 
            
            evs.on(Events.SHAKE, a => this.shake = a);
            
            evs.on(Events.PARTICLES, ({r,c,color}) => { 
                if (!GameSettings.visualEffects) return;
                let p = this.physics.getGridPos(r,c); 
                for(let i = 0; i < 6; i++) {
                    const vx = (Math.random()-.5)*14;
                    const vy = -8 - Math.random()*12; 
                    this.parts.push({x:p.x, y:p.y, vx, vy, life:1.2, color, gravity:0.4});
                }
            });
            
            evs.on(Events.DROP, ({r,c,color}) => { 
                let p = this.physics.getGridPos(r,c); 
                this.dropped.push({x:p.x, y:p.y, vx:(Math.random()-0.5)*2, vy:0, color});
            });
            
            evs.on(Events.TEXT_FLOAT, ({r, c, text}) => {
                let p = this.physics.getGridPos(r, c);
                this.floaters.push({x: p.x, y: p.y, text: text, life: 1, dy: -2});
            });
            
            this.trajCache = null;
            this.lastTrajAngle = null;
        }
        
        setGameInstance(game) { 
            this.game = game; 
        }
        
        resize() { 
            const p = this.canvas.parentElement;
            const d = window.devicePixelRatio || 1; 
            this.canvas.width = p.offsetWidth * d; 
            this.canvas.height = p.offsetHeight * d; 
            this.ctx.scale(d, d); 
            return {w: p.offsetWidth, h: p.offsetHeight}; 
        }
        
        drawBubble(x, y, r, c, a = 1) {
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) return;
            const actualRadius = r * GameSettings.bubbleSize;
            this.ctx.globalAlpha = a;
            const g = this.ctx.createRadialGradient(x - actualRadius * .3, y - actualRadius * .3, actualRadius * .1, x, y, actualRadius);
            g.addColorStop(0, c.light);
            g.addColorStop(.4, c.main);
            g.addColorStop(1, '#000');
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.arc(x, y, actualRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x - actualRadius * .3, y - actualRadius * .3, actualRadius * .2, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (GameSettings.colorblind && c.id !== undefined && r > 5) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = `bold ${actualRadius * 0.8}px sans-serif`;
                const symbols = ['●', '▲', '■', '★', '♦', '♥', '✿'];
                this.ctx.fillText(symbols[c.id % symbols.length], x, y + 1);
            }
            
            this.ctx.globalAlpha = 1;
        }
        
        clearAll() {
            this.parts = [];
            this.dropped = [];
            this.floaters = [];
            this.trajCache = null;
            this.lastTrajAngle = null;
        }

        draw(model, cur, bul, n1, n2, gA) {
            if (!model || !model.grid || !Array.isArray(model.grid)) {
                console.warn('Invalid model/grid');
                return;
            }
            
            const lw = this.canvas.width / (window.devicePixelRatio || 1);
            const lh = this.canvas.height / (window.devicePixelRatio || 1);
            
            this.ctx.clearRect(0, 0, lw, lh); 
            this.ctx.save();
            
            if(this.shake > 0 && GameSettings.visualEffects) { 
                this.ctx.translate((Math.random()-.5)*this.shake, (Math.random()-.5)*this.shake); 
                this.shake *= .9; 
                if(this.shake < .5) this.shake = 0; 
            }
            
            const g = this.ctx.createLinearGradient(0, 0, 0, 20); 
            g.addColorStop(0, '#111'); 
            g.addColorStop(1, '#222'); 
            this.ctx.fillStyle = g; 
            this.ctx.fillRect(0, 0, lw, 20); 
            this.ctx.beginPath(); 
            this.ctx.moveTo(0, 20); 
            this.ctx.lineTo(lw, 20); 
            this.ctx.strokeStyle = '#D4AF37'; 
            this.ctx.lineWidth = 4; 
            this.ctx.stroke();
            
            if (cur) {
                const dangerY = cur.y - this.physics.radius * 2;
                
                this.ctx.save();
                
                this.ctx.beginPath();
                this.ctx.moveTo(0, dangerY);
                this.ctx.lineTo(lw, dangerY);
                this.ctx.strokeStyle = '#FF3B30';
                this.ctx.lineWidth = 1;
                this.ctx.shadowColor = '#FF3B30';
                this.ctx.shadowBlur = 8;
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(0, dangerY);
                this.ctx.lineTo(lw, dangerY);
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 0.3;
                this.ctx.shadowColor = '#FF3B30';
                this.ctx.shadowBlur = 4;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
            
            for(let r = 0; r < model.grid.length; r++) {
                for(let c = 0; c < Config.GRID_COLS; c++) { 
                    let cell = model.getCell(r, c); 
                    if(cell) { 
                        const p = this.physics.getGridPos(r, c);
                        this.drawBubble(p.x, p.y, this.physics.radius, cell.color);
                    } 
                }
            }
            
            if(cur && !bul && GameSettings.showTrajectory) this.drawTraj(cur, gA);
            if(cur && !bul) this.drawBubble(cur.x, cur.y, this.physics.radius, cur.color);
            if(bul) this.drawBubble(bul.x, bul.y, this.physics.radius, bul.color);
            
            if(cur) {
                let nx = cur.x - 85, ny = cur.y + 15;
                if(n2) this.drawBubble(nx - 40, ny + 20, this.physics.radius * .7, n2, .85);
                if(n1) this.drawBubble(nx + 40, ny + 20, this.physics.radius * .7, n1, .85);
                if(n1) {
                    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    this.ctx.font = '9px Inter';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('SIGUIENTE', nx, ny - this.physics.radius * .7 - 8);
                }
            }
            
            if (this.parts.length > 300) this.parts = this.parts.slice(-300); 
            for(let i = this.parts.length - 1; i >= 0; i--) { 
                let p = this.parts[i]; 
                if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { 
                    this.parts.splice(i, 1); 
                    continue; 
                }
                p.x += p.vx; 
                p.y += p.vy; 
                p.vy += p.gravity || 0.4; 
                p.life -= .015; 
                this.drawBubble(p.x, p.y, 4, {main: p.color, light: '#fff'}, Math.max(0, p.life)); 
                if(p.life <= 0) this.parts.splice(i, 1); 
            }
            
            if (this.dropped.length > 300) this.dropped = this.dropped.slice(-300);
            for (let i = this.dropped.length - 1; i >= 0; i--) {
                let d = this.dropped[i];
                if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) { 
                    this.dropped.splice(i, 1); 
                    continue; 
                }
                d.vy += 1; 
                d.y += d.vy; 
                d.x += d.vx;
                this.drawBubble(d.x, d.y, this.physics.radius, d.color);
                if (d.y > lh + 50) this.dropped.splice(i, 1);
            }
            
            for (let i = this.floaters.length - 1; i >= 0; i--) {
                let f = this.floaters[i];
                if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) { 
                    this.floaters.splice(i, 1); 
                    continue; 
                }
                f.y += f.dy; 
                f.life -= 0.02;
                this.ctx.font = "bold 16px Inter";
                this.ctx.fillStyle = `rgba(48, 209, 88, ${f.life})`;
                this.ctx.textAlign = "center";
                this.ctx.fillText(f.text, f.x, f.y);
                if (f.life <= 0) this.floaters.splice(i, 1);
            }
            
            this.ctx.restore();
        }

        drawTraj(cur, a) {
            if (Math.abs(cur.angle - this.lastTrajAngle) > 0.01 || !this.trajCache) {
                this.trajCache = [];
                this.lastTrajAngle = cur.angle;
                let ghost = {x: cur.x, y: cur.y, angle: cur.angle, bounces: 0};
                let lastX = ghost.x, lastY = ghost.y;
                while (this.trajCache.length < 300) {
                    if (this.physics.step(ghost)) break;
                    this.trajCache.push({x1: lastX, y1: lastY, x2: ghost.x, y2: ghost.y, bounce: ghost.bounces});
                    lastX = ghost.x; 
                    lastY = ghost.y;
                }
            }
            
            if(this.trajCache) {
                this.ctx.lineWidth = GameSettings.trajectoryWidth;
                for(let seg of this.trajCache) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(seg.x1, seg.y1);
                    this.ctx.lineTo(seg.x2, seg.y2);
                    this.ctx.strokeStyle = seg.bounce > 0 ? '#FFD60A' : '#30D158';
                    this.ctx.stroke();
                }
            }
        }
    }
    // ============================================================
    // GAME CONTROLLER - Controlador principal
    // CORREGIDO: Sistema de swap con reglas consistentes
    // ============================================================
    class GameController {
        constructor() {
            this.events = new EventEmitter(); 
            this.audio = new AudioSystem(this.events); 
            this.model = new GridModel(this); 
            this.physics = new PhysicsEngine(this.model); 
            this.renderer = new Renderer('gameCanvas', this.physics, this.events);
            this.renderer.setGameInstance(this); 
            
            this.state = GameState.MENU; 
            this.level = 1; 
            this.maxLevelReached = 0;
            this.lastFrameTime = Date.now();
            
            this.sessionStats = { 
                consecutive: 0, 
                droppedMax: 0, 
                wonLow: false,
                totalShots: 0, 
                successfulShots: 0, 
                maxCombo: 0,
                totalDropped: 0, 
                aiUsed: 0, 
                swapsUsed: 0
            };
            
            this.swapUses = 3;
            this.aiUsesLeft = 3;
            this.shotsUntilDrop = 8;
            this.mode = 'normal';
            this.currentStreak = 0;
            this.isGodMode = false;
            this.quoteQueue = { win: {sarcasm:[], motivation:[]}, lose: {sarcasm:[], motivation:[]} };
            this.boundHandlers = { input: null, resize: null };
            
            this.isDescending = false;
            this.levelElapsedTime = 0;
            this.timerRunning = false;
            this.levelStartTime = 0;
            this.attemptsLeft = 0;
            
            this.currentBubble = null;
            this.bullet = null;
            
            // ============================================================
            // SISTEMA DE COLA DE BURBUJAS CORREGIDO
            // Cola visible: nextBubbleColor -> secondNextBubbleColor -> thirdNextBubbleColor
            // Reserva para swap: swapReserveColor (color "anterior" para intercambio)
            // ============================================================
            this.nextBubbleColor = null;
            this.secondNextBubbleColor = null;
            this.thirdNextBubbleColor = null;
            this.swapReserveColor = null;  // Color de reserva para swap (el "anterior")
            
            this.guideLineAlpha = 0;
            this.comboMultiplier = 1;
            this.playerName = null;
            
            this.tutorialSteps = [
                {text: '(Aviso: Este tutorial solo es obligatorio la primera vez que juegas en el sistema).\n\nDesliza para apuntar. Suelta para disparar. Usa rebotes.', highlight: '#gameCanvas'},
                {text: 'Usa IA HELP si atascado. 3 usos por nivel.', highlight: '#aiCapsule'},
                {text: 'Intercambia burbujas con SWAP. Cambia al color anterior.', highlight: '#swapCapsule'},
                {text: 'Progreso se guarda automáticamente.', highlight: null}
            ];

            this.analytics = {
              fallenByDisconnectionThisShot: 0,
              fallenByDisconnectionRatio: 0,
              shotsSinceLastCascade: 0,
              boardNotImproving: false,
              isBounceShot: false,
              createdCluster: false,
              improvedBoard: false,
              nearDeathState: false,
              gameDurationMs: 0,
              nearDeathMoments: 0,
              totalShots: 0,
              remainingBubbles: 0,
              maxCascadeSize: 0
            };

            this.totalGames = 0;
            this.retriesOnCurrentLevel = 0;
            this.playerIsNew = true;

            GameSettings.load();
            GameSettings.apply();
            this.loadProgress();
            
            this.healthMonitor = new GameHealthMonitor(this);
            
            this.handleResize(); 
            this.bindUI(); 
            this.loop = this.loop.bind(this); 
            requestAnimationFrame(this.loop);
            this.audio.init();
            
            let resizeTimeout;
            const throttledResize = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.handleResize();
                }, 10);
            };
            window.addEventListener('resize', throttledResize);
            window.addEventListener('orientationchange', throttledResize);
            if ('visualViewport' in window) {
                window.visualViewport.addEventListener('resize', throttledResize);
            }
        }


        // ============================================================
        // SISTEMA DE SELECCIÓN DE COLOR PARA COLA (SIN 3 CONSECUTIVOS)
        // ============================================================
        
        /**
         * Genera un color válido para la cola que NO cree 3 consecutivos
         * @param {Array} recentColorIds - Array de IDs de colores recientes en la cola
         */
        pickQueueColor(recentColorIds = []) {
            const chk = (mr) => (mr * this.physics.rowHeight) > this.physics.height * 0.6;
            return this.model.pickValidColor(chk, recentColorIds);
        }
        
        /**
         * Obtiene los IDs de colores actuales en la cola visible
         */
        getQueueColorIds() {
            const ids = [];
            if (this.currentBubble && this.currentBubble.color) ids.push(this.currentBubble.color.id);
            if (this.nextBubbleColor) ids.push(this.nextBubbleColor.id);
            if (this.secondNextBubbleColor) ids.push(this.secondNextBubbleColor.id);
            if (this.thirdNextBubbleColor) ids.push(this.thirdNextBubbleColor.id);
            return ids;
        }
        
        /**
         * Valida que la cola no tenga 3 colores consecutivos iguales
         */
        validateQueueNoConsecutive() {
            const ids = this.getQueueColorIds();
            for (let i = 0; i < ids.length - 2; i++) {
                if (ids[i] === ids[i+1] && ids[i+1] === ids[i+2]) {
                    return false;
                }
            }
            return true;
        }
        
        /**
         * Regenera un color en la cola si hay 3 consecutivos
         */
        fixQueueIfNeeded() {
            const ids = this.getQueueColorIds();
            
            // Verificar posición por posición
            for (let i = 0; i < ids.length - 2; i++) {
                if (ids[i] === ids[i+1] && ids[i+1] === ids[i+2]) {
                    // Hay 3 consecutivos, regenerar el tercero
                    const recentIds = ids.slice(0, i + 2);
                    const newColor = this.pickQueueColor(recentIds);
                    
                    // Determinar qué variable actualizar
                    if (i === 0) {
                        this.secondNextBubbleColor = newColor;
                    } else if (i === 1) {
                        this.thirdNextBubbleColor = newColor;
                    }
                    
                    if (this.healthMonitor) {
                        this.healthMonitor.logEvent('QUEUE_FIXED', { 
                            position: i + 2, 
                            oldColorId: ids[i], 
                            newColorId: newColor.id 
                        });
                    }
                }
            }
        }

        loadProgress() {
            try {
                const saved = SecureStorage.load('bubbleShooterSave');
                const badge = document.getElementById('load-badge');
                const badgeContainer = document.getElementById('load-badge-container');
                const nameInput = document.getElementById('playerNameInput');
                const welcomeMsg = document.getElementById('welcome-message');
                const resetBtn = document.getElementById('resetUserBtn');
                
                const persistentName = localStorage.getItem('playerName');
                
                if (saved && Array.isArray(saved.grid) && Number.isFinite(saved.level) && saved.playerName) {
                    badge.innerText = `PARTIDA GUARDADA (Nivel ${saved.level})`; 
                    badge.classList.remove('empty'); 
                    badgeContainer.classList.remove('display-none');
                    nameInput.classList.add('display-none');
                    welcomeMsg.innerText = `Jugador: ${saved.playerName}`; 
                    welcomeMsg.classList.remove('display-none');
                    resetBtn.classList.remove('display-none');
                    const resumeBtn = document.getElementById('resumeSavedGameBtn');
                    if (resumeBtn) resumeBtn.classList.remove('display-none');
                    this.playerName = saved.playerName;
                    this.playerIsNew = false;
                    this.totalGames = saved.totalGames || 0;
                    this.retriesOnCurrentLevel = saved.retriesOnCurrentLevel || 0;
                    localStorage.setItem('playerName', saved.playerName);
                } else {
                    badge.innerText = 'NO HAY PARTIDA GUARDADA'; 
                    badge.classList.add('empty'); 
                    badgeContainer.classList.remove('display-none');
                    
                    if (persistentName) {
                        nameInput.classList.add('display-none');
                        welcomeMsg.innerText = `Jugador: ${persistentName}`;
                        welcomeMsg.classList.remove('display-none');
                        resetBtn.classList.remove('display-none');
                        this.playerName = persistentName;
                        this.playerIsNew = false;
                    } else {
                        nameInput.classList.remove('display-none');
                        nameInput.value = ''; 
                        nameInput.placeholder = 'Introduce tu nombre';
                        nameInput.required = true;
                        welcomeMsg.classList.add('display-none'); 
                        resetBtn.classList.add('display-none');
                        const resumeBtn = document.getElementById('resumeSavedGameBtn');
                        if (resumeBtn) resumeBtn.classList.add('display-none');
                    }
                }
            } catch(e) { 
                console.warn('Error loading progress:', e);
                SecureStorage.remove('bubbleShooterSave');
                document.getElementById('playerNameInput').classList.remove('display-none');
                document.getElementById('welcome-message').classList.add('display-none');
                document.getElementById('resetUserBtn').classList.add('display-none');
            }
        }

        getQuote(type, category) {
            if (!this.quoteQueue) this.quoteQueue = { win: {sarcasm:[], motivation:[]}, lose: {sarcasm:[], motivation:[]} };
            let deck = this.quoteQueue[type][category];
            if (!deck || deck.length === 0) {
                const source = Config.QUOTES[type][category] || ["System Error: No quotes"];
                deck = [...source]; 
                deck.sort(() => Math.random() - 0.5);
                this.quoteQueue[type][category] = deck;
            }
            return this.quoteQueue[type][category].pop();
        }

        isNameTaken(name) {
            const bd = JSON.parse(localStorage.getItem('bubbleShooterLeaderboard')) || [];
            return bd.some(e => e.name.toLowerCase() === name.toLowerCase());
        }

        validatePlayerName(nameInput) {
            const name = nameInput.trim();
            if (!name) { alert('❌ Nombre inválido: No puede estar vacío.'); return false; }
            if (name.toLowerCase() === 'developer') { alert('❌ Nombre reservado: "Developer" solo para uso interno.'); return false; }
            if (this.isNameTaken(name)) { alert('❌ Nombre ya existe en el ranking. Usa otro nombre.'); return false; }
            return true;
        }

        unbindGameplayListeners() {
            if (!this.boundHandlers.input) return;
            const canvas = this.renderer.canvas;
            canvas.removeEventListener('mousedown', this.boundHandlers.input);
            canvas.removeEventListener('mousemove', this.boundHandlers.input);
            canvas.removeEventListener('mouseup', this.boundHandlers.input);
            canvas.removeEventListener('touchstart', this.boundHandlers.input);
            canvas.removeEventListener('touchmove', this.boundHandlers.input);
            canvas.removeEventListener('touchend', this.boundHandlers.input);
            this.boundHandlers.input = null;
            if (this.healthMonitor) this.healthMonitor.logEvent('LISTENERS_REMOVED', { target: 'canvas' });
        }

        rebindGameplayListeners() {
            this.unbindGameplayListeners();
            const canvas = this.renderer.canvas;
            
            this.boundHandlers.input = (e) => {
                if (e.type.startsWith('touch')) e.preventDefault();
                if(this.state !== GameState.READY || !this.currentBubble) return;
                if(e.target.closest('button') || e.target.closest('.interactive') || e.target.closest('#ai-panel') || e.target.closest('#pause-overlay') || e.target.closest('#tutorial-overlay') || e.target.closest('#settings-overlay')) return;
                this.audio.init();
                const r = this.renderer.canvas.getBoundingClientRect();
                let cx = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
                let cy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
                if(document.getElementById('ai-panel').classList.contains('visible')) { 
                    document.getElementById('ai-panel').classList.remove('visible'); 
                    this.guideLineAlpha = 0; 
                }
                let a = Math.atan2((cy - r.top) - this.currentBubble.y, (cx - r.left) - this.currentBubble.x);
                if(a < -Math.PI + .02 && a > -Math.PI/2) a = -Math.PI + .02; 
                if(a > -.02 && a < -Math.PI/2) a = -.02; 
                if(a > 0) a = -Math.PI/2;
                this.currentBubble.angle = a;
                if(e.type === 'mouseup' || e.type === 'touchend') this.fire();
            };
            
            canvas.addEventListener('mousedown', this.boundHandlers.input);
            canvas.addEventListener('mousemove', this.boundHandlers.input); 
            canvas.addEventListener('mouseup', this.boundHandlers.input); 
            canvas.addEventListener('touchstart', this.boundHandlers.input, {passive: false});
            canvas.addEventListener('touchmove', this.boundHandlers.input, {passive: false}); 
            canvas.addEventListener('touchend', this.boundHandlers.input, {passive: false});
            
            if (this.healthMonitor) this.healthMonitor.logEvent('LISTENERS_ADDED', { target: 'canvas' });
        }

        cleanupGameState() {
            this.unbindGameplayListeners();
            this.renderer.clearAll();
            this.model.resetEmpty();
            this.bullet = null;
            this.currentBubble = null;
            this.timerRunning = false;
            
            const canvas = this.renderer.canvas;
            canvas.style.display = 'none';
            canvas.style.opacity = '0';
            
            const ctx = this.renderer.ctx;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (this.healthMonitor) this.healthMonitor.logEvent('GAME_STATE_CLEANED', {});
        }

        resetUIState() {
            const screens = ['screen-start', 'screen-summary', 'screen-summary-step2', 'screen-closure'];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) { 
                    el.classList.add('display-none'); 
                    el.style.opacity = '0'; 
                }
            });
            
            const overlay = document.getElementById('overlay');
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
            
            const canvas = this.renderer.canvas;
            canvas.style.display = 'none';
            canvas.style.opacity = '0';
            
            const hud = document.querySelector('.hud-layer');
            if (hud) hud.style.opacity = '0';
            
            document.getElementById('level-message').style.opacity = '0';
            document.getElementById('menu-message').style.opacity = '0';
            document.getElementById('timer').style.opacity = '0';
            document.getElementById('timer').style.display = 'none';
            
            if (this.healthMonitor) this.healthMonitor.logEvent('UI_STATE_RESET', {});
        }

        fullGameReset() {
            if (this.healthMonitor) this.healthMonitor.logEvent('FULL_GAME_RESET', {});
            
            SecureStorage.remove('bubbleShooterSave');
            localStorage.removeItem('bubbleShooterSettings');
            localStorage.removeItem('tutorial_complete');
            localStorage.removeItem('tutorial_completed');
            localStorage.removeItem('first_ai');
            localStorage.removeItem('first_swap');
            
            this.level = 1;
            this.maxLevelReached = 0;
            this.playerName = null;
            this.isGodMode = false;
            this.mode = 'normal';
            this.attemptsLeft = 0;
            this.aiUsesLeft = 3;
            this.swapUses = 3;
            this.ammoCount = 0;
            this.isAutoBotActive = false;
            this.botWaitingToFire = false;
            this.sessionStats = { 
                consecutive: 0, 
                droppedMax: 0, 
                wonLow: false,
                totalShots: 0, 
                successfulShots: 0, 
                maxCombo: 0,
                totalDropped: 0, 
                aiUsed: 0, 
                swapsUsed: 0
            };
            
            this.cleanupGameState();
            this.resetUIState();
            this.loadProgress();
            
            const screenStart = document.getElementById('screen-start');
            screenStart.classList.remove('display-none');
            screenStart.style.opacity = '1';
            
            document.getElementById('accessBtn').style.display = 'block';
            document.getElementById('start-main').style.display = 'none';
            
            const devBtn = document.getElementById('devConsoleBtn');
            if (devBtn) {
                devBtn.classList.remove('visible');
                devBtn.classList.add('display-none');
            }
            const godBtn = document.getElementById('godNextBtn');
            if (godBtn) godBtn.classList.add('display-none');
            
            if (window.devConsole && window.devConsole.isOpen) {
                window.devConsole.toggle();
            }
            
            this.state = GameState.MENU;
        }

        bindUI() {
            const $ = i => document.getElementById(i);
            
            const safeAssign = (id, callback) => {
                const el = $(id);
                if (el) {
                    el.onclick = (e) => {
                        if (this.healthMonitor) {
                            this.healthMonitor.trackButtonClick(id, true);
                        }
                        try {
                            callback(e);
                        } catch (err) {
                            if (this.healthMonitor) {
                                this.healthMonitor.logEvent('BUTTON_HANDLER_ERROR', { buttonId: id, error: err.message });
                            }
                            console.error(`Error in button ${id}:`, err);
                        }
                    };
                    if (this.healthMonitor) {
                        this.healthMonitor.registerButton(id, callback);
                    }
                } else {
                    console.warn(`Elemento "${id}" no encontrado`);
                    if (this.healthMonitor) {
                        this.healthMonitor.logEvent('BUTTON_NOT_FOUND', { buttonId: id });
                    }
                }
            };
            
            safeAssign('accessBtn', () => { 
                $('start-main').style.opacity = '0';
                $('start-main').style.display = 'block'; 
                $('accessBtn').style.display = 'none';
                setTimeout(() => {
                    $('start-main').style.transition = 'opacity 0.5s ease-out';
                    $('start-main').style.opacity = '1';
                }, 10);
            });
            
            safeAssign('resumeSavedGameBtn', () => { 
                this.initGame(true);
            });
            

            
            safeAssign('expertBtn', () => { 
                const saved = SecureStorage.load('bubbleShooterSave');
                if (saved && saved.grid && !confirm('Tienes una partida guardada. Si empiezas una nueva, perderás tu progreso actual. ¿Deseas empezar de cero?')) return;
                let nameInputVal = $('playerNameInput').value.trim();
                if (!$('playerNameInput').classList.contains('display-none')) {
                    if (nameInputVal.toLowerCase() === 'developer') {
                        const pass = prompt("ACCESO RESTRINGIDO: Introduce contraseña de sistema");
                        if (pass === 'Admin') { this.isGodMode = true; this.playerName = "Developer Mode"; }
                        else { alert("❌ Acceso denegado"); return; }
                    } else {
                        if (!nameInputVal) { alert('❌ Debes introducir tu nombre para jugar'); return; }
                        if (!this.validatePlayerName(nameInputVal)) return;
                        this.playerName = nameInputVal;
                        localStorage.setItem('playerName', this.playerName);
                    }
                }
                
                if (!localStorage.getItem(`tutorialDone_${this.playerName}`)) {
                    alert('Completa el tutorial para desbloquear el modo Experto.');
                    this.mode = 'tutorial'; 
                    Config.MAX_LEVEL = 1;
                } else {
                    this.mode = 'experto'; 
                    Config.MAX_LEVEL = 7;
                }
                this.initGame();  // Direct to game
            });

            safeAssign('muteCapsule', (e) => {
                e.stopPropagation(); 
                const m = this.audio.toggleMute(); 
                $('muteIcon').innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24"><path d="${m ? 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z' : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'}"/></svg>`;
            });
            
            safeAssign('aiCapsule', () => this.toggleAI());
            safeAssign('swapCapsule', () => this.swapBubbles());

            safeAssign('menu-message', (e) => { 
                e.stopPropagation(); 
                if (this.healthMonitor) this.healthMonitor.logEvent('MENU_BUTTON_CLICKED', { currentState: this.state });
                this.togglePause(); 
            });
            
            safeAssign('resumePauseBtn', (e) => { 
                e.stopPropagation(); 
                this.togglePause(); 
            });
            
            safeAssign('restartPauseBtn', (e) => { 
                e.stopPropagation(); 
                this.restartLevel(); 
            });
            
            safeAssign('settingsBtn', (e) => { 
                e.stopPropagation(); 
                this.showSettings(); 
            });
            
            safeAssign('exitPauseBtn', (e) => { 
                e.stopPropagation(); 
                this.exitToMenu(); 
            });

            safeAssign('closeSettingsBtn', (e) => { 
                e.stopPropagation(); 
                this.hideSettings(); 
            });
            
            document.querySelectorAll('.ios-segment.setting-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const setting = btn.dataset.setting;
                    const value = btn.dataset.value;
                    
                    const parent = btn.closest('.ios-segmented-control');
                    parent.querySelectorAll('.ios-segment').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    if (setting === 'bulletSpeed') { 
                        GameSettings.bulletSpeed = parseInt(value); 
                        Config.BULLET_SPEED = parseInt(value); 
                    }
                    else if (setting === 'bubbleSize') { 
                        GameSettings.bubbleSize = parseFloat(value); 
                    }
                    
                    GameSettings.save();
                    if (this.healthMonitor) this.healthMonitor.logEvent('SETTING_CHANGED', { setting, value });
                };
            });
            
            const toggleVisualEffects = $('toggle-visualEffects');
            if (toggleVisualEffects) {
                toggleVisualEffects.onclick = (e) => {
                    e.stopPropagation();
                    const isActive = toggleVisualEffects.classList.contains('active');
                    if (isActive) {
                        toggleVisualEffects.classList.remove('active');
                        GameSettings.visualEffects = false;
                    } else {
                        toggleVisualEffects.classList.add('active');
                        GameSettings.visualEffects = true;
                    }
                    GameSettings.save();
                };
            }
            
            const toggleDarkMode = $('toggle-dark-mode');
            if (toggleDarkMode) {
                toggleDarkMode.onclick = (e) => {
                    e.stopPropagation();
                    const isActive = toggleDarkMode.classList.contains('active');
                    if (isActive) {
                        toggleDarkMode.classList.remove('active');
                        GameSettings.darkMode = false;
                    } else {
                        toggleDarkMode.classList.add('active');
                        GameSettings.darkMode = true;
                    }
                    GameSettings.save();
                    GameSettings.apply();
                };
            }
            
            const toggleTrajectory = $('toggle-trajectory');
            if (toggleTrajectory) {
                toggleTrajectory.onclick = (e) => {
                    e.stopPropagation();
                    const isActive = toggleTrajectory.classList.contains('active');
                    if (isActive) {
                        toggleTrajectory.classList.remove('active');
                        GameSettings.showTrajectory = false;
                    } else {
                        toggleTrajectory.classList.add('active');
                        GameSettings.showTrajectory = true;
                    }
                    GameSettings.save();
                };
            }
            
            const bindHapticToggle = (id) => {
                const el = $(id);
                if (el) {
                    el.onclick = (e) => {
                        e.stopPropagation();
                        const isActive = el.classList.contains('active');
                        if (isActive) {
                            el.classList.remove('active');
                            GameSettings.haptics = false;
                        } else {
                            el.classList.add('active');
                            GameSettings.haptics = true;
                        }
                        GameSettings.save();
                        GameSettings.apply(); // This syncs all haptic toggles
                    };
                }
            };
            bindHapticToggle('toggle-haptics');
            bindHapticToggle('toggle-haptics-settings');

            const bindSettingToggle = (id, settingName) => {
                const el = $(id);
                if (el) {
                    el.onclick = (e) => {
                        e.stopPropagation();
                        const isActive = el.classList.contains('active');
                        if (isActive) {
                            el.classList.remove('active');
                            GameSettings[settingName] = false;
                        } else {
                            el.classList.add('active');
                            GameSettings[settingName] = true;
                        }
                        GameSettings.save();
                        GameSettings.apply();
                    };
                }
            };
            bindSettingToggle('toggle-colorblind', 'colorblind');
            bindSettingToggle('toggle-screenshake', 'screenshake');
            safeAssign('continueBtn', () => {
                if (this.attemptsLeft > 0) {
                    if (this.healthMonitor) this.healthMonitor.logEvent('RETRY_LEVEL', { level: this.level, attemptsLeft: this.attemptsLeft });
                    this.transitionScreen('screen-summary', null);
                    setTimeout(() => {
                        $('screen-summary').classList.add('display-none');
                        $('overlay').classList.add('hidden');
                        this.renderer.canvas.style.display = 'block';
                        this.startLevel(true);
                    }, 300);
                }
            });

            safeAssign('nextBtnStep1', () => { 
                if (this.healthMonitor) this.healthMonitor.logEvent('NEXT_STEP_CLICKED', { level: this.level });
                
                if (this.state === GameState.GAMEOVER && this.attemptsLeft <= 0) {
                    this.exitToMenu();
                } else {
                    this.transitionScreen('screen-summary', 'screen-summary-step2');
                    const phrase = Config.MOTIVATIONAL_PHRASES[Math.floor(Math.random() * Config.MOTIVATIONAL_PHRASES.length)];
                    $('motivational-phrase').innerText = phrase;
                }
            });

            safeAssign('nextLevelBtn', () => { 
                if (this.healthMonitor) this.healthMonitor.logEvent('NEXT_LEVEL_CLICKED', { currentLevel: this.level, maxLevel: Config.MAX_LEVEL });
                
                if(this.level >= Config.MAX_LEVEL) { 
                    this.saveToLeaderboard();
                    this.level = 1; 
                    this.maxLevelReached = 0;
                    SecureStorage.remove('bubbleShooterSave'); 
                    this.state = GameState.MENU;
                    this.cleanupGameState();
                    this.resetUIState();
                    this.transitionScreen(null, 'screen-start');
                } else { 
                    this.level++; 
                    if (this.healthMonitor) this.healthMonitor.logEvent('ADVANCING_TO_LEVEL', { newLevel: this.level });
                    $('screen-summary-step2').style.opacity = '0';
                    setTimeout(() => {
                        $('screen-summary-step2').classList.add('display-none');
                        $('overlay').classList.add('hidden');
                        this.renderer.canvas.style.display = 'block';
                        this.renderer.canvas.style.opacity = '1';
                        this.startLevel(false); 
                    }, 300);
                } 
            });

            safeAssign('saveAndContinueBtn', () => { 
                if (this.healthMonitor) this.healthMonitor.logEvent('SAVE_AND_EXIT_CLICKED', { level: this.level });
                this.saveProgress();
                
                this.unbindGameplayListeners();
                this.renderer.clearAll();
                this.timerRunning = false;
                this.bullet = null;
                this.currentBubble = null;
                this.state = GameState.MENU;
                
                this.renderer.canvas.style.display = 'none';
                this.renderer.canvas.style.opacity = '0';
                
                const hud = document.querySelector('.hud-layer');
                if (hud) hud.style.opacity = '0';
                
                $('screen-summary-step2').classList.add('display-none');
                $('screen-summary-step2').style.opacity = '0';
                
                $('screen-closure').classList.remove('display-none');
                $('screen-closure').style.opacity = '1';
                
                $('overlay').classList.remove('hidden');
                $('overlay').style.display = 'flex';
                $('overlay').style.opacity = '1';
            });

            safeAssign('returnToMenuBtn', (e) => {
                e.stopPropagation();
                if (this.healthMonitor) this.healthMonitor.logEvent('RETURN_TO_MENU_FROM_CLOSURE', {});
                
                $('screen-closure').classList.add('display-none');
                $('screen-closure').style.opacity = '0';
                
                this.loadProgress();
                
                $('screen-start').classList.remove('display-none');
                $('screen-start').style.opacity = '1';
            });
            
            safeAssign('resetGameBtn', (e) => {
                e.stopPropagation();
                if(confirm("⚠️ ¿Estás seguro?\n\nEsto borrará TODO tu progreso, configuración y estadísticas.\n\nEsta acción NO se puede deshacer.")) {
                    this.fullGameReset();
                }
            });

            safeAssign('closeTutorialBtn', (e) => { 
                e.stopPropagation(); 
                this.hideTutorial(); 
            });

            safeAssign('toggleLbBtn', () => this.toggleLeaderboard());
            safeAssign('refreshLbBtn', () => this.resetLeaderboard());
            
            safeAssign('resetUserBtn', (e) => { 
                e.stopPropagation();
                if(confirm("¿Cambiar de jugador? Se borrará el progreso actual.")) { 
                    SecureStorage.remove('bubbleShooterSave'); 
                    localStorage.removeItem('playerName');
                    $('playerNameInput').classList.remove('display-none');
                    $('playerNameInput').value = '';
                    $('welcome-message').classList.add('display-none');
                    $('resetUserBtn').classList.add('display-none');
                    if ($('resumeSavedGameBtn')) $('resumeSavedGameBtn').classList.add('display-none');
                    const badge = $('load-badge');
                    badge.innerText = 'NO HAY PARTIDA GUARDADA';
                    badge.classList.add('empty');
                    this.playerName = null;
                } 
            });
            
            safeAssign('godNextBtn', (e) => { 
                e.stopPropagation();
                if (!this.isGodMode) return;
                this.endGame(true); // Reusa endGame para replicar victoria normal
            });
            
            safeAssign('devConsoleBtn', (e) => {
                e.stopPropagation();
                if (window.devConsole) {
                    window.devConsole.toggle();
                }
            });
            
            safeAssign('autoBotBtn', () => {
                document.getElementById('pause-overlay').classList.remove('visible');
                document.getElementById('bot-overlay').classList.add('visible');
            });
            
            safeAssign('closeBotBtn', () => {
                const isActive = document.getElementById('botMasterToggle').classList.contains('active');
                if (!isActive) {
                    this.botMode = 'OFF';
                } else {
                    const isShared = document.getElementById('botModeShared').classList.contains('active');
                    this.botMode = isShared ? 'SHARED' : 'FULL';
                }
                
                const activeSpeedBtn = document.querySelector('#botSpeedSeg .ios-segment.active');
                if (activeSpeedBtn) {
                    this.botSpeed = parseInt(activeSpeedBtn.getAttribute('data-val'), 10);
                    this.botPerfect = activeSpeedBtn.getAttribute('data-perfect') === 'true';
                } else {
                    this.botSpeed = 800;
                    this.botPerfect = false;
                }
                
                if (this.botMode === 'SHARED') {
                    this.botTurn = false;
                }
                
                document.getElementById('bot-overlay').classList.remove('visible');
                // Return to pause menu
                document.getElementById('pause-overlay').classList.add('visible');
            });
            
            safeAssign('botMasterToggle', () => {
                const toggle = document.getElementById('botMasterToggle');
                const area = document.getElementById('botSettingsArea');
                toggle.classList.toggle('active');
                if (toggle.classList.contains('active')) {
                    area.style.opacity = '1';
                    area.style.pointerEvents = 'auto';
                } else {
                    area.style.opacity = '0.5';
                    area.style.pointerEvents = 'none';
                }
            });
            
            safeAssign('botModeShared', () => {
                document.getElementById('botModeShared').classList.add('active');
                document.getElementById('botModeFull').classList.remove('active');
            });
            
            safeAssign('botModeFull', () => {
                document.getElementById('botModeFull').classList.add('active');
                document.getElementById('botModeShared').classList.remove('active');
            });
            
            const segBtns = document.querySelectorAll('#botSpeedSeg .ios-segment');
            segBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    segBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });

            document.addEventListener('click', () => this.audio.init(), { once: true });
            
            let tapCount = 0;
            const brandSub = document.querySelector('.brand-sub');
            if (brandSub) {
                brandSub.addEventListener('touchend', (e) => {
                    e.preventDefault(); 
                    tapCount++;
                    if (tapCount === 4) {
                        const pass = prompt("ACCESO RESTRINGIDO: Introduce contraseña de sistema");
                        if (pass === 'Admin') { 
                            this.isGodMode = true; 
                            $('playerNameInput').value = "Developer Mode"; 
                            alert('✅ Modo Developer Activado'); 
                        } else { 
                            alert("❌ Acceso denegado"); 
                        }
                        tapCount = 0;
                    }
                    setTimeout(() => { tapCount = 0; }, 2000);
                });
            }
            
            if (this.healthMonitor) this.healthMonitor.logEvent('UI_BOUND', { buttonCount: this.healthMonitor.buttonDiagnostics.registered.length });
        }

        transitionScreen(hideId, showId) {
            if (this.healthMonitor) this.healthMonitor.logEvent('SCREEN_TRANSITION', { from: hideId, to: showId });
            
            const hideEl = hideId ? document.getElementById(hideId) : null;
            const showEl = showId ? document.getElementById(showId) : null;
            
            if (hideEl) {
                hideEl.style.transition = 'opacity 0.3s ease-out';
                hideEl.style.opacity = '0';
                setTimeout(() => { hideEl.classList.add('display-none'); }, 300);
            }
            
            if (showEl) {
                showEl.classList.remove('display-none');
                showEl.style.opacity = '0';
                showEl.offsetHeight;
                setTimeout(() => {
                    const card = showEl.querySelector('.ios-card');
                    if (card) card.classList.add('animate-in');
                    showEl.style.transition = 'opacity 0.3s ease-out';
                    showEl.style.opacity = '1';
                }, 50);
            }
        }

        handleResize() { 
            if(this.state === GameState.FIRING) return; 
            const d = this.renderer.resize(); 
            this.physics.updateDimensions(d.w, d.h); 
            if(this.state !== GameState.MENU && this.currentBubble) {
                this.renderer.draw(this.model, this.currentBubble, this.bullet, this.nextBubbleColor, this.secondNextBubbleColor, this.guideLineAlpha); 
            }
            if (this.currentBubble) this.loadBubble();
            this.updateHUDPositions();
        }

        updateHUDPositions() {
            const hud = document.querySelector('.hud-layer');
            const hudHeight = hud ? hud.offsetHeight : 80;
            const levelMsg = document.getElementById('level-message');
            const menuMsg = document.getElementById('menu-message');
            const timer = document.getElementById('timer');
            const godBtn = document.getElementById('godNextBtn');
            const containerRect = document.getElementById('game-container').getBoundingClientRect();
            
            levelMsg.style.bottom = `${hudHeight + 10}px`;
            menuMsg.style.bottom = `${hudHeight + 10}px`;
            timer.style.bottom = `${hudHeight + 10}px`;
            godBtn.style.bottom = `${hudHeight + 20}px`;
            
            const capsules = document.querySelectorAll('.hud-layer .capsule');
            if (capsules.length >= 4) {
                const firstRect = capsules[0].getBoundingClientRect();
                const lastRect = capsules[3].getBoundingClientRect();
                
                const centerXLevel = firstRect.left + firstRect.width / 2 - containerRect.left;
                let leftPos = centerXLevel - (levelMsg.offsetWidth / 2);
                levelMsg.style.left = `${Math.max(10, leftPos)}px`;
                levelMsg.style.right = 'auto';
                
                const centerXMenu = lastRect.left + lastRect.width / 2 - containerRect.left;
                let menuLeftPos = centerXMenu - (menuMsg.offsetWidth / 2);
                if (menuLeftPos + menuMsg.offsetWidth > containerRect.width - 10) {
                    menuLeftPos = containerRect.width - menuMsg.offsetWidth - 10;
                }
                menuMsg.style.left = `${menuLeftPos}px`;
                menuMsg.style.right = 'auto';
                
                const aiPanel = document.getElementById('ai-panel');
                if (aiPanel) {
                    // Position the tail to point roughly to the center of the Menu text
                    aiPanel.style.bottom = `${hudHeight + 35}px`; 
                    aiPanel.style.right = 'auto';
                    let aiLeft = centerXMenu - aiPanel.offsetWidth + 20; // Tail is on bottom-right, so position panel to the left of the center
                    if (aiLeft < 10) aiLeft = 10;
                    aiPanel.style.left = `${aiLeft}px`;
                }
            }
        }

        animateHUD() {
            const hud = document.querySelector('.hud-layer');
            const capsules = document.querySelectorAll('.hud-layer .capsule');
            const levelMsg = document.getElementById('level-message');
            const menuMsg = document.getElementById('menu-message');
            const timer = document.getElementById('timer');
            const godBtn = document.getElementById('godNextBtn');
            
            hud.style.opacity = '1';
            capsules.forEach((capsule, idx) => {
                capsule.style.transform = 'translateY(30px)';
                capsule.style.opacity = '0';
                setTimeout(() => {
                    capsule.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    capsule.style.opacity = '1';
                    capsule.style.transform = 'translateY(0)';
                }, idx * 180);
            });
            
            const baseDelay = capsules.length * 180;
            setTimeout(() => { levelMsg.style.transition = 'opacity 0.4s ease-out'; levelMsg.style.opacity = '1'; }, baseDelay + 100);
            setTimeout(() => { menuMsg.style.transition = 'opacity 0.4s ease-out'; menuMsg.style.opacity = '1'; }, baseDelay + 250);
            setTimeout(() => { if (timer.style.display !== 'none') { timer.style.transition = 'opacity 0.4s ease-out'; timer.style.opacity = '1'; } }, baseDelay + 400);
            if (this.isGodMode) {
                setTimeout(() => { godBtn.style.transition = 'opacity 0.3s ease-out'; godBtn.style.opacity = '1'; }, baseDelay + 550);
            }
        }

        toggleLeaderboard() { 
            const v = document.getElementById('leaderboard-view');
            const i = document.getElementById('start-main');
            const b = document.getElementById('toggleLbBtn'); 
            if(v.classList.contains('display-none')) { 
                v.classList.remove('display-none'); 
                setTimeout(() => v.classList.add('animate-in'), 50);
                i.style.display = 'none'; 
                b.innerText = "Volver"; 
                this.loadLeaderboard(); 
            } else { 
                v.classList.add('display-none'); 
                i.style.display = 'block'; 
                b.innerText = "Ver Ranking Global"; 
            } 
        }

        loadLeaderboard() { 
            const l = document.getElementById('lb-list-content'); 
            const posEl = document.getElementById('yourPosition');
            const bd = JSON.parse(localStorage.getItem('bubbleShooterLeaderboard')) || []; 
            bd.sort((x, y) => y.score - x.score);
            let h = bd.length ? '' : '<div style="text-align:center;color:var(--text-sub); padding:20px;">Sé el primero.</div>'; 
            let userPos = -1;
            bd.forEach((e, x) => { 
                let trophy = x === 0 ? '🏆' : x === 1 ? '🥈' : x === 2 ? '🥉' : ''; 
                let highlight = e.name === this.playerName ? 'highlight' : ''; 
                let topClass = x < 3 ? `top${x+1}` : ''; 
                h += `<div class="lb-item ${topClass} ${highlight}"><span class="lb-rank">${trophy || (x+1)}</span><span class="lb-name">${e.name}</span><span class="lb-score">Nivel ${e.score}</span></div>`; 
                if (e.name === this.playerName) userPos = x + 1;
            }); 
            l.innerHTML = h; 
            l.scrollTop = 0;
            if (userPos > 5) posEl.innerText = `Tu posición: ${userPos}`;
            else posEl.innerText = '';
        }

        resetLeaderboard() {
            if(confirm("¿Resetear el ranking completo? Esta acción no se puede deshacer.")) {
                localStorage.removeItem('bubbleShooterLeaderboard');
                this.loadLeaderboard();
            }
        }

        saveToLeaderboard() {
            let b = JSON.parse(localStorage.getItem('bubbleShooterLeaderboard')) || [];
            b.push({name: this.playerName || "Jugador", score: this.maxLevelReached});
            b.sort((x, y) => y.score - x.score);
            localStorage.setItem('bubbleShooterLeaderboard', JSON.stringify(b.slice(0, 10)));
        }

        saveProgress() {
            if(this.state === GameState.GAMEOVER || this.isGodMode || this.mode === 'tutorial') return;
            const state = {
                level: this.level, 
                maxLevelReached: this.maxLevelReached,
                grid: this.model.grid, 
                aiUses: this.aiUsesLeft, 
                shots: this.ammoCount, 
                swapUses: this.swapUses, 
                mode: this.mode, 
                playerName: this.playerName,
                totalGames: this.totalGames,
                retriesOnCurrentLevel: this.retriesOnCurrentLevel
            };
            SecureStorage.save('bubbleShooterSave', state);
            if (this.healthMonitor) this.healthMonitor.logEvent('PROGRESS_SAVED', { level: this.level });
        }

        initGame(loadFromSave = false) { 
            const save = SecureStorage.load('bubbleShooterSave');
            if (save && save.playerName) this.playerName = save.playerName;
            else if (!this.playerName) { alert('❌ Error: Nombre de jugador no válido'); return; }
            
            if (this.healthMonitor) this.healthMonitor.logEvent('GAME_INIT', { playerName: this.playerName, mode: this.mode, isGodMode: this.isGodMode });
            
            this.handleResize(); 
            this.events.emit(Events.AUDIO_MELODY, {type: 'start'}); 
            
            if (loadFromSave && save && save.grid) {
                this.mode = save.mode || 'experto';
                this.maxLevelReached = save.maxLevelReached || 1;
                this.level = save.level || 1;
                this.totalGames = save.totalGames || 0;
                this.retriesOnCurrentLevel = save.retriesOnCurrentLevel || 0;
                this.startLevel(false, save);
            } else {
                this.maxLevelReached = 0;
                this.level = 1; 
                this.startLevel(); 
            }
            
            let tutorialDone = false;
            try { tutorialDone = localStorage.getItem(`tutorialDone_${this.playerName}`); } catch(e) {}
            
            if (!tutorialDone) {
                this.mode = 'tutorial';
                Config.MAX_LEVEL = 1;
                this.showTutorialSequence();
            }
            
            if (this.isGodMode) {
                window.devConsole = new DeveloperConsole(this.healthMonitor);
                window.devConsole.createPanel();
                window.gameHealthExport = () => { this.healthMonitor.downloadReport(); };
                const devBtn = document.getElementById('devConsoleBtn');
                devBtn.classList.remove('display-none');
                devBtn.classList.add('visible');
                console.log('%c🔧 DEV MODE ACTIVATED', 'color: #9C27B0; font-size: 20px; font-weight: bold;');
                console.log('%cEl juego se comporta EXACTAMENTE igual que para usuarios normales', 'color: #30D158;');
                console.log('%cUsa window.devConsole.toggle() o Ctrl+D para abrir la consola', 'color: #9C27B0;');
                
                document.addEventListener('keydown', (e) => { 
                    if (e.ctrlKey && e.key === 'd') { 
                        e.preventDefault(); 
                        window.devConsole.toggle(); 
                    } 
                });
            }
        }
        // ============================================================
        // startLevel - Inicialización de nivel con cola de burbujas segura
        // ============================================================
        startLevel(isRetry = false, savedState = null) {
            if (this.healthMonitor) this.healthMonitor.logEvent('LEVEL_STARTING', { level: this.level, isRetry: isRetry, mode: this.mode, isGodMode: this.isGodMode });
            
            this.renderer.clearAll();
            this.renderer.canvas.style.display = 'block';
            this.renderer.canvas.style.opacity = '1';
            
            const oldState = this.state;
            this.state = GameState.READY;
            if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'startLevel');
            
            this.rebindGameplayListeners();
            
            requestAnimationFrame(() => {
                this.sessionStats = { 
                    consecutive: 0, 
                    droppedMax: 0, 
                    wonLow: false,
                    totalShots: 0, 
                    successfulShots: 0, 
                    maxCombo: 0,
                    totalDropped: 0, 
                    aiUsed: 0, 
                    swapsUsed: 0
                };
                
                const godBtn = document.getElementById('godNextBtn');
                if (this.isGodMode) godBtn.classList.remove('display-none');
                else godBtn.classList.add('display-none');
                
                if (savedState) {
                    this.aiUsesLeft = savedState.aiUses ?? 3;
                    this.swapUses = savedState.swapUses ?? 3;
                    this.ammoCount = savedState.shots ?? 30;
                    this.model.grid = savedState.grid;
                    this.model.setInitialBubbleCount();
                    this.comboMultiplier = 1;
                } else {
                    const l = this.level;
                    let p = { rows: 5, colors: 3, shots: 40, level: l }; 
                    
                    if (this.mode === 'tutorial') {
                        p = { rows: 4, colors: 3, shots: 30, level: l };
                        this.aiUsesLeft = 3;
                        this.swapUses = 3;
                        this.attemptsLeft = 0;
                    } else if (this.mode === 'experto') {
                        this.attemptsLeft = 1;
                        p.rows = Math.min(12, 6 + l); // 7 to 12
                        p.colors = l <= 2 ? 4 : (l <= 5 ? 5 : 6);
                        p.shots = 50 + (l * 5);
                        p.stoneChance = l <= 3 ? 0 : (l - 3) * 0.05; // Level 4 -> 5%, Level 9 -> 30%
                        this.aiUsesLeft = 3;
                        this.swapUses = 3;
                    }
                    
                    p.colors = Math.min(p.colors, Config.COLORS.length);
                    
                    this.model.initLevel(p);
                    this.model.setInitialBubbleCount();
                    this.ammoCount = p.shots;
                    this.comboMultiplier = 1;
                    
                    if (this.healthMonitor) this.healthMonitor.logEvent('LEVEL_CONFIG', { 
                        level: l, 
                        rows: p.rows, 
                        colors: p.colors, 
                        shots: p.shots,
                        aiUses: this.aiUsesLeft,
                        swapUses: this.swapUses,
                        isGodMode: this.isGodMode
                    });
                }
                
                document.getElementById('aiCount').innerText = `${this.aiUsesLeft}`;
                document.getElementById('swapCount').innerText = `${this.swapUses}`;
                document.getElementById('swapCapsule').style.opacity = (this.swapUses === 0) ? 0.5 : 1;
                
                this.levelStartTime = Date.now(); 
                this.levelElapsedTime = 0; 
                this.timerRunning = true;
                document.getElementById('timer').style.display = 'block';
                this.updateTimer();
                
                // ============================================================
                // INICIALIZACIÓN DE COLA DE BURBUJAS CON VALIDACIÓN
                // Garantiza que NO haya 3 colores consecutivos iguales
                // ============================================================
                this.initializeBubbleQueue();
                
                this.loadBubble();
                
                if (!this.currentBubble) {
                    console.error('CRITICAL: No se pudo cargar burbuja inicial');
                    if (this.healthMonitor) this.healthMonitor.logEvent('CRITICAL_NO_BUBBLE', { level: this.level });
                    this.loadBubble();
                }
                
                let botDesc = "";
                if (this.botMode === 'FULL') {
                    botDesc = "Modo Máquina";
                } else if (this.botMode === 'SHARED') {
                    botDesc = this.botPerfect ? "Humano Perfecto" : "Humano Casual";
                } else {
                    botDesc = "Humano Manual";
                }
                const godIndicator = this.isGodMode ? ' [DEV]' : '';
                document.getElementById('levelEl').innerText = `Nivel ${this.level} • ${botDesc}${godIndicator}`;
                this.updateUI();
                
                const overlay = document.getElementById('overlay');
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                
                document.getElementById('ai-panel').classList.remove('visible'); 
                document.getElementById('manualFireBtn').classList.add('hidden');
                this.renderer.canvas.style.display = 'block';
                this.saveProgress(); 
                this.updateHUDPositions();
                this.animateHUD();
                
                if (this.mode === 'tutorial') {
                    this.showTutorialSequence();
                }
                
                if (this.healthMonitor) {
                    this.healthMonitor.captureStateSnapshot('LEVEL_STARTED');
                }

                if (!isRetry) {
                  this.totalGames++;
                }

                ExplicaliaSystem.resetForNewGame();
                ExplicaliaSystem.onEnterMainMenu(
                  {playerIsNew: this.playerIsNew, retriesOnCurrentLevel: this.retriesOnCurrentLevel},
                  {totalGames: this.totalGames}
                );
            });
        }

        // ============================================================
        // INICIALIZACIÓN DE COLA DE BURBUJAS - SIN 3 CONSECUTIVOS
        // ============================================================
        initializeBubbleQueue() {
            const chk = (mr) => (mr * this.physics.rowHeight) > this.physics.height * 0.6;
            
            // Genera solo la cola visible, sin reserve independiente
            this.nextBubbleColor = this.model.pickValidColor(chk, []);
            this.secondNextBubbleColor = this.model.pickValidColor(chk, [this.nextBubbleColor.id]);
            this.thirdNextBubbleColor = this.model.pickValidColor(chk, [this.nextBubbleColor.id, this.secondNextBubbleColor.id]);
            
            // Opcional: Si necesitas un reserve inicial, pero no lo uses para swap
            this.swapReserveColor = null;  // No necesario ahora
            
            if (this.healthMonitor) {
                this.healthMonitor.logEvent('BUBBLE_QUEUE_INITIALIZED', {
                    next: this.nextBubbleColor.name,
                    second: this.secondNextBubbleColor.name,
                    third: this.thirdNextBubbleColor.name
                });
            }
        }

        // ============================================================
        // loadBubble - Carga nueva burbuja manteniendo cola sin 3 consecutivos
        // ============================================================
        loadBubble() {
            const chk = (mr) => (mr * this.physics.rowHeight) > this.physics.height * 0.6;
            
            // Asegurar cola visible
            if (!this.nextBubbleColor) this.nextBubbleColor = this.model.pickValidColor(chk, []);
            if (!this.secondNextBubbleColor) this.secondNextBubbleColor = this.model.pickValidColor(chk, [this.nextBubbleColor.id]);
            if (!this.thirdNextBubbleColor) {
                const recentIds = [this.nextBubbleColor.id, this.secondNextBubbleColor.id];
                this.thirdNextBubbleColor = this.model.pickValidColor(chk, recentIds);
            }
            
            const hudEl = document.querySelector('.hud-layer');
            const hudHeight = hudEl ? hudEl.offsetHeight + 20 : 80;
            
            this.currentBubble = {
                x: this.physics.width / 2, 
                y: this.physics.height - this.physics.radius * 5 - hudHeight, 
                angle: -Math.PI / 2, 
                color: this.nextBubbleColor
            };
            
            this.nextBubbleColor = this.secondNextBubbleColor;
            this.secondNextBubbleColor = this.thirdNextBubbleColor;
            
            const recentIds = [
                this.currentBubble.color.id,
                this.nextBubbleColor.id,
                this.secondNextBubbleColor.id
            ];
            this.thirdNextBubbleColor = this.model.pickValidColor(chk, recentIds);
            
            this.fixQueueIfNeeded();
            
            this.bullet = null; 
            this.guideLineAlpha = 0;
            
            if (this.healthMonitor) {
                this.healthMonitor.logEvent('BUBBLE_LOADED', {
                    current: this.currentBubble.color.name,
                    next: this.nextBubbleColor.name,
                    second: this.secondNextBubbleColor.name,
                    third: this.thirdNextBubbleColor.name
                });
            }
        }

        // ============================================================
        // Swap corregido: Intercambia con nextBubbleColor (posición siguiente/anterior en cola)
        // ============================================================
        swapBubbles() {
            if (this.swapUses <= 0 || this.state !== GameState.READY || !this.currentBubble || !this.nextBubbleColor) {
                if (this.healthMonitor) {
                    this.healthMonitor.logEvent('SWAP_REJECTED', { 
                        reason: this.swapUses <= 0 ? 'NO_USES' : this.state !== GameState.READY ? 'WRONG_STATE' : 'NO_BUBBLE',
                        swapUses: this.swapUses,
                        state: this.state
                    });
                }
                return;
            }
            
            const oldCurrentColor = this.currentBubble.color;
            const oldNextColor = this.nextBubbleColor;
            
            // Intercambio simple con next (posición contigua)
            this.currentBubble.color = this.nextBubbleColor;
            this.nextBubbleColor = oldCurrentColor;
            
            this.swapUses--;
            this.sessionStats.swapsUsed++;
            
            document.getElementById('swapCount').innerText = `${this.swapUses}`;
            if (this.swapUses === 0) {
                document.getElementById('swapCapsule').style.opacity = 0.5;
            }
            
            if (this.healthMonitor) {
                this.healthMonitor.trackInteraction('SWAP', {
                    oldCurrent: oldCurrentColor.name,
                    newCurrent: this.currentBubble.color.name,
                    oldNext: oldNextColor.name,
                    newNext: this.nextBubbleColor.name,
                    remainingSwaps: this.swapUses
                });
            }
            
            this.saveProgress();
        }

        fire() { 
            if(this.state === GameState.READY && !this.bullet && this.currentBubble) { 
                const oldState = this.state;
                this.state = GameState.FIRING; 
                if (this.healthMonitor) {
                    this.healthMonitor.trackStateTransition(oldState, this.state, 'fire');
                    this.healthMonitor.trackInteraction('SHOT', { angle: this.currentBubble.angle, color: this.currentBubble.color.name });
                }
                this.bullet = {...this.currentBubble, bounces: 0}; 
                this.events.emit(Events.AUDIO_PLAY, {type: 'shoot'}); 
                document.getElementById('manualFireBtn').classList.add('hidden'); 
                this.guideLineAlpha = 0; 
                document.getElementById('ai-panel').classList.remove('visible');
                this.sessionStats.totalShots++;
                if (this.botMode === 'SHARED') {
                    this.botTurn = !this.botTurn;
                }
            }
        }

        updateUI() { 
            const el = document.getElementById('shotsEl'); 
            if (el) {
                el.innerText = this.ammoCount; 
                el.style.color = this.ammoCount <= 5 ? '#ff4444' : '#fff'; 
            }
        }

        updateTimer() {
            const ms = this.levelElapsedTime;
            const mins = Math.floor(ms / 60000).toString().padStart(2, '0');
            const secs = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
            const millis = (ms % 1000).toString().padStart(3, '0');
            document.getElementById('timer').innerText = `${mins}:${secs}:${millis}`;
        }

        showTutorialSequence() { 
            let stepIndex = 0;
            const showNext = () => {
                if (stepIndex >= this.tutorialSteps.length) return;
                const step = this.tutorialSteps[stepIndex];
                document.getElementById('tutorial-text').innerText = step.text;
                document.getElementById('tutorial-overlay').classList.add('visible');
                
                let el = null;
                if (step.highlight) {
                    try { el = document.querySelector(step.highlight); } catch(e) {}
                }
                
                if (el) el.style.boxShadow = '0 0 20px #30D158';
                
                const btn = document.getElementById('closeTutorialBtn');
                btn.innerText = stepIndex < this.tutorialSteps.length - 1 ? 'Siguiente' : 'Entendido';
                
                // Clear any previous onclick to prevent double-firing
                btn.onclick = null;
                btn.onclick = () => {
                    if (el) el.style.boxShadow = 'none';
                    this.hideTutorial();
                    stepIndex++;
                    if (stepIndex < this.tutorialSteps.length) {
                        setTimeout(showNext, 300);
                    } else {
                        try { localStorage.setItem(`tutorialDone_${this.playerName}`, 'true'); } catch(e) {}
                    }
                };
            };
            showNext();
        }
        
        showTutorial(feature, text) { 
            document.getElementById('tutorial-text').innerText = text; 
            document.getElementById('tutorial-overlay').classList.add('visible'); 
            try { localStorage.setItem(`first_${feature}`, 'true'); } catch(e) {}
        }
        
        hideTutorial() { 
            document.getElementById('tutorial-overlay').classList.remove('visible'); 
        }

        togglePause() {
            const pauseOverlay = document.getElementById('pause-overlay');
            
            if (pauseOverlay.classList.contains('visible')) { 
                pauseOverlay.classList.remove('visible'); 
                const oldState = this.state;
                this.state = GameState.READY; 
                if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'resume');
                this.timerRunning = true; 
            } else { 
                pauseOverlay.classList.add('visible'); 
                const oldState = this.state;
                this.state = GameState.PAUSED; 
                if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'pause');
                this.timerRunning = false; 
                document.getElementById('streakInfo').innerText = `Burbujas explotadas: ${this.sessionStats.successfulShots * 3 + this.sessionStats.totalDropped}`;
                const bubbleCount = this.model.countBubbles();
                document.getElementById('bubbleInfo').innerText = `Munición Restante: ${this.ammoCount} | Burbujas en tablero: ${bubbleCount.remaining}`;
            }
        }

        showSettings() {
            document.getElementById('pause-overlay').classList.remove('visible');
            document.getElementById('settings-overlay').classList.add('visible');
            
            document.querySelectorAll('.ios-segment.setting-btn').forEach(btn => {
                const setting = btn.dataset.setting;
                const value = btn.dataset.value;
                btn.classList.remove('active');
                if (setting === 'bulletSpeed' && parseInt(value) === GameSettings.bulletSpeed) btn.classList.add('active');
                else if (setting === 'bubbleSize' && parseFloat(value) === GameSettings.bubbleSize) btn.classList.add('active');
            });
            
            const toggleVisualEffects = document.getElementById('toggle-visualEffects');
            if (toggleVisualEffects) {
                if (GameSettings.visualEffects) {
                    toggleVisualEffects.classList.add('active');
                } else {
                    toggleVisualEffects.classList.remove('active');
                }
            }
        }

        hideSettings() {
            document.getElementById('settings-overlay').classList.remove('visible');
            document.getElementById('pause-overlay').classList.add('visible');
        }

        restartLevel() { 
            if (this.healthMonitor) this.healthMonitor.logEvent('RESTART_LEVEL', { level: this.level });
            this.togglePause(); 
            this.retriesOnCurrentLevel++;
            this.startLevel(true); 
        }
        
        exitToMenu() { 
            if (this.healthMonitor) this.healthMonitor.logEvent('EXIT_TO_MENU', { level: this.level });
            
            document.getElementById('pause-overlay').classList.remove('visible');
            
            this.cleanupGameState();
            
            const oldState = this.state;
            this.state = GameState.MENU; 
            if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'exitToMenu');
            
            if (this.isGodMode) {
                const devBtn = document.getElementById('devConsoleBtn');
                if (devBtn) devBtn.classList.remove('visible');
                if (window.devConsole && window.devConsole.isOpen) window.devConsole.toggle();
            }
            
            this.resetUIState();
            document.getElementById('screen-start').classList.remove('display-none');
            document.getElementById('screen-start').style.opacity = '1';
        }

        resolveTurn(r, c, col) {
            if (this.isDescending) return;
            
            if (this.healthMonitor) this.healthMonitor.logEvent('RESOLVE_TURN_START', { r, c, color: col.name });
            
            if (!this.model.validateMove(r, c, col)) {
                console.warn("Movimiento inválido detectado");
                if (this.healthMonitor) this.healthMonitor.logEvent('INVALID_MOVE', { r, c });
                const nearest = this.model.findNearestValid(r, c, col);
                if (nearest) { r = nearest.r; c = nearest.c; } 
                else return;
            }
            
            const oldState = this.state;
            this.state = GameState.ANIMATING; 
            if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'resolveTurn');
            
            this.model.setCell(r, c, {color: col});
            
            let m = this.model.findMatches(r, c, col.id);
            let hadMatch = false;

            const result = {
              isBounceShot: this.bullet.bounces > 0,
              createdCluster: false,
              improvedBoard: false
            };

            const boardState = {
              nearDeathState: this.ammoCount <= 5
            };
            
            if(m.length >= 3) {
                hadMatch = true;
                result.createdCluster = true;
                result.improvedBoard = true;
                this.sessionStats.consecutive++; 
                this.sessionStats.successfulShots++;
                this.events.emit(Events.TEXT_FLOAT, {r: m[0].r, c: m[0].c, text: `+${m.length}`});
                this.events.emit(Events.AUDIO_PLAY, {type: 'combo', param: this.comboMultiplier});
                
                m.forEach(x => {
                    this.events.emit(Events.PARTICLES, {r: x.r, c: x.c, color: this.model.getCell(x.r, x.c).color.main}); 
                    this.model.setCell(x.r, x.c, null);
                });
                
                this.comboMultiplier++;
                if (this.comboMultiplier > this.sessionStats.maxCombo) {
                    this.sessionStats.maxCombo = this.comboMultiplier;
                }

                this.analytics.shotsSinceLastCascade = 0;
                this.analytics.boardNotImproving = false;
                this.analytics.maxCascadeSize = Math.max(this.analytics.maxCascadeSize, m.length);
                
                if (this.healthMonitor) this.healthMonitor.logEvent('MATCH_FOUND', { count: m.length, combo: this.comboMultiplier });
            } else {
                this.sessionStats.consecutive = 0; 
                this.comboMultiplier = 1; 
                result.createdCluster = false;
                result.improvedBoard = false;
                this.analytics.shotsSinceLastCascade++;
                if (this.analytics.shotsSinceLastCascade >=3) this.analytics.boardNotImproving = true;
            }
            
            this.ammoCount--;
            if(this.ammoCount < 0) this.ammoCount = 0;
            
            let f = this.model.getFloatingBubbles();
            if(f.length) { 
                this.events.emit(Events.AUDIO_PLAY, {type: 'drop'}); 
                this.events.emit(Events.SHAKE, Math.min(f.length * 2, 25)); 
                f.forEach(x => { 
                    let cl = this.model.getCell(x.r, x.c); 
                    if(cl) { 
                        this.events.emit(Events.DROP, {r: x.r, c: x.c, color: cl.color}); 
                        this.model.setCell(x.r, x.c, null); 
                        this.sessionStats.totalDropped++;
                    } 
                }); 
                if (f.length > this.sessionStats.droppedMax) {
                    this.sessionStats.droppedMax = f.length;
                }
                this.analytics.fallenByDisconnectionThisShot = f.length;
                result.improvedBoard = true;
                if (this.healthMonitor) this.healthMonitor.logEvent('FLOATING_REMOVED', { count: f.length });
            }
            
            ExplicaliaSystem.onShotResolved(result, boardState, this.analytics);

            if (this.checkLossCondition()) {
                if (this.healthMonitor) this.healthMonitor.logEvent('LOSS_CONDITION_MET', {});
                return this.endGame(false);
            }
            
            this.updateUI();
            
            if(this.model.isEmpty()) {
                if (this.healthMonitor) this.healthMonitor.logEvent('VICTORY_GRID_EMPTY', {});
                if(this.model.grid.length > 8) this.sessionStats.wonLow = true;
                return this.endGame(true);
            }
            
            if(this.ammoCount <= 0) {
                if (this.healthMonitor) this.healthMonitor.logEvent('LOSS_NO_AMMO', {});
                return this.endGame(false);
            }
            
            this.saveProgress();
            setTimeout(() => {
                this.loadBubble();
                const oldState = this.state;
                this.state = GameState.READY;
                if (this.healthMonitor) this.healthMonitor.trackStateTransition(oldState, this.state, 'turnResolved');
            }, 100);
        }

        checkLossCondition() {
            if (!this.currentBubble) return false;
            for(let rr = 0; rr < Config.GRID_ROWS; rr++) {
                for(let cc = 0; cc < Config.GRID_COLS; cc++) {
                    if(this.model.getCell(rr, cc) && this.physics.getGridPos(rr, cc).y + this.physics.radius >= this.currentBubble.y - this.physics.radius) {
                        return true;
                    }
                }
            }
            return false;
        }

        endGame(win) {
            const oldState = this.state;
            this.state = win ? GameState.PAUSED : GameState.GAMEOVER;
            if (this.healthMonitor) {
                this.healthMonitor.trackStateTransition(oldState, this.state, win ? 'victory' : 'defeat');
                this.healthMonitor.logEvent('GAME_END', { win, level: this.level, maxLevelReached: this.maxLevelReached, isGodMode: this.isGodMode });
            }

            this.analytics.gameDurationMs = this.levelElapsedTime;
            this.analytics.totalShots = this.sessionStats.totalShots || 0;
            this.analytics.successfulShots = this.sessionStats.successfulShots || 0;
            this.analytics.totalDropped = this.sessionStats.totalDropped || 0;
            this.analytics.remainingBubbles = this.model.countBubbles().remaining;
            this.analytics.fallenByDisconnectionRatio = this.sessionStats.totalDropped / ((this.sessionStats.totalDropped + this.sessionStats.successfulShots * 3) || 1);
            this.analytics.nearDeathState = this.ammoCount <= 5;
            if (this.analytics.nearDeathState) this.analytics.nearDeathMoments++;
            
            ExplicaliaSystem.onGameEnded(win ? 'win' : 'lose', this.analytics);
            
            if (win && this.mode === 'tutorial') {
                try { localStorage.setItem(`tutorialDone_${this.playerName}`, 'true'); } catch(e) {}
                this.showTutorialCompleteSummary();
                setTimeout(() => { this.transitionToExpertMode(); }, 2000);
                return;
            }
            
            this.events.emit(Events.AUDIO_MELODY, {type: win ? 'start' : 'lose'});
            
            if (win && this.level > this.maxLevelReached) {
                this.maxLevelReached = this.level;
            }
            
            if (win && this.level >= Config.MAX_LEVEL) {
                this.saveToLeaderboard();
            }
            
            this.timerRunning = false;
            
            const $ = i => document.getElementById(i);
            $('overlay').classList.remove('hidden');
            $('overlay').style.display = 'flex';
            $('screen-start').classList.add('display-none');
            $('screen-summary').classList.remove('display-none');
            $('screen-summary').style.opacity = '1';
            
            setTimeout(() => {
                const card = $('screen-summary').querySelector('.ios-card');
                if (card) card.classList.add('animate-in');
            }, 50);
            
            if (win) {
                if (this.level >= Config.MAX_LEVEL) {
                    $('sum-score').innerText = `JUEGO COMPLETADO`;
                } else {
                    $('sum-score').innerText = `NIVEL ${this.level}`;
                }
            } else {
                $('sum-score').innerText = `NIVEL ${this.level}`;
            }
            
            const mc = $('medals-container');
            if (mc) mc.innerHTML = '';
            if (win) {
                if (this.sessionStats.consecutive >= 10) mc.innerHTML += `<div class="medal"><span class="medal-icon">🎯</span><span class="medal-text">Francotirador</span></div>`;
                if (this.sessionStats.droppedMax > 15) mc.innerHTML += `<div class="medal"><span class="medal-icon">💣</span><span class="medal-text">Demoledor</span></div>`;
                if (GameSettings.visualEffects) {
                    for (let i = 0; i < 80; i++) {
                        this.events.emit(Events.PARTICLES, {r: 0, c: 5, color: Config.COLORS[Math.floor(Math.random() * Config.COLORS.length)].main});
                    }
                }
            }
            
            const t = $('summary-title');
            const nextBtn = $('nextBtnStep1');
            if (win) {
                t.innerText = this.level >= Config.MAX_LEVEL ? "MISIÓN CUMPLIDA" : "NIVEL COMPLETADO";
                t.style.color = "var(--gold)";
                nextBtn.style.display = 'block';
                nextBtn.innerText = 'Ver Evaluación Táctica';
            } else {
                t.innerText = "MISIÓN FALLIDA";
                t.style.color = "#ff4444";
                if (this.attemptsLeft <= 0) {
                    nextBtn.style.display = 'block';
                    nextBtn.innerText = "Volver al Menú Principal";
                } else {
                    nextBtn.style.display = 'none';
                }
            }
            
            // Populating Stats Dashboard
            const s = this.sessionStats || {};
            const total = Math.max(1, s.totalShots || 1);
            
            // Eficiencia Geométrica: % de tiros que usaron rebote
            $('stat-efficiency').innerText = `${Math.round((s.bouncesUsed || 0) / total * 100)}%`;
            
            // Burbujas por tiro: Destrucción promedio
            $('stat-ratio').innerText = `${((s.successfulShots * 3 + s.totalDropped) / total).toFixed(1)}`;
            
            // Precisión: % de tiros que no fueron fallos (score > 0)
            $('stat-precision').innerText = `${Math.round((s.successfulShots || 0) / total * 100)}%`;
            
            // Tiempo de Decisión (si el bot jugó)
            const botT = (s.botDecisionTimeTotal || 0) / Math.max(1, s.botShots || 1);
            $('stat-time').innerText = s.botShots > 0 ? `${Math.round(botT)}ms` : '- (Humano)';

            const continueBtn = $('continueBtn');
            if (!win && this.attemptsLeft > 0 && this.mode === 'experto') {
                continueBtn.classList.remove('display-none');
                continueBtn.innerText = `Reintentar Nivel (${this.attemptsLeft} intentos restantes)`;
            } else {
                continueBtn.classList.add('display-none');
            }

            this.playerIsNew = false;
        }

        showTutorialCompleteSummary() {
            const $ = i => document.getElementById(i);
            $('overlay').classList.remove('hidden');
            const summaryEl = $('screen-summary');
            summaryEl.classList.remove('display-none');
            
            $('sum-score').innerText = '¡Tutorial Completado!';
            $('summary-title').innerText = 'LISTO PARA EL DESAFÍO';
            $('summary-title').style.color = 'var(--green)';
            $('informe-content').innerHTML = `
                Has dominado los controles básicos.<br>
                Ahora enfrenta el verdadero desafío.<br><br>
                <strong style="color: var(--gold);">Modo Experto desbloqueado</strong>
            `;
            $('nextBtnStep1').style.display = 'none';
            $('medals-container').innerHTML = '🎓';
        }

        transitionToExpertMode() {
            const $ = i => document.getElementById(i);
            const summaryEl = $('screen-summary');
            summaryEl.style.opacity = '0';
            
            setTimeout(() => {
                summaryEl.classList.add('display-none');
                this.cleanupGameState();
                this.resetUIState();
                $('screen-start').classList.remove('display-none');
                $('screen-start').style.opacity = '1';
                const startMain = $('start-main');
                startMain.style.display = 'block';
                startMain.style.opacity = '1';
                this.highlightExpertButton();
                $('overlay').classList.remove('hidden');
            }, 300);
        }

        highlightExpertButton() {
            const expertBtn = document.getElementById('expertBtn');
            const campaignBtn = document.getElementById('campaignBtn');
            campaignBtn.style.opacity = '0.5';
            campaignBtn.style.pointerEvents = 'none';
            expertBtn.classList.add('pulse-highlight');
            const badge = document.createElement('div');
            badge.className = 'unlock-badge';
            badge.innerText = 'DESBLOQUEADO';
            expertBtn.parentElement.style.position = 'relative';
            expertBtn.parentElement.appendChild(badge);
        }

        *calculateAIGenerator() {
            let op = []; 
            let steps = 0;
            for(let a = -Math.PI + 0.1; a <= -0.1; a += 0.02) {
                let s = this.physics.simulateShot(this.currentBubble.x, this.currentBubble.y, a, this.currentBubble.color); 
                if(s) { // Siempre agregar, incluso si score=0
                    // Nueva: Calcular "potencial" si score=0 (cercanía a grupos del mismo color)
                    if (s.score === 0) {
                        const snap = this.physics.snapToGrid(
                            this.currentBubble.x + Math.cos(a) * this.physics.height, // Simular impacto aproximado
                            this.currentBubble.y + Math.sin(a) * this.physics.height
                        );
                        if (snap) {
                            let neighbors = this.model.getNeighbors(snap.r, snap.c);
                            let potential = neighbors.filter(n => this.model.getCell(n.r, n.c)?.color.id === this.currentBubble.color.id).length;
                            s.score = potential * 5; // Bajo score para jugadas preparatorias
                            s.type = "Defensivo";
                        }
                    }
                    // Mejora: Simular tiro futuro para potencial
                    if (s.score < 100) {
                        const backupGrid = this.model.cloneGrid();
                        const snap = this.physics.snapToGrid(
                            this.currentBubble.x + Math.cos(a) * this.physics.height,
                            this.currentBubble.y + Math.sin(a) * this.physics.height
                        );
                        if (snap) {
                            this.model.setCell(snap.r, snap.c, {color: this.currentBubble.color});
                            let futureMatches = this.model.findMatches(snap.r, snap.c, this.currentBubble.color.id);
                            s.futurePotential = futureMatches.length * 5;
                            s.score += s.futurePotential;
                            this.model.grid = backupGrid;
                        }
                    }
                    op.push(s);
                }
                steps++; 
                if(steps % 5 === 0) yield;
            }
            op.sort((x, y) => y.score - x.score);
            const p = document.getElementById('ai-content');
            if(!op.length) { 
                p.innerHTML = '<div style="color:#ff453a; padding:20px;">Sin tiro viable. Intenta manual.</div>'; 
            } else {
                const b = op[0], txt = b.score > 100 ? "DERRUMBE" : (b.score > 50 ? "COMBO" : b.score > 0 ? "PREPARATORIO" : "DEFENSIVO");
                this.currentBubble.angle = b.angle; 
                this.guideLineAlpha = 1;
                p.innerHTML = `<div class="tactic-title">${txt}</div><div class="tactic-stats">Impacto: +${b.score} pts | Rebotes: ${b.bounces}</div><div class="ai-buttons"><button class="btn-manual" id="aiManual">CERRAR</button><button class="btn-auto" id="aiExec">AUTO-DISPARO</button></div>`;
                document.getElementById('aiExec').onclick = () => { 
                    if (!this.isGodMode) { // Solo decrementar si no dev
                        this.aiUsesLeft--;
                        this.sessionStats.aiUsed++;
                    }
                    if (this.healthMonitor) this.healthMonitor.trackInteraction('AI_USE');
                    document.getElementById('aiCount').innerText = `${this.aiUsesLeft}`; 
                    document.getElementById('ai-panel').classList.remove('visible'); 
                    setTimeout(() => this.fire(), 300); 
                };
                document.getElementById('aiManual').onclick = () => { 
                    document.getElementById('ai-panel').classList.remove('visible'); 
                };
            }
        }

        toggleAI() {
            const p = document.getElementById('ai-panel');
            if(p.classList.contains('visible')) { 
                p.classList.remove('visible'); 
                this.guideLineAlpha = 0; 
            } else {
                if(this.aiUsesLeft > 0 && this.state === GameState.READY) { 
                    p.classList.add('visible'); 
                    document.getElementById('manualFireBtn').classList.add('hidden'); 
                    document.getElementById('ai-content').innerHTML = '<div style="color:var(--text-sub); padding:20px; text-align:center;">Analizando Trayectorias...</div>';
                    const aiGen = this.calculateAIGenerator();
                    const runAI = () => { const res = aiGen.next(); if(!res.done) setTimeout(runAI, 0); };
                    runAI();
                } else if(this.aiUsesLeft <= 0) { 
                    document.getElementById('ai-content').innerHTML = '<div style="color:#ff453a; padding:15px; text-align:center;">Energía Agotada</div>'; 
                    p.classList.add('visible'); 
                    setTimeout(() => p.classList.remove('visible'), 1500); 
                }
            }
        }

        moveBullet(bullet, delta) {
            let speed = GameSettings.bulletSpeed * (delta / 16);
            if (speed < Config.PHYSICS_STEP) return this.physics.step(bullet, speed);
            let steps = Math.floor(speed / Config.PHYSICS_STEP);
            steps = Math.min(steps, 50);
            for (let i = 0; i < steps; i++) { 
                if (this.physics.step(this.bullet)) return true; 
            }
            return false;
        }

        executeBotShot() {
            const startTime = performance.now();
            let op = []; 
            
            const evaluate = (colorObj, isSwap) => {
                for(let a = -Math.PI + 0.05; a <= -0.05; a += 0.02) {
                    let s = this.physics.simulateShot(this.currentBubble.x, this.currentBubble.y, a, colorObj); 
                    if(s && s.snap) { 
                        s.swap = isSwap;
                        if (s.score === 0) {
                            let neighbors = this.model.getNeighbors(s.snap.r, s.snap.c);
                            let potential = neighbors.filter(n => this.model.getCell(n.r, n.c)?.color.id === colorObj.id).length;
                            s.score = potential * 5; 
                            s.score -= (s.snap.r * 0.5); 
                        } else {
                            s.score += (s.snap.r * 0.5);
                        }
                        
                        if (s.score < 100) {
                            const backupGrid = this.model.cloneGrid();
                            this.model.setCell(s.snap.r, s.snap.c, {color: colorObj});
                            let futureMatches = this.model.findMatches(s.snap.r, s.snap.c, colorObj.id);
                            s.futurePotential = futureMatches.length * 5;
                            s.score += s.futurePotential;
                            this.model.grid = backupGrid;
                        }
                        op.push(s);
                    }
                }
            };

            evaluate(this.currentBubble.color, false);
            if (this.nextBubbleColor && this.swapUses > 0) {
                evaluate(this.nextBubbleColor, true);
            }

            op.sort((x, y) => {
                let xScore = x.score;
                let yScore = y.score;
                
                // If neither can pop anything (score < 30), strictly prefer NOT swapping to save swaps.
                if (xScore < 30 && yScore < 30) {
                    if (y.swap && !x.swap) return 1; // y is worse
                    if (x.swap && !y.swap) return -1; // x is worse
                }
                
                // If one can pop something and the other cannot, heavily prefer the one that can pop.
                if (xScore < 30 && yScore >= 30) {
                    // Even if y is a swap, it's better than wasting a shot
                    yScore += 500; 
                }
                if (yScore < 30 && xScore >= 30) {
                    xScore += 500;
                }
                
                // If both can pop something, penalize swapping so it only swaps for a massive advantage (+100 score)
                if (xScore >= 30 && yScore >= 30) {
                    if (x.swap) xScore -= 100;
                    if (y.swap) yScore -= 100;
                }

                let scoreDiff = yScore - xScore;
                if (Math.abs(scoreDiff) < 1) {
                    if (y.swap && !x.swap) return 1;
                    if (x.swap && !y.swap) return -1;
                }
                return scoreDiff;
            });
            
            this.sessionStats = this.sessionStats || {};
            this.sessionStats.botShots = (this.sessionStats.botShots || 0) + 1;
            this.sessionStats.botDecisionTimeTotal = (this.sessionStats.botDecisionTimeTotal || 0) + (performance.now() - startTime);

            if (op.length > 0) {
                let choice = op[0];
                // Human Casual Mode: 30% chance to pick the second best option if it exists
                if (!this.botPerfect && op.length > 1 && Math.random() < 0.3) {
                    choice = op[1];
                }
                
                if (choice.swap) {
                    this.swapBubbles();
                }
                this.currentBubble.angle = choice.angle;
                this.fire();
            } else {
                this.currentBubble.angle = -Math.PI / 2;
                this.fire();
            }
        }

        loop() {
            const execute = () => {
                try {
                    if (this.healthMonitor) this.healthMonitor.runDiagnostics();
                    
                    if (this.state === GameState.MENU) return;
                    
                    const now = Date.now();
                    const delta = now - this.lastFrameTime;
                    if (delta > 1000) { 
                        this.lastFrameTime = now; 
                        return; 
                    }
                    this.lastFrameTime = now;
                    
                    if (this.timerRunning) { 
                        this.levelElapsedTime += delta; 
                        this.updateTimer(); 
                    }
                    
                    if (this.state !== GameState.PAUSED && this.state !== GameState.MENU) {
                        if (this.bullet) {
                            if (this.moveBullet(this.bullet, delta)) {
                                let s = this.physics.snapToGrid(this.bullet.x, this.bullet.y); 
                                if(s) { 
                                    if (this.bullet.bounces > 0) {
                                        this.sessionStats = this.sessionStats || {};
                                        this.sessionStats.bouncesUsed = (this.sessionStats.bouncesUsed || 0) + 1;
                                    }
                                    this.events.emit(Events.AUDIO_PLAY, {type: 'pop'}); 
                                    this.model.setCell(s.r, s.c, {color: this.bullet.color}); 
                                    this.resolveTurn(s.r, s.c, this.bullet.color); 
                                } else {
                                    if (this.healthMonitor) this.healthMonitor.logEvent('SNAP_FAILED', { bulletX: this.bullet.x, bulletY: this.bullet.y });
                                    this.endGame(false); 
                                }
                                this.bullet = null; 
                            } 
                        }
                    }
                    
                    const isBotTurn = this.botMode === 'FULL' || (this.botMode === 'SHARED' && this.botTurn);
                    if (this.state === GameState.READY && this.botMode && this.botMode !== 'OFF' && isBotTurn && !this.botWaitingToFire) {
                        this.botWaitingToFire = true;
                        setTimeout(() => {
                            if (this.state === GameState.READY && this.botMode !== 'OFF') {
                                this.executeBotShot();
                            }
                            this.botWaitingToFire = false;
                        }, this.botSpeed || 500);
                    }
                    
                    this.renderer.draw(this.model, this.currentBubble, this.bullet, this.nextBubbleColor, this.secondNextBubbleColor, this.guideLineAlpha); 
                } catch(e) { 
                    console.error('Loop error:', e);
                    if (this.healthMonitor) this.healthMonitor.logEvent('LOOP_ERROR', { message: e.message, stack: e.stack });
                } finally {
                    requestAnimationFrame(this.loop);
                }
            };
            execute();
        }
    }

    // ============================================================
    // INICIALIZACIÓN
    // ============================================================
    window.onload = function() { 
        document.body.classList.add('loaded');
        const brandTitle = document.querySelector('.brand-title');
        const brandSub = document.querySelector('.brand-sub');
        const accessBtn = document.getElementById('accessBtn');
        
        if (brandTitle && brandSub && accessBtn) {
            setTimeout(() => { 
                brandTitle.style.transition = 'opacity 0.6s ease-out'; 
                brandTitle.style.opacity = '1'; 
            }, 100);
            setTimeout(() => { 
                brandSub.style.transition = 'opacity 0.6s ease-out'; 
                brandSub.style.opacity = '1'; 
            }, 400);
            setTimeout(() => { 
                accessBtn.style.transition = 'opacity 0.6s ease-out'; 
                accessBtn.style.opacity = '1'; 
            }, 700);
        }
        
        window.gameInstance = new GameController(); 
        
        window.getGameDiagnosis = function() {
            if (window.gameInstance && window.gameInstance.healthMonitor) {
                return window.gameInstance.healthMonitor.getQuickDiagnosis();
            }
            return 'HealthMonitor no disponible';
        };
        
        window.exportGameDiagnostics = function() {
            if (window.gameInstance && window.gameInstance.healthMonitor) {
                return window.gameInstance.healthMonitor.downloadReport();
            }
            return 'HealthMonitor no disponible';
        };
        
        window.getGameState = function() {
            if (window.gameInstance) {
                return {
                    state: window.gameInstance.state,
                    level: window.gameInstance.level,
                    mode: window.gameInstance.mode,
                    isGodMode: window.gameInstance.isGodMode,
                    currentBubble: window.gameInstance.currentBubble ? window.gameInstance.currentBubble.color.name : null,
                    nextBubble: window.gameInstance.nextBubbleColor ? window.gameInstance.nextBubbleColor.name : null,
                    secondNext: window.gameInstance.secondNextBubbleColor ? window.gameInstance.secondNextBubbleColor.name : null,
                    thirdNext: window.gameInstance.thirdNextBubbleColor ? window.gameInstance.thirdNextBubbleColor.name : null,
                    swapReserve: window.gameInstance.swapReserveColor ? window.gameInstance.swapReserveColor.name : null,
                    bullet: !!window.gameInstance.bullet,
                    timerRunning: window.gameInstance.timerRunning,
                    aiUsesLeft: window.gameInstance.aiUsesLeft,
                    swapUses: window.gameInstance.swapUses,
                    ammoCount: window.gameInstance.ammoCount
                };
            }
            return 'Game no disponible';
        };
        
        console.log('%c🎮 BUBBLE SHOOTER v21 - SWAP FIX BUILD', 'color: #D4AF37; font-size: 16px; font-weight: bold;');
        console.log('%cSistema de SWAP corregido:', 'color: #30D158;');
        console.log('  ✅ Swap intercambia con color de RESERVA (anterior)');
        console.log('  ✅ Cola visible (next, second, third) NUNCA cambia');
        console.log('  ✅ Cola de burbujas NUNCA tiene 3 consecutivas iguales');
        console.log('%cComandos: getGameState() para ver cola de burbujas', 'color: #9C27B0;');
    };

