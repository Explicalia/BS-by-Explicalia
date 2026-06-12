const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Wipe pickPostGameMessages
code = code.replace(/function pickPostGameMessages[\s\S]*?return lines;\s*\}/, '');

// Also wipe any calls to pickPostGameMessages
code = code.replace(/const lines = pickPostGameMessages\(result, analytics, name\);/, 'const lines = [];');

code = code.replace(/message = ExplicaliaSystem\.pickPostGameMessages\('win', env\.analytics, name\)\.join\('\\n'\);/, 'message = "";');

fs.writeFileSync('index.html', code);
console.log("Wiped pickPostGameMessages");
