const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `            this.model.setCell(r, c, {color: col});
            
            let m = this.model.findMatches(r, c, col.id);
            let hadMatch = false;`;

const replacement = `            this.model.setCell(r, c, {color: col});
            
            let triggerBomb = false;
            let bombCenter = null;
            if (col.isBomb) {
                triggerBomb = true;
                bombCenter = {r, c};
            } else {
                for (let n of this.model.getNeighbors(r, c)) {
                    let cell = this.model.getCell(n.r, n.c);
                    if (cell && cell.color && cell.color.isBomb) {
                        triggerBomb = true;
                        bombCenter = n;
                        break;
                    }
                }
            }

            let m = [];
            if (triggerBomb) {
                let v = new Set();
                let q = [{r: bombCenter.r, c: bombCenter.c, dist: 0}];
                while(q.length) {
                    let cur = q.shift();
                    let k = \`\${cur.r},\${cur.c}\`;
                    if (!v.has(k) && this.model.getCell(cur.r, cur.c)) {
                        v.add(k);
                        m.push({r: cur.r, c: cur.c});
                        if (cur.dist < 2) {
                            for (let n of this.model.getNeighbors(cur.r, cur.c)) {
                                q.push({r: n.r, c: n.c, dist: cur.dist + 1});
                            }
                        }
                    }
                }
            } else {
                m = this.model.findMatches(r, c, col.id);
            }
            
            let hadMatch = false;`;

const target2 = `                m.forEach(x => {
                    this.events.emit(Events.PARTICLES, {r: x.r, c: x.c, color: this.model.getCell(x.r, x.c).color.main}); 
                    this.model.setCell(x.r, x.c, null);
                });`;

const replacement2 = `                let toUnfreeze = new Set();
                m.forEach(x => {
                    let cell = this.model.getCell(x.r, x.c);
                    if (cell && cell.hasAmmo) {
                        this.ammoCount += 5;
                        this.events.emit(Events.TEXT_FLOAT, {r: x.r, c: x.c, text: "+5 TIROS"});
                    }
                    for (let n of this.model.getNeighbors(x.r, x.c)) {
                        let nCell = this.model.getCell(n.r, n.c);
                        if (nCell && nCell.isFrozen) toUnfreeze.add(\`\${n.r},\${n.c}\`);
                    }
                    this.events.emit(Events.PARTICLES, {r: x.r, c: x.c, color: cell ? cell.color.main : '#fff'}); 
                    this.model.setCell(x.r, x.c, null);
                });
                toUnfreeze.forEach(k => {
                    let [fr, fc] = k.split(',').map(Number);
                    let fCell = this.model.getCell(fr, fc);
                    if (fCell) {
                        fCell.isFrozen = false;
                        this.events.emit(Events.TEXT_FLOAT, {r: fr, c: fc, text: "❄️"});
                    }
                });`;

const target3 = `        getFloatingBubbles() {
            let v = new Set(), q = [];
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    let cell = this.grid[r] && this.grid[r][c];
                    if (cell && (r === 0 || cell.isSteel)) { 
                        let k = \`\${r},\${c}\`; 
                        if (!v.has(k)) { q.push({r, c}); v.add(k); } 
                    }
                }
            }`;

const replacement3 = `        getFloatingBubbles() {
            let v = new Set(), q = [];
            for (let r = 0; r < Config.GRID_ROWS; r++) {
                for (let c = 0; c < Config.GRID_COLS; c++) {
                    let cell = this.grid[r] && this.grid[r][c];
                    // cell.color.isSteel is used because when it's initialized, we set it as cell.color = Config.STEEL_COLOR
                    if (cell && (r === 0 || cell.color.isSteel || cell.isSteel)) { 
                        let k = \`\${r},\${c}\`; 
                        if (!v.has(k)) { q.push({r, c}); v.add(k); } 
                    }
                }
            }`;

const target4 = `                let cell = this.getCell(cur.r, cur.c);
                if (cur.r === 0 || (cell && cell.isSteel)) return true;`;

const replacement4 = `                let cell = this.getCell(cur.r, cur.c);
                if (cur.r === 0 || (cell && (cell.isSteel || cell.color.isSteel))) return true;`;

const target5 = `                    if (cell && !v.has(k) && cell.color.id === id && !cell.isFrozen && !cell.isSteel) { `;
const replacement5 = `                    if (cell && !v.has(k) && cell.color.id === id && !cell.isFrozen && !cell.isSteel && !cell.color.isSteel) { `;

const target6 = `            if (!this.grid[r] || !this.grid[r][c] || this.grid[r][c].color.id !== id || this.grid[r][c].color.isStone || this.grid[r][c].isFrozen || this.grid[r][c].isSteel) return [];`;
const replacement6 = `            if (!this.grid[r] || !this.grid[r][c] || this.grid[r][c].color.id !== id || this.grid[r][c].color.isStone || this.grid[r][c].isFrozen || this.grid[r][c].isSteel || this.grid[r][c].color.isSteel) return [];`;

code = code.replace(target, replacement);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);
code = code.replace(target4, replacement4);
code = code.replace(target5, replacement5);
code = code.replace(target6, replacement6);

fs.writeFileSync('index.html', code);
console.log("Patched resolveTurn.");
