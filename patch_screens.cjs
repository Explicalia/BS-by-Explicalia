const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const htmlTarget = `        <!-- PANTALLA DE RESUMEN (FIN DE NIVEL) -->
        <div id="screen-summary" class="display-none">
            <div class="ios-card">
                <div class="brand-sub" id="summary-title" style="color:var(--gold); margin-bottom:16px;">RESULTADO</div>
                <div class="summary-score-box">
                    <div class="summary-score-val" id="sum-score">Nivel 0</div>
                </div>
                
                <div class="stats-dashboard">
                    <div class="stat-box">
                        <div class="stat-val" id="stat-efficiency">0%</div>
                        <div class="stat-label">Tiros con Rebote</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-ratio">0</div>
                        <div class="stat-label">Burbujas / Tiro</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-precision">0%</div>
                        <div class="stat-label">Precisión</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-time">0ms</div>
                        <div class="stat-label">T. Decisión</div>
                    </div>
                </div>
                
                <div class="quote-container" style="margin-top: 15px;">
                    <div class="quote-sarcasm" id="sum-sarcasm"></div>
                    <div class="quote-divider"></div>
                    <div class="quote-motivation" id="sum-motivation"></div>
                    <div class="quote-signature">by Explicalia System</div>
                </div>
                
                <div id="medals-container"></div>
                
                <button id="continueBtn" class="continue-btn display-none">Continuar (Otra oportunidad)</button>
                <button id="nextBtnStep1" class="btn-primary" style="margin-top: 15px;">Siguiente Paso</button>
            </div>
        </div>

        <!-- PANTALLA DE RESUMEN PASO 2 -->
        <div id="screen-summary-step2" class="display-none">
            <div class="ios-card">
                <div class="brand-title" style="font-size:28px; margin-bottom:5px;">Bubble Shooter</div>
                <div class="brand-sub" style="margin-bottom:20px;">El recreo de los mayores</div>
                <div class="quote-container" style="margin-bottom: 30px;">
                    <div id="motivational-phrase" style="font-size: 16px; color: var(--text-main); line-height: 1.6; font-weight: 500;"></div>
                </div>
                
                <button id="nextLevelBtn" class="btn-primary">Pasar al siguiente nivel</button>
                <button id="saveAndContinueBtn" class="btn-primary" style="background: rgba(255,255,255,0.1); color: var(--text-main); margin-top: 10px;">Guardar progreso y salir</button>
            </div>
        </div>`;

const htmlReplacement = `        <!-- PANTALLA DE RESUMEN (FIN DE NIVEL) -->
        <div id="screen-summary" class="display-none">
            <div class="ios-card">
                <div class="brand-sub" id="summary-title" style="color:var(--gold); margin-bottom:16px;">RESULTADO</div>
                <div class="summary-score-box" style="margin-bottom: 20px;">
                    <div class="summary-score-val" id="sum-score">Nivel 0</div>
                </div>
                
                <div class="stats-dashboard" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="stat-box">
                        <div class="stat-val" id="stat-efficiency" style="color: var(--ios-blue);">0</div>
                        <div class="stat-label">Burbujas Rotas</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-ratio" style="color: var(--ios-orange);">0</div>
                        <div class="stat-label">Mejor Combo</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-precision" style="color: var(--ios-green);">0</div>
                        <div class="stat-label">Tiros Sobrantes</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val" id="stat-time" style="color: var(--ios-pink);">0</div>
                        <div class="stat-label">Caídas (Derrumbes)</div>
                    </div>
                </div>
                
                <div class="quote-container" style="margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px;">
                    <div class="quote-motivation" id="sum-motivation" style="font-size: 15px; font-weight: 500; font-style: italic; color: #FFF;"></div>
                </div>
                
                <div id="medals-container" style="margin-bottom: 20px;"></div>
                
                <button id="continueBtn" class="continue-btn display-none" style="margin-bottom: 15px;">Reintentar Nivel</button>
                <div id="win-buttons-container" style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="nextLevelBtn" class="btn-primary">Pasar al siguiente nivel</button>
                    <button id="saveAndContinueBtn" class="btn-primary" style="background: rgba(255,255,255,0.1); color: var(--text-main);">Guardar progreso y salir</button>
                </div>
            </div>
        </div>`;

code = code.replace(htmlTarget, htmlReplacement);

fs.writeFileSync('index.html', code);
console.log("Patched HTML screens.");
