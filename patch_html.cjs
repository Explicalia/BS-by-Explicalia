const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const newScreens = `
        <!-- PANTALLA FINAL 7 -->
        <div id="screen-ending-7" class="display-none">
            <div class="ios-card" style="border: 2px solid #D4AF37; box-shadow: 0 0 30px rgba(212,175,55,0.3);">
                <div class="brand-title" style="color: #D4AF37;">CAMPAÑA COMPLETADA</div>
                <div class="brand-sub">Has superado los 7 niveles del recreo de los mayores.</div>
                <div class="closure-message" style="margin: 20px 0;">Tu mente ha sido masajeada. Eres un maestro. Pero... algo oscuro aguarda más abajo.</div>
                <div style="margin-bottom: 20px; font-size: 14px; color: var(--text-sub);">¿Te atreves a descender al Abismo?</div>
                <button id="enterAbyssBtn" class="btn-primary" style="background: linear-gradient(135deg, #1a0b2e 0%, #4a154b 100%); border: 1px solid #8b3dff; box-shadow: 0 0 15px rgba(139,61,255,0.5);">Descender al Abismo (Niveles 8-10)</button>
                <button id="endGameBtn7" class="btn-danger" style="margin-top: 15px;">Plantarse y Terminar</button>
            </div>
        </div>

        <!-- PANTALLA EXPLICATIVA DEL ABISMO -->
        <div id="screen-abyss-tutorial" class="display-none">
            <div class="ios-card" style="max-width: 95%; max-height: 85vh; overflow-y: auto;">
                <div class="brand-title" style="color: #8b3dff; font-size: 24px;">BIENVENIDO AL ABISMO</div>
                <div style="font-size: 13px; margin-bottom: 15px; color: var(--text-main); text-align: left;">
                    En estos 3 últimos niveles la física y las reglas cambian. Prepárate para encontrar:
                    <ul style="padding-left: 20px; margin-top: 10px; line-height: 1.5;">
                        <li>💣 <b>Burbujas Explosivas (Negras):</b> Al explotar destruyen todo a su alrededor (radio de 2 casillas), ¡incluso acero y piedras!</li>
                        <li>❄️ <b>Burbujas Congeladas:</b> Cubiertas de hielo. No puedes eliminarlas directamente. Debes explotar burbujas vecinas para descongelarlas primero.</li>
                        <li>🦠 <b>Virus (Rojas Oscuras):</b> ¡Peligro! Cada 3 disparos que hagas, el virus infectará a una burbuja vecina convirtiéndola en piedra. ¡Mátalos rápido!</li>
                        <li>🌈 <b>Camaleones:</b> Cambian de color aleatoriamente después de CADA disparo tuyo. Requieren previsión y suerte.</li>
                        <li>🛡️ <b>Bloques de Acero (Gris Oscuro):</b> Indestructibles. Solo caen si explota una bomba cerca. Y lo peor: NUNCA se caen por desconexión, actúan como anclajes flotantes.</li>
                        <li>🔋 <b>Munición Extra (+5):</b> Tienen un rayo dentro. Si las explotas o las haces caer, te otorgan +5 tiros en tu cargador. Vitales para sobrevivir.</li>
                    </ul>
                </div>
                <button id="startAbyssBtn" class="btn-primary" style="background: #8b3dff;">Aceptar mi destino</button>
            </div>
        </div>

        <!-- PANTALLA FINAL 10 -->
        <div id="screen-ending-10" class="display-none">
            <div class="ios-card" style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);">
                <div class="brand-title" style="color: #000; font-size: 30px; text-shadow: none;">DIOS DE LAS BURBUJAS</div>
                <div class="brand-sub" style="color: #333;">Has conquistado el Abismo.</div>
                <div class="closure-message" style="color: #111; font-weight: bold; margin: 20px 0;">No hay nada más allá. Has demostrado una precisión y estrategia sobrehumanas. Explicalia se arrodilla ante ti.</div>
                <div class="tutorial-signature" style="color: #333;">by Explicalia System</div>
                <button id="returnToMenuBtn10" class="btn-primary" style="background: #000; color: #FFF; margin-top: 20px;">Volver al Mundo Mortal (Menú)</button>
            </div>
        </div>
`;

html = html.replace('<!-- PANTALLA DE DESPEDIDA -->', newScreens + '\n        <!-- PANTALLA DE DESPEDIDA -->');

fs.writeFileSync('index.html', html);
console.log("HTML sections added.");
