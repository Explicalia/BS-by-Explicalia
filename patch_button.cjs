const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace('<button class="round-button" id="accessBtn">ACCESO AL JUEGO</button>', '<button class="round-button" id="accessBtn" style="outline: none; font-family: inherit; border: none; -webkit-tap-highlight-color: transparent;">ACCESO AL JUEGO</button>');

fs.writeFileSync('index.html', code);
console.log("Patched button");
