const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Mudar fundo verde escuro para cinza escuro (zinc)
code = code.replace(/emerald-900/g, 'zinc-900');
code = code.replace(/emerald-950/g, 'zinc-950');

// 2. Mudar o dourado para verde claro (emerald-400)
code = code.replace(/gold-500/g, 'emerald-400');
code = code.replace(/gold-400/g, 'emerald-300');
code = code.replace(/gold-600/g, 'emerald-500');

// 3. Mudar o verde antigo (que era do Finalizado) para cinza/azul para contrastar
// Onde tiver 'border-l-emerald-500' (card finalizado) -> border-l-zinc-600
code = code.replace(/border-l-emerald-500/g, 'border-l-zinc-600');
// Badges de 'Finalizado' (bg-emerald-500/15 text-emerald-400 border-emerald-500/25) -> bg-zinc-500/15 text-zinc-400 border-zinc-500/25
code = code.replace(/bg-emerald-500\/15 text-emerald-400 border-emerald-500\/25/g, 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25');
// Toast de sucesso (emerald-950)
code = code.replace(/bg-emerald-950\/95/g, 'bg-zinc-950/95');

// Badge de +3 pontos (deixa verde, mas ajusta a cor pra bater com o novo padrao)
// Estava: bg-emerald-500/10 text-emerald-400 border-emerald-500/20
// Pode continuar assim, pois ja eh verde. 

fs.writeFileSync('src/App.jsx', code);
