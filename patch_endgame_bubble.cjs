const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `        endGame(win) {
            const oldState = this.state;
            this.state = win ? GameState.PAUSED : GameState.GAMEOVER;
            
            // Clear canvas so the pointer and trajectory disappear
            if (this.renderer && this.renderer.ctx) {
                this.renderer.clearAll();
                this.renderer.ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
            }`;

const replacement = `        endGame(win) {
            const oldState = this.state;
            this.state = win ? GameState.PAUSED : GameState.GAMEOVER;
            
            // Clear canvas so the pointer and trajectory disappear
            this.currentBubble = null;
            if (this.renderer && this.renderer.ctx) {
                this.renderer.clearAll();
                this.renderer.ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
            }`;

code = code.replace(target, replacement);

fs.writeFileSync('index.html', code);
console.log("Patched endGame bubble nullification.");
