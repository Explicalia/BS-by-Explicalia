const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target1 = `                f.forEach(x => { 
                    let cl = this.model.getCell(x.r, x.c); 
                    if(cl) { 
                        this.events.emit(Events.DROP, {r: x.r, c: x.c, color: cl.color}); 
                        this.model.setCell(x.r, x.c, null); 
                        this.sessionStats.totalDropped++;
                    } 
                }); `;

const replacement1 = `                f.forEach(x => { 
                    let cl = this.model.getCell(x.r, x.c); 
                    if(cl) { 
                        if (cl.hasAmmo) {
                            this.ammoCount += 5;
                            this.events.emit(Events.TEXT_FLOAT, {r: x.r, c: x.c, text: "+5 TIROS"});
                        }
                        this.events.emit(Events.DROP, {r: x.r, c: x.c, color: cl.color}); 
                        this.model.setCell(x.r, x.c, null); 
                        this.sessionStats.totalDropped++;
                    } 
                }); `;

const target2 = `            if (this.checkLossCondition()) {
                if (this.healthMonitor) this.healthMonitor.logEvent('LOSS_CONDITION_MET', {});
                return this.endGame(false);
            }`;

const replacement2 = `            // CHAMELEON & VIRUS LOGIC
            let activeColors = Array.from(this.model.getColorsInPlaySet ? this.model.getColorsInPlaySet() : []);
            if (!activeColors.length) activeColors = Config.COLORS.slice(0, 6);
            
            let virusSpread = [];
            
            for (let rr = 0; rr < Config.GRID_ROWS; rr++) {
                for (let cc = 0; cc < Config.GRID_COLS; cc++) {
                    let cell = this.model.getCell(rr, cc);
                    if (!cell) continue;
                    
                    if (cell.isChameleon) {
                        // Pick random color from active colors (excluding special ones)
                        let validColors = Config.COLORS.filter(c => !c.isStone && !c.isBomb && !c.isVirus && !c.isChameleon && !c.isSteel);
                        cell.color = validColors[Math.floor(Math.random() * validColors.length)];
                    }
                    
                    if (cell.isVirus) {
                        // Every 3 shots the virus spreads
                        if (!this.sessionStats.virusTurn) this.sessionStats.virusTurn = 0;
                    }
                }
            }
            
            this.sessionStats.virusTurn = (this.sessionStats.virusTurn || 0) + 1;
            if (this.sessionStats.virusTurn % 3 === 0) {
                // Find all viruses and try to spread
                for (let rr = 0; rr < Config.GRID_ROWS; rr++) {
                    for (let cc = 0; cc < Config.GRID_COLS; cc++) {
                        let cell = this.model.getCell(rr, cc);
                        if (cell && cell.isVirus) {
                            let neighbors = this.model.getNeighbors(rr, cc);
                            let validTargets = neighbors.filter(n => {
                                let nc = this.model.getCell(n.r, n.c);
                                return nc && !nc.isVirus && !nc.isSteel;
                            });
                            if (validTargets.length) {
                                let target = validTargets[Math.floor(Math.random() * validTargets.length)];
                                virusSpread.push(target);
                            }
                        }
                    }
                }
                
                virusSpread.forEach(t => {
                    let c = this.model.getCell(t.r, t.c);
                    if (c) {
                        c.isVirus = true;
                        c.color = Config.VIRUS_COLOR;
                        c.isChameleon = false;
                        c.isFrozen = false;
                        c.hasAmmo = false;
                        this.events.emit(Events.TEXT_FLOAT, {r: t.r, c: t.c, text: "🦠"});
                    }
                });
            }

            if (this.checkLossCondition()) {
                if (this.healthMonitor) this.healthMonitor.logEvent('LOSS_CONDITION_MET', {});
                return this.endGame(false);
            }`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('index.html', code);
console.log("Patched resolveTurn end.");
