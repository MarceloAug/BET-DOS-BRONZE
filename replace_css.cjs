const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Substituir variaveis no CSS
code = code.replace(/emerald-950/g, 'zinc-950');
code = code.replace(/emerald-900/g, 'zinc-900');
code = code.replace(/emerald-800/g, 'zinc-800');
code = code.replace(/emerald-700/g, 'zinc-700');

// Mudar dourado (gold) para verde (emerald)
// scrollbar
code = code.replace(/rgba\(223, 177, 91/g, 'rgba(52, 211, 153');

fs.writeFileSync('src/index.css', code);
