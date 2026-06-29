import sys
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update handleConfirmPalpite
code = code.replace(
    "let golsA = draft.gols_a !== undefined ? draft.gols_a : (existing ? existing.gols_a : '');\n    let golsB = draft.gols_b !== undefined ? draft.gols_b : (existing ? existing.gols_b : '');",
    """let golsA = draft.gols_a !== undefined ? draft.gols_a : (existing ? existing.gols_a : '');
    let golsB = draft.gols_b !== undefined ? draft.gols_b : (existing ? existing.gols_b : '');
    const jogo = jogos.find(j => j.id === jogoId);
    let penaltisVencedor = draft.penaltis_vencedor !== undefined ? draft.penaltis_vencedor : (existing ? existing.penaltis_vencedor : null);
    if (golsA !== golsB || !jogo || jogo.rodada.includes('Rodada')) {
      penaltisVencedor = null;
    }"""
)

code = code.replace(
    """const palpiteData = {
      jogo_id: jogoId,
      participante_id: participanteId,
      gols_a: golsA === '' ? null : parseInt(golsA, 10),
      gols_b: golsB === '' ? null : parseInt(golsB, 10)
    };""",
    """const palpiteData = {
      jogo_id: jogoId,
      participante_id: participanteId,
      gols_a: golsA === '' ? null : parseInt(golsA, 10),
      gols_b: golsB === '' ? null : parseInt(golsB, 10),
      penaltis_vencedor: penaltisVencedor
    };"""
)

# 2. Update handleEditPalpite
code = code.replace(
    "const handleEditPalpite = (jogoId, participanteId, golsA, golsB) => {",
    "const handleEditPalpite = (jogoId, participanteId, golsA, golsB, penaltisVencedor) => {"
)
code = code.replace(
    "[key]: { gols_a: golsA !== null ? golsA : '', gols_b: golsB !== null ? golsB : '' }",
    "[key]: { gols_a: golsA !== null ? golsA : '', gols_b: golsB !== null ? golsB : '', penaltis_vencedor: penaltisVencedor || null }"
)

# 3. Update handleSaveRealScore
code = code.replace(
    "const handleSaveRealScore = async (jogoId, golsA, golsB) => {",
    "const handleSaveRealScore = async (jogoId, golsA, golsB, penaltisVencedor = null) => {"
)
code = code.replace(
    """const parsedA = golsA === '' ? null : parseInt(golsA);
    const parsedB = golsB === '' ? null : parseInt(golsB);

    // OPTIMISTIC UPDATE LOCAL: Atualiza instantaneamente os gols
    setJogos(prev => prev.map(j => 
      j.id === jogoId ? { ...j, gols_a: parsedA, gols_b: parsedB } : j
    ));""",
    """const parsedA = golsA === '' ? null : parseInt(golsA);
    const parsedB = golsB === '' ? null : parseInt(golsB);
    let finalPenaltis = penaltisVencedor;
    if (parsedA !== parsedB) finalPenaltis = null;

    // OPTIMISTIC UPDATE LOCAL: Atualiza instantaneamente os gols
    setJogos(prev => prev.map(j => 
      j.id === jogoId ? { ...j, gols_a: parsedA, gols_b: parsedB, penaltis_vencedor: finalPenaltis } : j
    ));"""
)
code = code.replace(
    ".update({ gols_a: parsedA, gols_b: parsedB })",
    ".update({ gols_a: parsedA, gols_b: parsedB, penaltis_vencedor: finalPenaltis })"
)

# 4. Init Leaderboard `penaltis`
code = code.replace(
    "pontos: 0, exatos: 0, diferenca: 0, vencedores: 0, ultimoPalpite: null, palpitesFeitos: 0",
    "pontos: 0, exatos: 0, diferenca: 0, vencedores: 0, penaltis: 0, ultimoPalpite: null, palpitesFeitos: 0"
)

# 5. Leaderboard point calc
target_block = """                // Empate, mas placar incorreto
                map[p.participante_id].pontos += 1;
                map[p.participante_id].vencedores += 1; // Podemos considerar como acerto simples na contagem
              }
            }
          }"""
replacement_block = """                // Empate, mas placar incorreto
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
          }"""
code = code.replace(target_block, replacement_block)

# 6. Leaderboard Card Stats
code = code.replace(
    "{part.diferenca} dif. | {part.vencedores} venc.",
    "{part.diferenca} dif. | {part.vencedores} venc. | {part.penaltis || 0} pên."
)

# 7. Palpite Edit (User) UI
code = code.replace(
    "const displayB = draft?.gols_b !== undefined ? draft.gols_b : (palpite?.gols_b !== null ? palpite?.gols_b : '');",
    "const displayB = draft?.gols_b !== undefined ? draft.gols_b : (palpite?.gols_b !== null ? palpite?.gols_b : '');\n                            const displayPens = draft?.penaltis_vencedor !== undefined ? draft.penaltis_vencedor : (palpite?.penaltis_vencedor || null);"
)

code = code.replace(
    "onClick={(e) => handleEditPalpite(jogo.id, friend.id, palpite?.gols_a, palpite?.gols_b)}",
    "onClick={(e) => handleEditPalpite(jogo.id, friend.id, palpite?.gols_a, palpite?.gols_b, palpite?.penaltis_vencedor)}"
)

# Add Penaltis UI below user score inputs
user_inputs_block = """                                        onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_b', e.target.value)}
                                      />
                                    </div>
                                  ) : ("""
user_inputs_replacement = """                                        onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_b', e.target.value)}
                                      />
                                    </div>
                                    
                                    {isDrafting && displayA !== '' && displayB !== '' && displayA == displayB && !jogo.rodada.includes('Rodada') && (
                                      <div className="flex flex-col items-center mt-2 pb-1 gap-1">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Vence nos Pênaltis</span>
                                        <div className="flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'A')}
                                            className={`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors ${displayPens === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}`}
                                          >
                                            {jogo.time_a}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => handleDraftChange(jogo.id, friend.id, 'penaltis_vencedor', 'B')}
                                            className={`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors ${displayPens === 'B' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:bg-white/5'}`}
                                          >
                                            {jogo.time_b}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                  ) : ("""
code = code.replace(user_inputs_block, user_inputs_replacement)

# Palpite Result Card display penalty badge
badge_block = """let ptsBadge = null;
                            if (isFinished && palpite) {"""
badge_replacement = """let ptsBadge = null;
                            let pensBadge = null;
                            if (isFinished && palpite) {
                              if (palpite.gols_a === palpite.gols_b && palpite.penaltis_vencedor && !jogo.rodada.includes('Rodada')) {
                                const realAdvancing = jogo.gols_a === jogo.gols_b ? jogo.penaltis_vencedor : null;
                                const isCorrectPen = realAdvancing === palpite.penaltis_vencedor;
                                pensBadge = (
                                  <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-md z-10 border ${isCorrectPen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                    {palpite.penaltis_vencedor === 'A' ? jogo.time_a.substring(0,3) : jogo.time_b.substring(0,3)} (P)
                                  </div>
                                );
                              }"""
code = code.replace(badge_block, badge_replacement)

pts_badge_render_block = """{ptsBadge && (
                                      <div className="absolute -top-2 -right-2 z-10">
                                        {ptsBadge}
                                      </div>
                                    )}
                                    <div className={`flex items-center justify-center gap-1.5 shrink-0 px-2 py-1 md:py-1.5 rounded-lg border bg-black/40 ${isFinished ? (isExact ? 'border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : (isDiff || (realWinner === palpiteWinner && realWinner !== 0) || (realWinner === 0 && palpiteWinner === 0) ? 'border-emerald-400/30' : 'border-red-500/20 opacity-50')) : 'border-white/10'}`}>"""
pts_badge_render_replacement = """{pensBadge}
                                    {ptsBadge && (
                                      <div className="absolute -top-2 -right-2 z-10">
                                        {ptsBadge}
                                      </div>
                                    )}
                                    <div className={`flex items-center justify-center gap-1.5 shrink-0 px-2 py-1 md:py-1.5 rounded-lg border bg-black/40 ${isFinished ? (isExact ? 'border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : (isDiff || (realWinner === palpiteWinner && realWinner !== 0) || (realWinner === 0 && palpiteWinner === 0) || (jogo.gols_a === jogo.gols_b && palpite.gols_a !== palpite.gols_b && (palpite.gols_a > palpite.gols_b ? 'A' : 'B') === jogo.penaltis_vencedor) ? 'border-emerald-400/30' : 'border-red-500/20 opacity-50')) : 'border-white/10'}`}>"""
code = code.replace(pts_badge_render_block, pts_badge_render_replacement)

# 8. Admin UI
admin_score_block = """onChange={(e) => handleSaveRealScore(jogo.id, golsRealA !== null ? golsRealA : '', e.target.value)}
                                  />
                                </>
                              ) : ("""
admin_score_replacement = """onChange={(e) => handleSaveRealScore(jogo.id, golsRealA !== null ? golsRealA : '', e.target.value, jogo.penaltis_vencedor)}
                                  />
                                  
                                  {golsRealA !== null && golsRealB !== null && golsRealA == golsRealB && !jogo.rodada.includes('Rodada') && (
                                    <div className="w-full flex flex-col gap-1 mt-2 items-center">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Vencedor nos Pênaltis</span>
                                      <div className="flex gap-2">
                                        <button 
                                          type="button"
                                          onClick={() => handleSaveRealScore(jogo.id, golsRealA, golsRealB, 'A')}
                                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${jogo.penaltis_vencedor === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/10'}`}
                                        >
                                          {jogo.time_a}
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => handleSaveRealScore(jogo.id, golsRealA, golsRealB, 'B')}
                                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${jogo.penaltis_vencedor === 'B' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-black/30 text-slate-400 border-white/10'}`}
                                        >
                                          {jogo.time_b}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                </>
                              ) : ("""
code = code.replace(admin_score_block, admin_score_replacement)

admin_finalize_block = """if (isFinished && (
      jogo.gols_a === null || 
      jogo.gols_b === null || 
      jogo.gols_a === '' || 
      jogo.gols_b === '' || 
      isNaN(jogo.gols_a) || 
      isNaN(jogo.gols_b)
    )) {
      showToast('Preencha um placar válido antes de finalizar.', 'error');
      return;
    }"""
admin_finalize_replacement = """if (isFinished && (
      jogo.gols_a === null || 
      jogo.gols_b === null || 
      jogo.gols_a === '' || 
      jogo.gols_b === '' || 
      isNaN(jogo.gols_a) || 
      isNaN(jogo.gols_b)
    )) {
      showToast('Preencha um placar válido antes de finalizar.', 'error');
      return;
    }
    
    if (isFinished && jogo.gols_a === jogo.gols_b && !jogo.rodada.includes('Rodada') && !jogo.penaltis_vencedor) {
      showToast('Selecione o vencedor dos pênaltis antes de finalizar.', 'error');
      return;
    }"""
code = code.replace(admin_finalize_block, admin_finalize_replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
