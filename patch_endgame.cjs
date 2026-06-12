const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `            const t = $('summary-title');
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
            $('stat-efficiency').innerText = \`\${Math.round((s.bouncesUsed || 0) / total * 100)}%\`;
            
            // Burbujas por tiro: Destrucción promedio
            $('stat-ratio').innerText = \`\${((s.successfulShots * 3 + s.totalDropped) / total).toFixed(1)}\`;
            
            // Precisión: % de tiros que no fueron fallos (score > 0)
            $('stat-precision').innerText = \`\${Math.round((s.successfulShots || 0) / total * 100)}%\`;
            
            // Tiempo de Decisión (si el bot jugó)
            const botT = (s.botDecisionTimeTotal || 0) / Math.max(1, s.botShots || 1);
            $('stat-time').innerText = s.botShots > 0 ? \`\${Math.round(botT)}ms\` : '- (Humano)';

            const continueBtn = $('continueBtn');
            if (!win && this.attemptsLeft > 0 && this.mode === 'experto') {
                continueBtn.classList.remove('display-none');
                continueBtn.innerText = \`Reintentar Nivel (\${this.attemptsLeft} intentos restantes)\`;
            } else {
                continueBtn.classList.add('display-none');
            }`;

const replacement = `            const t = $('summary-title');
            if (win) {
                t.innerText = this.level >= Config.MAX_LEVEL ? "MISIÓN CUMPLIDA" : "NIVEL COMPLETADO";
                t.style.color = "var(--gold)";
            } else {
                t.innerText = "MISIÓN FALLIDA";
                t.style.color = "#ff4444";
            }
            
            // Populating Stats Dashboard
            const s = this.sessionStats || {};
            
            $('stat-efficiency').innerText = \`\${(s.successfulShots || 0) * 3 + (s.totalDropped || 0)}\`;
            $('stat-ratio').innerText = \`x\${s.maxCombo || 1}\`;
            $('stat-precision').innerText = \`\${this.ammoCount}\`;
            $('stat-time').innerText = \`\${s.totalDropped || 0}\`;

            const continueBtn = $('continueBtn');
            const winBtns = $('win-buttons-container');
            
            if (win) {
                continueBtn.classList.add('display-none');
                if (winBtns) winBtns.style.display = 'flex';
                $('sum-motivation').innerText = Config.MOTIVATIONAL_PHRASES[Math.floor(Math.random() * Config.MOTIVATIONAL_PHRASES.length)];
            } else {
                if (winBtns) winBtns.style.display = 'none';
                $('sum-motivation').innerText = "Has caído. Pero siempre puedes volver a levantarte.";
                if (this.attemptsLeft > 0 && this.mode === 'experto') {
                    continueBtn.classList.remove('display-none');
                    continueBtn.innerText = \`Reintentar Nivel (\${this.attemptsLeft} intentos restantes)\`;
                } else {
                    continueBtn.classList.remove('display-none');
                    continueBtn.innerText = \`Volver al Menú Principal\`;
                    continueBtn.onclick = () => {
                        this.saveToLeaderboard();
                        this.level = 1; 
                        this.maxLevelReached = 0;
                        if (window.SecureStorage) SecureStorage.remove('bubbleShooterSave'); 
                        this.state = GameState.MENU;
                        this.cleanupGameState();
                        this.resetUIState();
                        this.transitionScreen(null, 'screen-start');
                    };
                }
            }`;

code = code.replace(target, replacement);

fs.writeFileSync('index.html', code);
console.log("Patched endGame.");
