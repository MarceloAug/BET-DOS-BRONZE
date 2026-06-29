const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 5. Leaderboard point calc
const pointCalcRegex = /\/\/\s*Empate, mas placar incorreto\s*map\[p\.participante_id\]\.pontos \+= 1;\s*map\[p\.participante_id\]\.vencedores \+= 1; \/\/ Podemos considerar como acerto simples na contagem\s*\}\s*\}\s*\}/;
const pointCalcReplacement = `                // Empate, mas placar incorreto
                map[p.participante_id].pontos += 1;
                map[p.participante_id].vencedores += 1; // Podemos considerar como acerto simples na contagem
              }
            }
          }

          // Mata-Mata Penaltis Bonus
          if (palpiteA !== null && palpiteB !== null) {
            const realDiff = realA - realB;
            const palpiteDiff = palpiteA - palpiteB;
            const realHadPens = (realDiff === 0 && jogo.penaltis_vencedor);
            const userGuessedPens = (palpiteDiff === 0 && p.penaltis_vencedor);
            
            if (realHadPens) {
              const realAdvancing = jogo.penaltis_vencedor; // 'A' ou 'B'
              if (userGuessedPens) {
                if (p.penaltis_vencedor === realAdvancing) {
                  map[p.participante_id].pontos += 1;
                  map[p.participante_id].penaltis = (map[p.participante_id].penaltis || 0) + 1;
                }
              } else {
                const userAdvancing = palpiteDiff > 0 ? 'A' : (palpiteDiff < 0 ? 'B' : null);
                if (userAdvancing === realAdvancing) {
                  map[p.participante_id].pontos += 1;
                  map[p.participante_id].vencedores += 1;
                }
              }
            }
          }`;
code = code.replace(pointCalcRegex, pointCalcReplacement);

// Palpite Edit (User) UI
code = code.replace(
    /const displayB = draft\?\.gols_b !== undefined \? draft\.gols_b : \(palpite\?\.gols_b !== null \? palpite\?\.gols_b : ''\);/,
    "const displayB = draft?.gols_b !== undefined ? draft.gols_b : (palpite?.gols_b !== null ? palpite?.gols_b : '');\n                            const displayPens = draft?.penaltis_vencedor !== undefined ? draft.penaltis_vencedor : (palpite?.penaltis_vencedor || null);"
);

code = code.replace(
    /onClick=\{\(e\) => handleEditPalpite\(jogo\.id, friend\.id, palpite\?\.gols_a, palpite\?\.gols_b\)\}/,
    "onClick={(e) => handleEditPalpite(jogo.id, friend.id, palpite?.gols_a, palpite?.gols_b, palpite?.penaltis_vencedor)}"
);

// User inputs block
const userInputsRegex = /onChange=\{\(e\) => handleDraftChange\(jogo\.id, friend\.id, 'gols_b', e\.target\.value\)\}\s*\/>\s*(<button[\s\S]*?<\/button>)\s*(\{palpite && \([\s\S]*?<\/div>\s*\)\})\s*<\/div>/;

const userInputsReplacement = `onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_b', e.target.value)}
                                      />
                                      $1
                                      $2
                                    </div>
                                    
                                    {isDrafting && displayA !== '' && displayB !== '' && displayA == displayB && !jogo.rodada.includes('Rodada') && (
                                      <div className="flex flex-col items-center mt-2 pb-1 gap-1">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Vence nos Pênaltis</span>
                                        <div className="flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'A')}
                                            className={\`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors \${displayPens === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}\`}
                                          >
                                            {jogo.time_a}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'B')}
                                            className={\`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors \${displayPens === 'B' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}\`}
                                          >
                                            {jogo.time_b}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    </div>`;
code = code.replace(userInputsRegex, (match, p1, p2) => {
    return `onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_b', e.target.value)}
                                      />
                                      ${p1}
                                      ${p2}
                                    </div>
                                    
                                    {isDrafting && displayA !== '' && displayB !== '' && displayA == displayB && !jogo.rodada.includes('Rodada') && (
                                      <div className="flex flex-col items-center mt-2 pb-1 gap-1 w-full">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Vence nos Pênaltis</span>
                                        <div className="flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'A')}
                                            className={\`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors \${displayPens === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}\`}
                                          >
                                            {jogo.time_a}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'B')}
                                            className={\`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors \${displayPens === 'B' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}\`}
                                          >
                                            {jogo.time_b}
                                          </button>
                                        </div>
                                      </div>
                                    )}`;
});

code = code.replace(
    /isDrafting \? \(\s*<div className="flex items-center justify-center gap-1.5 shrink-0">/,
    `isDrafting ? (
                                    <div className="flex flex-col gap-1 items-center justify-center shrink-0 w-full">
                                      <div className="flex items-center justify-center gap-1.5 shrink-0">`
);

// Badge logic
const badgeRegex = /let ptsBadge = null;\s*if \(isFinished && palpite && palpite\.gols_a !== null && palpite\.gols_b !== null\) \{/;
const badgeReplacement = `let ptsBadge = null;
                            let pensBadge = null;
                            if (isFinished && palpite && palpite.gols_a !== null && palpite.gols_b !== null) {
                              if (palpite.gols_a === palpite.gols_b && palpite.penaltis_vencedor && !jogo.rodada.includes('Rodada')) {
                                const realAdvancing = jogo.gols_a === jogo.gols_b ? jogo.penaltis_vencedor : null;
                                const isCorrectPen = realAdvancing === palpite.penaltis_vencedor;
                                pensBadge = (
                                  <div className={\`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-md z-10 border \${isCorrectPen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}\`}>
                                    {palpite.penaltis_vencedor === 'A' ? jogo.time_a.substring(0,3) : jogo.time_b.substring(0,3)} (P)
                                  </div>
                                );
                              }`;
code = code.replace(badgeRegex, badgeReplacement);

const ptsBadgeRenderRegex = /<div className="flex items-center justify-center shrink-0">\s*<div className="font-title text-xs font-bold bg-black\/40 px-2\.5 py-1 rounded-md border border-white\/\[0\.03\] text-slate-200">\s*\{palpite \? `\$\{palpite\.gols_a\} x \$\{palpite\.gols_b\}` : '- x -'\}\s*<\/div>\s*\{ptsBadge\}\s*<\/div>/;
const ptsBadgeRenderReplacement = `<div className="flex items-center justify-center shrink-0 relative">
                                    {pensBadge}
                                    <div className="font-title text-xs font-bold bg-black/40 px-2.5 py-1 rounded-md border border-white/[0.03] text-slate-200">
                                      {palpite ? \`\${palpite.gols_a} x \${palpite.gols_b}\` : '- x -'}
                                    </div>
                                    {ptsBadge}
                                  </div>`;
code = code.replace(ptsBadgeRenderRegex, ptsBadgeRenderReplacement);

// Admin UI
const adminScoreRegex = /onChange=\{\(e\) => handleSaveRealScore\(jogo\.id, golsRealA !== null \? golsRealA : '', e\.target\.value\)\}\s*\/>\s*<\/?>\s*\) : \(/;
const adminScoreReplacement = `onChange={(e) => handleSaveRealScore(jogo.id, golsRealA !== null ? golsRealA : '', e.target.value, jogo.penaltis_vencedor)}
                                  />
                                  
                                  {golsRealA !== null && golsRealB !== null && golsRealA == golsRealB && !jogo.rodada.includes('Rodada') && (
                                    <div className="w-full flex flex-col gap-1 mt-2 items-center">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Vencedor nos Pênaltis</span>
                                      <div className="flex gap-2">
                                        <button 
                                          type="button"
                                          onClick={() => handleSaveRealScore(jogo.id, golsRealA, golsRealB, 'A')}
                                          className={\`px-3 py-1 rounded-full text-xs font-bold border transition-colors \${jogo.penaltis_vencedor === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/10'}\`}
                                        >
                                          {jogo.time_a}
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => handleSaveRealScore(jogo.id, golsRealA, golsRealB, 'B')}
                                          className={\`px-3 py-1 rounded-full text-xs font-bold border transition-colors \${jogo.penaltis_vencedor === 'B' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/10'}\`}
                                        >
                                          {jogo.time_b}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                </>
                              ) : (`;
code = code.replace(adminScoreRegex, adminScoreReplacement);

const adminFinalizeRegex = /showToast\('Preencha um placar válido antes de finalizar\.', 'error'\);\s*return;\s*\}/;
const adminFinalizeReplacement = `showToast('Preencha um placar válido antes de finalizar.', 'error');
      return;
    }
    
    if (isFinished && jogo.gols_a === jogo.gols_b && !jogo.rodada.includes('Rodada') && !jogo.penaltis_vencedor) {
      showToast('Selecione o vencedor dos pênaltis antes de finalizar.', 'error');
      return;
    }`;
code = code.replace(adminFinalizeRegex, adminFinalizeReplacement);

fs.writeFileSync('src/App.jsx', code);
