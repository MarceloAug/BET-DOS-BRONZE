const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Mudar background para preto
code = code.replace(/background-color: var\(--color-zinc-950\);/, 'background-color: #000000;');
code = code.replace(/background-image: radial-gradient\(circle at 50% 0%, var\(--color-zinc-900\) 0%, var\(--color-zinc-950\) 100%\);/, 'background-image: radial-gradient(circle at 50% 0%, #0a0a0a 0%, #000000 100%);');

fs.writeFileSync('src/index.css', code);
