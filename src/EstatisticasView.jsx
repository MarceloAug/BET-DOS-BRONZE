import { useState } from 'react';
import { Target, History, Star, Medal } from 'lucide-react';

export default function EstatisticasView({ leaderboard, podioImg, avatars }) {
  const [selectedPlayer, setSelectedPlayer] = useState(leaderboard[0]?.id || null);

  const playerStats = leaderboard.find(p => p.id === selectedPlayer);
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.pontos - a.pontos);
  
  // Podium mapping (top 3)
  const top3 = sortedLeaderboard.slice(0, 3);
  
  if (!playerStats) return null;

  const getAproveitamento = () => {
    if (playerStats.palpitesFeitos === 0) return 0;
    const acertos = playerStats.exatos + playerStats.diferenca + playerStats.vencedores + (playerStats.penaltis || 0);
    return Math.round((acertos / playerStats.palpitesFeitos) * 100);
  };

  return (
    <div className="flex flex-col gap-8 pb-10 animate-in fade-in zoom-in duration-500">
      
      {/* PODIUM SECTION */}
      <div className="bg-zinc-900/40 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center mt-4">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none" />
        
        <h2 className="text-2xl font-title font-bold text-yellow-400 mb-6 flex items-center gap-2 drop-shadow-lg">
          <Medal className="text-yellow-500" />
          PÓDIO DOS CAMPEÕES
        </h2>
        
        <div className="relative w-full max-w-lg mx-auto flex items-end justify-center h-64 md:h-72">
          {/* We will map the podio image here and place avatars absolutely */}
          <img src={podioImg} alt="Pódio" className="absolute bottom-0 w-full object-contain h-[70%]" />
          
          {/* Top 3 Avatars placed over the podium image */}
          {top3[1] && (
            <div className="absolute bottom-[55%] left-[15%] md:left-[20%] flex flex-col items-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100">
              <img src={avatars[top3[1].nome] || avatars['Visitante']} className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-300 shadow-xl object-cover" />
              <div className="mt-1 bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">{top3[1].nome}</div>
              <div className="text-slate-300 font-black text-sm drop-shadow-md">{top3[1].pontos} pts</div>
            </div>
          )}
          
          {top3[0] && (
            <div className="absolute bottom-[70%] left-[50%] -translate-x-1/2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-10 duration-700 z-10">
              <img src={avatars[top3[0].nome] || avatars['Visitante']} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] object-cover" />
              <div className="mt-1 bg-yellow-400 text-yellow-950 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">{top3[0].nome}</div>
              <div className="text-yellow-400 font-black text-lg drop-shadow-md">{top3[0].pontos} pts</div>
            </div>
          )}
          
          {top3[2] && (
            <div className="absolute bottom-[45%] right-[15%] md:right-[20%] flex flex-col items-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
              <img src={avatars[top3[2].nome] || avatars['Visitante']} className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-amber-600 shadow-xl object-cover" />
              <div className="mt-1 bg-amber-700 text-amber-50 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">{top3[2].nome}</div>
              <div className="text-amber-500 font-black text-xs drop-shadow-md">{top3[2].pontos} pts</div>
            </div>
          )}
        </div>
      </div>

      {/* PLAYER SELECTOR */}
      <div>
        <h3 className="text-lg font-title text-slate-300 mb-3 ml-2 flex items-center gap-2">
          <History size={18} className="text-emerald-400" />
          Estatísticas Individuais
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {sortedLeaderboard.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p.id)}
              className={"snap-center flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all " + (
                selectedPlayer === p.id 
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100 scale-105" 
                  : "bg-zinc-900/40 border-white/5 text-slate-400 hover:bg-zinc-800"
              )}
            >
              <img src={avatars[p.nome] || avatars['Visitante']} className="w-8 h-8 rounded-full border border-white/10" />
              <span className="font-bold text-sm whitespace-nowrap">{p.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400 font-medium mb-1 text-center">Total de Pontos</span>
          <span className="text-3xl font-black text-emerald-400 font-title">{playerStats.pontos}</span>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400 font-medium mb-1 text-center">Aproveitamento</span>
          <span className="text-3xl font-black text-sky-400 font-title">{getAproveitamento()}%</span>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400 font-medium mb-1 text-center">Acertos Exatos</span>
          <span className="text-3xl font-black text-yellow-400 font-title">{playerStats.exatos}</span>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400 font-medium mb-1 text-center">Acertos Simples</span>
          <span className="text-3xl font-black text-slate-200 font-title">{playerStats.diferenca + playerStats.vencedores + (playerStats.penaltis || 0)}</span>
        </div>
      </div>

      {/* MATCH HISTORY TIMELINE */}
      <div className="bg-zinc-900/10 border border-white/5 rounded-3xl p-5 md:p-6 shadow-xl">
        <h3 className="font-title text-base font-bold mb-6 flex items-center gap-2 text-slate-100">
          <Target size={18} className="text-emerald-400" />
          Histórico de Palpites
        </h3>
        
        {playerStats.historico && playerStats.historico.length > 0 ? (
          <div className="space-y-4">
            {playerStats.historico.sort((a,b) => new Date(b.jogo.data_hora) - new Date(a.jogo.data_hora)).map((h, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
                {/* Match Info */}
                <div className="flex-1 w-full flex items-center justify-between md:justify-start md:gap-8 relative">
                   <div className="absolute top-0 right-0 text-[8px] bg-white/10 px-1.5 rounded-sm text-slate-400">
                     {h.jogo.rodada}
                   </div>
                  <div className="flex flex-col items-center gap-1 w-1/3 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{h.jogo.time_a}</span>
                    <span className="font-black text-xl text-slate-200">{h.jogo.gols_a}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 w-1/3 text-center mt-2">X</div>
                  <div className="flex flex-col items-center gap-1 w-1/3 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{h.jogo.time_b}</span>
                    <span className="font-black text-xl text-slate-200">{h.jogo.gols_b}</span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-px h-10 bg-white/10" />
                <div className="md:hidden h-px w-full bg-white/5 my-1" />

                {/* Palpite Info */}
                <div className="flex-1 w-full flex items-center justify-between md:justify-center md:gap-4 relative">
                  <div className="text-[10px] text-slate-400 absolute -top-2 md:-top-4 left-1/2 -translate-x-1/2">Palpite</div>
                  <span className="font-black text-lg text-emerald-100/70">{h.palpite.gols_a}</span>
                  <div className="text-[10px] font-bold text-slate-600">x</div>
                  <span className="font-black text-lg text-emerald-100/70">{h.palpite.gols_b}</span>
                </div>

                {/* Points Earned */}
                <div className="w-full md:w-20 flex justify-center md:justify-end">
                  <div className={"px-3 py-1.5 rounded-xl font-bold text-sm border flex items-center gap-1 " + (
                    h.pontos >= 3 ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" :
                    h.pontos === 2 ? "bg-lime-500/10 text-lime-400 border-lime-500/20" :
                    h.pontos === 1 ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" :
                    "bg-white/5 text-slate-500 border-white/5"
                  )}>
                    {h.pontos > 0 ? '+' : ''}{h.pontos}
                    <Star size={12} className={h.pontos > 0 ? "opacity-100" : "opacity-0"} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-8 text-sm bg-black/20 rounded-2xl border border-white/5">
            Nenhum palpite finalizado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
