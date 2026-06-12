const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `            safeAssign('continueBtn', () => {
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
                $('overlay').style.display = 'none';
                $('screen-start').classList.remove('display-none');
                
                this.resetUIState();
            });`;

const replacement = `            safeAssign('continueBtn', () => {
                if (this.healthMonitor) this.healthMonitor.logEvent('RETRY_LEVEL', { level: this.level });
                
                $('screen-summary').style.opacity = '0';
                setTimeout(() => {
                    $('screen-summary').classList.add('display-none');
                    $('overlay').classList.add('hidden');
                    $('overlay').style.display = 'none';
                    this.renderer.canvas.style.display = 'block';
                    this.startLevel(true);
                }, 300);
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
                    
                    $('screen-summary').style.opacity = '0';
                    setTimeout(() => {
                        $('screen-summary').classList.add('display-none');
                        $('overlay').classList.add('hidden');
                        $('overlay').style.display = 'none';
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
                
                $('screen-summary').classList.add('display-none');
                $('overlay').style.display = 'none';
                $('screen-start').classList.remove('display-none');
                
                this.resetUIState();
            });`;

code = code.replace(target, replacement);
fs.writeFileSync('index.html', code);
console.log("Patched listeners");
