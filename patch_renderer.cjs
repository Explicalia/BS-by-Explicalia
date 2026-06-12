const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target1 = `        drawBubble(x, y, r, c, a = 1) {
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
                this.ctx.font = \`bold \${actualRadius * 0.8}px sans-serif\`;
                const symbols = ['●', '▲', '■', '★', '♦', '♥', '✿'];
                this.ctx.fillText(symbols[c.id % symbols.length], x, y + 1);
            }
            
            this.ctx.globalAlpha = 1;
        }`;

const replacement1 = `        drawBubble(x, y, r, c, a = 1, cell = null) {
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
            
            if (cell) {
                if (cell.isFrozen) {
                    this.ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, actualRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = '#fff';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`\${actualRadius}px sans-serif\`;
                    this.ctx.fillText('❄️', x, y + 2);
                } else if (cell.hasAmmo) {
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`bold \${actualRadius * 1.2}px sans-serif\`;
                    this.ctx.fillText('⚡', x, y + 2);
                } else if (cell.isVirus) {
                    this.ctx.fillStyle = '#000';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`bold \${actualRadius * 1.2}px sans-serif\`;
                    this.ctx.fillText('🦠', x, y + 2);
                } else if (cell.isBomb) {
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`bold \${actualRadius * 1.2}px sans-serif\`;
                    this.ctx.fillText('💣', x, y + 2);
                } else if (cell.isChameleon) {
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`bold \${actualRadius * 1.2}px sans-serif\`;
                    this.ctx.fillText('🌈', x, y + 2);
                } else if (cell.isSteel) {
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, actualRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.font = \`bold \${actualRadius * 1.2}px sans-serif\`;
                    this.ctx.fillText('🛡️', x, y + 2);
                }
            }
            
            if (GameSettings.colorblind && c.id !== undefined && r > 5 && !cell?.isFrozen && !cell?.isBomb && !cell?.isSteel && !cell?.isVirus && !cell?.hasAmmo && !cell?.isChameleon) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = \`bold \${actualRadius * 0.8}px sans-serif\`;
                const symbols = ['●', '▲', '■', '★', '♦', '♥', '✿'];
                this.ctx.fillText(symbols[c.id % symbols.length], x, y + 1);
            }
            
            this.ctx.globalAlpha = 1;
        }`;

const target2 = `            for(let r = 0; r < model.grid.length; r++) {
                for(let c = 0; c < Config.GRID_COLS; c++) { 
                    let cell = model.getCell(r, c); 
                    if(cell) { 
                        const p = this.physics.getGridPos(r, c);
                        this.drawBubble(p.x, p.y, this.physics.radius, cell.color);
                    } 
                }
            }`;

const replacement2 = `            for(let r = 0; r < model.grid.length; r++) {
                for(let c = 0; c < Config.GRID_COLS; c++) { 
                    let cell = model.getCell(r, c); 
                    if(cell) { 
                        const p = this.physics.getGridPos(r, c);
                        this.drawBubble(p.x, p.y, this.physics.radius, cell.color, 1, cell);
                    } 
                }
            }`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('index.html', code);
console.log("Patched Renderer.");
