const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync('script.js', scriptMatch[1]);
  require('child_process').execSync('node -c script.js', {stdio: 'inherit'});
  console.log("Syntax is OK!");
} else {
  console.log("No script found");
}
