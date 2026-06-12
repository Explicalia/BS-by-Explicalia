const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `        endGame(win) {
            const oldState = this.state;
            this.state = win ? GameState.PAUSED : GameState.GAMEOVER;
            if (this.healthMonitor) {
                this.healthMonitor.trackStateTransition(oldState, this.state, win ? 'victory' : 'defeat');
                this.healthMonitor.logEvent('GAME_END', { win, level: this.level, maxLevelReached: this.maxLevelReached, isGodMode: this.isGodMode });
            }`;

const replacement = `        endGame(win) {
            const oldState = this.state;
            this.state = win ? GameState.PAUSED : GameState.GAMEOVER;
            
            // Clear canvas so the pointer and trajectory disappear
            if (this.renderer && this.renderer.ctx) {
                this.renderer.clearAll();
                this.renderer.ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
            }
            
            if (this.healthMonitor) {
                this.healthMonitor.trackStateTransition(oldState, this.state, win ? 'victory' : 'defeat');
                this.healthMonitor.logEvent('GAME_END', { win, level: this.level, maxLevelReached: this.maxLevelReached, isGodMode: this.isGodMode });
            }`;

code = code.replace(target, replacement);

fs.writeFileSync('index.html', code);
console.log("Patched endGame clear properly.");
