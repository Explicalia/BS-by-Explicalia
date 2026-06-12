const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `    endGame(win) {
        if (this.healthMonitor) this.healthMonitor.logEvent('GAME_ENDED', { win, level: this.level });
        this.state = GameState.GAME_OVER;
        this.timerRunning = false;`;

const replacement = `    endGame(win) {
        if (this.healthMonitor) this.healthMonitor.logEvent('GAME_ENDED', { win, level: this.level });
        this.state = GameState.GAME_OVER;
        this.timerRunning = false;
        
        // Clear canvas
        if (this.renderer && this.renderer.ctx) {
            this.renderer.clearAll();
            this.renderer.ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
        }`;

code = code.replace(target, replacement);

fs.writeFileSync('index.html', code);
console.log("Patched endGame clear.");
