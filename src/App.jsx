import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Swords, 
  Calendar, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Settings, 
  Info,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  Edit2,
  X
} from 'lucide-react';
import jogosSeedData from './jogosSeed.json';

import imgAlexandra from './assets/Alexandra.png';
import imgKeven from './assets/Keven.png';
import imgLucas from './assets/Lucas.png';
import imgMarcelo from './assets/Marcelo.png';
import imgMarlon from './assets/Marlon.png';
import imgThaina from './assets/Thaina.png';
import logoImg from './assets/logo.png';

const avatars = {
  'Marcelo': imgMarcelo,
  'Lucas': imgLucas,
  'Alexandra': imgAlexandra,
  'Thainá': imgThaina,
  'Keven': imgKeven,
  'Marlon': imgMarlon
};

function App() {
  const [participantes, setParticipantes] = useState([]);
  const [jogos, setJogos] = useState([]);
  const [palpites, setPalpites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Regras
  const [showRules, setShowRules] = useState(false);

  // Filtros
  const [selectedRound, setSelectedRound] = useState('');
  const [rounds, setRounds] = useState([]);

  // Toast de Feedback
  const [toast, setToast] = useState({ message: '', type: null });

  // Rascunho de palpites
  const [draftPalpites, setDraftPalpites] = useState({});
  const [editingPalpites, setEditingPalpites] = useState(new Set());

  // Modal de Imagem
  const [selectedImage, setSelectedImage] = useState(null);

  // Formulário de Novo Jogo (Mata-mata)
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newJogo, setNewJogo] = useState({
    rodada: 'Oitavas de Final',
    data_hora: '2026-06-28T18:00:00',
    time_a: '',
    time_b: '',
    flag_a: '',
    flag_b: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar Participantes
      const { data: partData, error: partErr } = await supabase
        .from('participantes')
        .select('*')
        .order('id', { ascending: true });
      if (partErr) throw partErr;
      setParticipantes(partData || []);

      // 2. Buscar Jogos
      const { data: jogosData, error: jogosErr } = await supabase
        .from('jogos')
        .select('*')
        .order('data_hora', { ascending: true });
      if (jogosErr) throw jogosErr;
      setJogos(jogosData || []);

      if (jogosData && jogosData.length > 0) {
        const uniqueRounds = [...new Set(jogosData.map(j => j.rodada))];
        setRounds(uniqueRounds);
        setSelectedRound(prev => prev || uniqueRounds[0]);
      }

      // 3. Buscar Palpites
      const { data: palpitesData, error: palpitesErr } = await supabase
        .from('palpites')
        .select('*');
      if (palpitesErr) throw palpitesErr;
      setPalpites(palpitesData || []);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      showToast('Erro ao sincronizar com o banco de dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Escuta de mudanças em tempo real no Supabase
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'palpites' }, () => {
        refreshPalpitesOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, () => {
        refreshJogosOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshPalpitesOnly = async () => {
    const { data } = await supabase.from('palpites').select('*');
    if (data) setPalpites(data);
  };

  // Garante que a aba selecionada seja válida após a mudança de jogos (ex: se todos encerrarem em uma rodada)
  useEffect(() => {
    if (jogos.length === 0 || rounds.length === 0) return;
    const hasEmAndamento = jogos.some(j => !j.encerrado && j.flag_a && j.flag_a.includes('_LOCKED'));
    const activeRounds = rounds.filter(r => jogos.some(j => j.rodada === r && !j.encerrado && !(j.flag_a && j.flag_a.includes('_LOCKED'))));
    const hasEncerradas = jogos.some(j => j.encerrado);
    const validTabs = [...activeRounds, hasEmAndamento ? 'Em Andamento' : null, hasEncerradas ? 'Encerradas' : null].filter(Boolean);
    
    if (validTabs.length > 0 && (!selectedRound || !validTabs.includes(selectedRound))) {
      setSelectedRound(validTabs[0]);
    }
  }, [jogos, rounds, selectedRound]);

  const refreshJogosOnly = async () => {
    const { data } = await supabase.from('jogos').select('*').order('data_hora', { ascending: true });
    if (data) {
      setJogos(data);
      const uniqueRounds = [...new Set(data.map(j => j.rodada))];
      setRounds(uniqueRounds);
    }
  };

  // Salvar/Editar Palpite (Fluxo de Confirmação)
  const handleDraftChange = (jogoId, participanteId, field, value) => {
    const key = `${jogoId}-${participanteId}`;
    setDraftPalpites(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleConfirmPalpite = async (jogoId, participanteId) => {
    const key = `${jogoId}-${participanteId}`;
    const draft = draftPalpites[key] || {};
    const existing = palpites.find(p => p.jogo_id === jogoId && p.participante_id === participanteId);
    
    let golsA = draft.gols_a !== undefined ? draft.gols_a : (existing ? existing.gols_a : '');
    let golsB = draft.gols_b !== undefined ? draft.gols_b : (existing ? existing.gols_b : '');

    const parsedA = golsA === '' ? null : parseInt(golsA);
    const parsedB = golsB === '' ? null : parseInt(golsB);

    if (parsedA === null || parsedB === null || isNaN(parsedA) || isNaN(parsedB)) {
      showToast('Preencha os dois campos do palpite!', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('palpites')
        .upsert(
          { jogo_id: jogoId, participante_id: participanteId, gols_a: parsedA, gols_b: parsedB }, 
          { onConflict: 'jogo_id, participante_id' }
        );

      if (error) throw error;
      
      setPalpites(prev => {
        const filtered = prev.filter(p => !(p.jogo_id === jogoId && p.participante_id === participanteId));
        return [...filtered, { jogo_id: jogoId, participante_id: participanteId, gols_a: parsedA, gols_b: parsedB }];
      });
      
      setEditingPalpites(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setDraftPalpites(prev => {
        const next = {...prev};
        delete next[key];
        return next;
      });
      showToast('Palpite salvo com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar palpite.', 'error');
    }
  };

  const handleEditPalpite = (jogoId, participanteId, golsA, golsB) => {
    const key = `${jogoId}-${participanteId}`;
    setDraftPalpites(prev => ({
      ...prev,
      [key]: { gols_a: golsA !== null ? golsA : '', gols_b: golsB !== null ? golsB : '' }
    }));
    setEditingPalpites(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleCancelEdit = (jogoId, participanteId) => {
    const key = `${jogoId}-${participanteId}`;
    setEditingPalpites(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDraftPalpites(prev => {
      const next = {...prev};
      delete next[key];
      return next;
    });
  };

  // Salvar Placar Real (apenas gols, não finaliza a partida)
  const handleSaveRealScore = async (jogoId, golsA, golsB) => {
    const parsedA = golsA === '' ? null : parseInt(golsA);
    const parsedB = golsB === '' ? null : parseInt(golsB);

    // OPTIMISTIC UPDATE LOCAL: Atualiza instantaneamente os gols
    setJogos(prev => prev.map(j => 
      j.id === jogoId ? { ...j, gols_a: parsedA, gols_b: parsedB } : j
    ));

    try {
      const { error } = await supabase
        .from('jogos')
        .update({ gols_a: parsedA, gols_b: parsedB })
        .eq('id', jogoId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar placar real.', 'error');
    }
  };

  const handleLockMatch = async (e, jogo) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isLocked = jogo.flag_a && jogo.flag_a.includes('_LOCKED');
    
    const senha = window.prompt(`Digite a senha para ${isLocked ? 'destravar' : 'travar'} as apostas:`);
    if (senha !== 'bronze2026') {
      showToast('Senha incorreta! Ação bloqueada.', 'error');
      return;
    }

    const newFlagA = isLocked ? jogo.flag_a.replace('_LOCKED', '') : `${jogo.flag_a}_LOCKED`;

    setJogos(prev => prev.map(j => j.id === jogo.id ? { ...j, flag_a: newFlagA } : j));
    
    try {
      const { error } = await supabase.from('jogos').update({ flag_a: newFlagA }).eq('id', jogo.id);
      if (error) throw error;
      showToast(isLocked ? 'Apostas liberadas!' : 'Apostas travadas (Em Andamento).');
    } catch (err) {
      console.error(err);
      showToast('Erro ao travar a partida.', 'error');
    }
  };

  // Travar / Destravar partida (Finalizar)
  const handleToggleMatchStatus = async (e, jogoId, isFinished) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validar se tem placar antes de finalizar
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    if (isFinished && (
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

    setJogos(prev => prev.map(j => j.id === jogoId ? { ...j, encerrado: isFinished } : j));
    
    try {
      const { error } = await supabase.from('jogos').update({ encerrado: isFinished }).eq('id', jogoId);
      if (error) throw error;
      showToast(isFinished ? 'Partida finalizada com sucesso!' : 'Partida reaberta para edição.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao alterar status da partida.', 'error');
    }
  };

  // Adicionar Novo Jogo (Mata-mata)
  const handleAddGame = async (e) => {
    e.preventDefault();

    if (!newJogo.time_a || !newJogo.time_b || !newJogo.flag_a || !newJogo.flag_b) {
      showToast('Por favor, preencha todos os campos do jogo.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('jogos')
        .insert([{
          rodada: newJogo.rodada,
          data_hora: new Date(newJogo.data_hora).toISOString(),
          time_a: newJogo.time_a,
          time_b: newJogo.time_b,
          flag_a: newJogo.flag_a.toLowerCase().trim(),
          flag_b: newJogo.flag_b.toLowerCase().trim()
        }]);

      if (error) throw error;

      showToast('Partida adicionada com sucesso!');
      setShowAdminForm(false);
      setNewJogo({
        rodada: newJogo.rodada,
        data_hora: '2026-06-28T18:00:00',
        time_a: '',
        time_b: '',
        flag_a: '',
        flag_b: ''
      });
    } catch (err) {
      console.error(err);
      showToast('Erro ao adicionar partida.', 'error');
    }
  };

  // Excluir Jogo
  const handleDeleteGame = async (jogoId) => {
    if (!confirm('Deseja realmente excluir esta partida do bolão? Todos os palpites dela serão apagados.')) return;
    
    try {
      const { error } = await supabase
        .from('jogos')
        .delete()
        .eq('id', jogoId);

      if (error) throw error;
      showToast('Partida removida.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover partida.', 'error');
    }
  };

  // Inicializar Banco de Dados (Seed Inicial)
  const handleSeedDatabase = async () => {
    try {
      setLoading(true);
      
      const amigos = [
        { id: 1, nome: 'Marcelo' },
        { id: 2, nome: 'Lucas' },
        { id: 3, nome: 'Alexandra' },
        { id: 4, nome: 'Thainá' },
        { id: 5, nome: 'Keven' },
        { id: 6, nome: 'Marlon' }
      ];

      const { error: partErr } = await supabase
        .from('participantes')
        .upsert(amigos, { onConflict: 'id' });
      if (partErr) throw partErr;

      const mappedJogos = jogosSeedData.map(j => ({
        grupo: j.grupo || null,
        rodada: j.rodada,
        data_hora: j.data_hora,
        time_a: j.time_a,
        time_b: j.time_b,
        flag_a: j.flag_a,
        flag_b: j.flag_b
      }));

      // Limpar jogos anteriores se existirem antes de inserir
      await supabase.from('jogos').delete().neq('id', 0);

      const { error: jogosErr } = await supabase
        .from('jogos')
        .insert(mappedJogos);
      if (jogosErr) throw jogosErr;

      showToast('Banco de dados do bolão inicializado com sucesso!');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao popular banco de dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // CÁLCULO DA CLASSIFICAÇÃO (LEADERBOARD)
  const calculateLeaderboard = () => {
    try {
      const map = {};
      participantes.forEach(p => {
        map[p.id] = {
          id: p.id,
          nome: p.nome || 'Visitante',
          pontos: 0,
          exatos: 0,
          vencedores: 0,
          palpitesFeitos: 0
        };
      });

      palpites.forEach(p => {
        const jogo = jogos.find(j => j.id === p.jogo_id);
        if (jogo && jogo.encerrado && jogo.gols_a !== null && jogo.gols_b !== null) {
          if (!map[p.participante_id]) return;
          
          map[p.participante_id].palpitesFeitos += 1;

          const realA = jogo.gols_a;
          const realB = jogo.gols_b;
          const palpiteA = p.gols_a;
          const palpiteB = p.gols_b;

          if (realA === palpiteA && realB === palpiteB && palpiteA !== null && palpiteB !== null) {
            map[p.participante_id].pontos += 3;
            map[p.participante_id].exatos += 1;
          } 
          else if (palpiteA !== null && palpiteB !== null) {
            const realWinner = Math.sign(realA - realB);
            const palpiteWinner = Math.sign(palpiteA - palpiteB);
            
            if (realWinner === palpiteWinner) {
              map[p.participante_id].pontos += 1;
              map[p.participante_id].vencedores += 1;
            }
          }
        }
      });

      return Object.values(map).sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.exatos !== a.exatos) return b.exatos - a.exatos;
        return (a.nome || '').localeCompare(b.nome || '');
      });
    } catch (err) {
      console.error('Erro ao calcular leaderboard:', err);
      return [];
    }
  };

  const leaderboard = calculateLeaderboard();

  const calculateDisplayTabs = () => {
    if (!jogos || jogos.length === 0) return rounds;
    const hasEmAndamento = jogos.some(j => !j.encerrado && j.flag_a && j.flag_a.includes('_LOCKED'));
    const activeRounds = rounds.filter(r => jogos.some(j => j.rodada === r && !j.encerrado && !(j.flag_a && j.flag_a.includes('_LOCKED'))));
    const hasEncerradas = jogos.some(j => j.encerrado);
    return [...activeRounds, hasEmAndamento ? 'Em Andamento' : null, hasEncerradas ? 'Encerradas' : null].filter(Boolean);
  };
  const displayTabs = calculateDisplayTabs();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 min-h-screen relative">
      
      {/* Toast Notification */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-slate-200 text-sm font-semibold z-50 border transition-all ${
          toast.type === 'error' 
            ? 'border-red-500/30 bg-red-950/90 text-red-200' 
            : 'border-emerald-400/30 bg-zinc-950/95 text-emerald-300'
        }`} style={{ animation: 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="flex flex-col items-center mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center w-full max-w-3xl px-4 mb-2">
          <img 
            src={logoImg} 
            alt="BETS DO BRONZE" 
            className="w-full h-auto object-contain max-h-[200px] md:max-h-[280px] drop-shadow-[0_0_25px_rgba(184,115,51,0.15)] animate-in fade-in zoom-in duration-500 hover:scale-105 transition-transform cursor-pointer" 
          />
        </div>
        <p className="text-slate-400 text-xs md:text-base font-medium max-w-xl mb-6 mt-3">
          Onde o bronze chora e o prata é rei! Bolão dos Invocadores: Marcelo, Lucas, Alexandra, Thainá, Keven e Marlon. Façam suas apostas e evitem o demote!
        </p>
        
        {/* Barra de Controles Rápidos */}
        <div className="flex flex-wrap gap-3 items-center justify-center bg-zinc-900/20 border border-white/5 backdrop-blur-md px-5 py-2.5 rounded-3xl md:rounded-full shadow-xl w-full max-w-lg md:w-auto">
          <button 
            id="btn-rules"
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 border bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
          >
            <Info size={13} />
            Regras do Bolão
          </button>

          <button 
            id="btn-reload"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 transition-all cursor-pointer" 
            onClick={fetchData} 
            title="Recarregar dados"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </header>

      {/* Modal de Regras */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-5 flex items-center gap-2 font-title">
              <Info className="text-emerald-400" /> Regras do Bolão
            </h2>
            <div className="text-slate-300 text-sm space-y-4">
              <p>O funcionamento da pontuação é o seguinte:</p>
              <ul className="list-disc list-inside space-y-3 ml-1">
                <li><strong className="text-emerald-400">Acerto Exato (3 pontos):</strong> Você acerta o placar exato da partida. <br/><span className="text-slate-400 ml-4">Ex: Jogo 2x1, seu palpite 2x1.</span></li>
                <li><strong className="text-emerald-400">Acerto do Vencedor ou Empate (1 ponto):</strong> Você erra o placar exato, mas acerta o time vencedor ou se foi empate. <br/><span className="text-slate-400 ml-4">Ex: Jogo 2x1, seu palpite 1x0 ou 3x1.</span></li>
                <li><strong className="text-slate-500">Erro (0 pontos):</strong> Você erra o vencedor e o placar. <br/><span className="text-slate-400 ml-4">Ex: Jogo 2x1, seu palpite 1x1 ou 0x1.</span></li>
              </ul>
              <div className="pt-4 mt-2 border-t border-white/10 text-xs text-slate-400 leading-relaxed">
                <p>O <strong>Placar Real</strong> de cada partida pode ser preenchido por qualquer pessoa diretamente no card do jogo assim que ele acabar. Seja honesto e divirta-se! 🤝</p>
              </div>
            </div>
            <button 
              onClick={() => setShowRules(false)}
              className="mt-6 w-full py-3 bg-emerald-400 text-black font-bold rounded-xl hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-400/20 transition-all active:scale-95"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-emerald-400 font-title gap-3">
          <div className="w-10 h-10 border-4 border-emerald-400/10 border-l-emerald-400 rounded-full animate-spin"></div>
          <p className="text-sm">Sincronizando com a Arena Supabase...</p>
        </div>
      ) : (
        <main className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-8 items-start">
          
          {/* Coluna 1: Classificação */}
          <aside className="bg-zinc-900/10 border border-white/5 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-xl">
            <h2 className="font-title text-lg font-bold mb-4 pb-3 border-b border-white/5 flex items-center gap-2 text-slate-100">
              <Swords size={18} className="text-amber-600" />
              Ranqueada (Classificação)
            </h2>
            
            {leaderboard.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-sm">
                Nenhum participante. Use o botão de inicialização no painel administrativo.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboard.map((user, index) => {
                  const rank = index + 1;
                  
                  let rankStyles = "bg-white/[0.01] border-white/[0.02]";
                  let badgeStyles = "bg-white/10";
                  let eloName = "Unranked";
                  let eloIcon = "";
                  
                  if (rank === 1) {
                    rankStyles = "bg-sky-500/5 border-sky-500/20 shadow-md shadow-sky-500/5";
                    badgeStyles = "bg-sky-900/30";
                    eloName = "Desafiante";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/challenger.png";
                  } else if (rank === 2) {
                    rankStyles = "bg-blue-500/5 border-blue-500/10";
                    badgeStyles = "bg-blue-900/30";
                    eloName = "Diamante";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/diamond.png";
                  } else if (rank === 3) {
                    rankStyles = "bg-yellow-500/5 border-yellow-500/10";
                    badgeStyles = "bg-yellow-900/30";
                    eloName = "Ouro";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/gold.png";
                  } else if (rank === 4) {
                    rankStyles = "bg-slate-300/5 border-slate-300/10";
                    badgeStyles = "bg-slate-800/50";
                    eloName = "Prata";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/silver.png";
                  } else if (rank === 5) {
                    rankStyles = "bg-amber-800/5 border-amber-800/10";
                    badgeStyles = "bg-amber-900/40";
                    eloName = "Bronze";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/bronze.png";
                  } else {
                    rankStyles = "bg-zinc-600/5 border-zinc-600/10";
                    badgeStyles = "bg-zinc-800/50";
                    eloName = "Ferro";
                    eloIcon = "https://opgg-static.akamaized.net/images/medals_new/iron.png";
                  }

                  return (
                    <div 
                      key={user.id} 
                      className={`flex items-center p-3 border rounded-2xl transition-all duration-200 hover:translate-x-1 hover:bg-white/[0.03] ${rankStyles}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-2 shrink-0 ${badgeStyles}`} title={`${rank}º Lugar - ${eloName}`}>
                        <img src={eloIcon} alt={eloName} className="w-8 h-8 object-contain drop-shadow-lg" />
                      </div>
                      <img 
                        src={avatars[user.nome]} 
                        alt={user.nome} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700 shrink-0 mr-3 shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-110 hover:border-emerald-400 transition-all duration-300"
                        onClick={() => setSelectedImage(avatars[user.nome])}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                          <span className="truncate">{user.nome}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400">{eloName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ⚽ {user.exatos} exatos | 🏆 {user.vencedores} vencedor
                        </div>
                      </div>
                      <div className="font-title text-base font-bold text-emerald-400 flex flex-col items-end shrink-0 ml-2">
                        <span>{user.pontos}</span>
                        <span className="text-[9px] font-sans font-normal text-slate-400 -mt-1.5">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Coluna 2: Jogos e Palpites */}
          <section className="flex flex-col gap-6">
            
            {/* Navegação por Abas (Rodadas) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin border-b border-white/5">
              {displayTabs.map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border whitespace-nowrap transition-all ${
                    selectedRound === tab 
                      ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300' 
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                  }`}
                  onClick={() => setSelectedRound(tab)}
                >
                  {tab === 'Encerradas' && <span className="mr-1 opacity-70">🔒</span>}
                  {tab}
                </button>
              ))}
            </div>

            {/* Listagem dos Jogos */}
            <div className="flex flex-col gap-6">
              {jogos
                .filter(j => {
                  const isLocked = j.flag_a && j.flag_a.includes('_LOCKED');
                  if (selectedRound === 'Encerradas') return j.encerrado;
                  if (selectedRound === 'Em Andamento') return !j.encerrado && isLocked;
                  return j.rodada === selectedRound && !j.encerrado && !isLocked;
                })
                .sort((a, b) => {
                  if (a.grupo && b.grupo && a.grupo !== b.grupo) {
                    return a.grupo.localeCompare(b.grupo);
                  }
                  return new Date(a.data_hora) - new Date(b.data_hora);
                })
                .map(jogo => {
                  const golsRealA = jogo.gols_a !== null ? jogo.gols_a : '';
                  const golsRealB = jogo.gols_b !== null ? jogo.gols_b : '';
                  const isLocked = jogo.flag_a && jogo.flag_a.includes('_LOCKED');
                  const isFinished = jogo.encerrado;
                  const realFlagA = jogo.flag_a ? jogo.flag_a.replace('_LOCKED', '') : '';

                  return (
                    <div 
                      key={jogo.id} 
                      className={`bg-zinc-900/10 border border-white/5 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden border-l-4 ${
                        isFinished ? 'border-l-zinc-600' : isLocked ? 'border-l-yellow-400' : 'border-l-emerald-400'
                      }`}
                    >
                      {/* Cabeçalho do Card */}
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-1.5">
                          {jogo.grupo && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-extrabold">
                              Grupo {jogo.grupo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            isFinished 
                              ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' 
                              : isLocked
                                ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                                : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
                          }`}>
                            {isFinished ? 'Finalizado' : isLocked ? 'Em Andamento' : 'Aguardando'}
                          </span>
                          <button 
                            type="button"
                            className="text-red-400 hover:text-red-200 cursor-pointer p-0.5 transition-colors"
                            onClick={() => handleDeleteGame(jogo.id)}
                            title="Excluir partida"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Confronto Principal */}
                      <div className="flex flex-row items-center justify-between gap-2 md:gap-4 mb-6">
                        
                        {/* Time A */}
                        <div className="flex items-center justify-end gap-2 md:gap-3 flex-1 text-right">
                          <span className="hidden md:inline-block font-title text-base font-bold text-slate-100 truncate max-w-[120px] lg:max-w-none">{jogo.time_a}</span>
                          <img 
                            src={`https://flagcdn.com/w40/${realFlagA}.png`} 
                            alt={jogo.time_a} 
                            className="w-8 h-6 md:w-9 md:h-6 rounded object-cover shadow border border-white/10 shrink-0"
                            onError={(e) => { e.target.src = 'https://flagcdn.com/w40/un.png' }}
                          />
                        </div>

                        {/* Placar Real / Inputs */}
                        <div className="flex items-center justify-center gap-2.5 shrink-0 py-0">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                              Placar Real
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isFinished ? (
                                <>
                                  <div className="w-14 h-14 bg-black/50 border border-zinc-700/50 rounded-2xl flex items-center justify-center font-title text-2xl font-black text-zinc-400">
                                    {golsRealA !== null ? golsRealA : '-'}
                                  </div>
                                  <span className="text-[12px] font-bold text-slate-600 uppercase tracking-widest px-2">x</span>
                                  <div className="w-14 h-14 bg-black/50 border border-zinc-700/50 rounded-2xl flex items-center justify-center font-title text-2xl font-black text-zinc-400">
                                    {golsRealB !== null ? golsRealB : '-'}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <input 
                                    type="number" 
                                    min="0"
                                    className="w-14 h-14 bg-emerald-400/5 border border-emerald-400/30 rounded-2xl text-center font-title text-2xl font-black text-emerald-400 outline-none transition-all focus:border-emerald-400 focus:bg-emerald-400/10 hover:border-emerald-400/60"
                                    placeholder="-"
                                    value={golsRealA !== null ? golsRealA : ''}
                                    onChange={(e) => handleSaveRealScore(jogo.id, e.target.value, golsRealB !== null ? golsRealB : '')}
                                  />
                                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest px-2">x</span>
                                  <input 
                                    type="number" 
                                    min="0"
                                    className="w-14 h-14 bg-emerald-400/5 border border-emerald-400/30 rounded-2xl text-center font-title text-2xl font-black text-emerald-400 outline-none transition-all focus:border-emerald-400 focus:bg-emerald-400/10 hover:border-emerald-400/60"
                                    placeholder="-"
                                    value={golsRealB !== null ? golsRealB : ''}
                                    onChange={(e) => handleSaveRealScore(jogo.id, golsRealA !== null ? golsRealA : '', e.target.value)}
                                  />
                                </>
                              )}
                            </div>
                            
                            {/* Botões de Travar Apostas e Finalizar Jogo */}
                            {!isFinished && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                {!isLocked ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => handleLockMatch(e, jogo)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-[10px] font-bold hover:bg-yellow-500/30 transition-colors cursor-pointer"
                                  >
                                    <Lock size={10} /> Travar Apostas
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => handleLockMatch(e, jogo)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1 bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 rounded-full text-[10px] font-bold hover:bg-zinc-700 hover:text-zinc-200 transition-colors cursor-pointer"
                                  >
                                    <Unlock size={10} /> Destravar Apostas
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={(e) => handleToggleMatchStatus(e, jogo.id, true)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                                >
                                  <Check size={10} /> Finalizar Jogo
                                </button>
                              </div>
                            )}
                            {isFinished && (
                              <button 
                                type="button"
                                onClick={(e) => handleToggleMatchStatus(e, jogo.id, false)}
                                className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1 bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 rounded-full text-[10px] font-bold hover:bg-zinc-700 hover:text-zinc-200 transition-colors cursor-pointer"
                              >
                                <RefreshCw size={10} /> Reabrir Jogo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Time B */}
                        <div className="flex items-center justify-start gap-2 md:gap-3 flex-1 text-left">
                          <img 
                            src={`https://flagcdn.com/w40/${jogo.flag_b}.png`} 
                            alt={jogo.time_b} 
                            className="w-8 h-6 md:w-9 md:h-6 rounded object-cover shadow border border-white/10 shrink-0"
                            onError={(e) => { e.target.src = 'https://flagcdn.com/w40/un.png' }}
                          />
                          <span className="hidden md:inline-block font-title text-base font-bold text-slate-100 truncate max-w-[120px] lg:max-w-none">{jogo.time_b}</span>
                        </div>
                      </div>

                      {/* Palpites dos Amigos */}
                      <div className="border-t border-white/5 pt-4">
                        <div className="text-[10px] font-bold text-slate-400 mb-3">
                          <span>Palpites do Grupo</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {participantes.map(friend => {
                            const palpite = palpites.find(p => p.jogo_id === jogo.id && p.participante_id === friend.id);
                            const palpiteKey = `${jogo.id}-${friend.id}`;
                            const isDrafting = editingPalpites.has(palpiteKey) || (!palpite && !isFinished && !isLocked);
                            const draft = draftPalpites[palpiteKey];
                            
                            const displayA = draft?.gols_a !== undefined ? draft.gols_a : (palpite?.gols_a !== null ? palpite?.gols_a : '');
                            const displayB = draft?.gols_b !== undefined ? draft.gols_b : (palpite?.gols_b !== null ? palpite?.gols_b : '');

                            let ptsBadge = null;
                            if (isFinished && palpite && palpite.gols_a !== null && palpite.gols_b !== null) {
                              const realWinner = Math.sign(jogo.gols_a - jogo.gols_b);
                              const predWinner = Math.sign(palpite.gols_a - palpite.gols_b);
                              
                              if (jogo.gols_a === palpite.gols_a && jogo.gols_b === palpite.gols_b) {
                                ptsBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+3</span>;
                              } else if (realWinner === predWinner) {
                                ptsBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">+1</span>;
                              } else {
                                ptsBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 bg-white/5 text-slate-500">0</span>;
                              }
                            } else if (isFinished || (isLocked && !palpite)) {
                              ptsBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 shrink-0 bg-red-500/10 text-red-400 border border-red-500/20">Sem Palpite</span>;
                            }

                            return (
                              <div 
                                key={friend.id} 
                                className="flex flex-row md:flex-col items-center justify-between md:justify-center p-2.5 md:p-3 rounded-xl border bg-white/[0.01] border-white/[0.02] hover:bg-white/[0.03] transition-all duration-200 gap-2 md:gap-3"
                              >
                                <div className="flex flex-row md:flex-col items-center gap-2 md:gap-1 min-w-0 md:w-full">
                                  <img 
                                    src={avatars[friend.nome]} 
                                    alt={friend.nome}
                                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-zinc-700 shrink-0 shadow-sm cursor-pointer hover:scale-110 hover:border-emerald-400 transition-all duration-300"
                                    onClick={() => setSelectedImage(avatars[friend.nome])}
                                  />
                                  <span className="text-xs md:text-sm font-semibold truncate text-slate-300 w-full text-left md:text-center">
                                    {friend.nome}
                                  </span>
                                </div>

                                {isFinished || isLocked ? (
                                  // Travado após encerrar jogo ou bloqueado
                                  <div className="flex items-center justify-center shrink-0">
                                    <div className="font-title text-xs font-bold bg-black/40 px-2.5 py-1 rounded-md border border-white/[0.03] text-slate-200">
                                      {palpite ? `${palpite.gols_a} x ${palpite.gols_b}` : '- x -'}
                                    </div>
                                    {ptsBadge}
                                  </div>
                                ) : (
                                  isDrafting ? (
                                    <div className="flex items-center justify-center gap-1.5 shrink-0">
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="-"
                                        className="w-9 h-9 md:w-11 md:h-11 bg-black/50 border border-white/20 rounded-xl text-center font-title text-base font-bold text-slate-200 outline-none focus:border-emerald-400 focus:bg-emerald-400/10 transition-colors"
                                        value={displayA}
                                        onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_a', e.target.value)}
                                      />
                                      <span className="text-[10px] md:text-xs font-bold text-slate-500">x</span>
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="-"
                                        className="w-9 h-9 md:w-11 md:h-11 bg-black/50 border border-white/20 rounded-xl text-center font-title text-base font-bold text-slate-200 outline-none focus:border-emerald-400 focus:bg-emerald-400/10 transition-colors"
                                        value={displayB}
                                        onChange={(e) => handleDraftChange(jogo.id, friend.id, 'gols_b', e.target.value)}
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => handleConfirmPalpite(jogo.id, friend.id)}
                                        className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors shrink-0"
                                        title="Confirmar Palpite"
                                      >
                                        <Check size={14} />
                                      </button>
                                      {palpite && (
                                        <button 
                                          type="button"
                                          onClick={() => handleCancelEdit(jogo.id, friend.id)}
                                          className="w-8 h-8 flex items-center justify-center bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 rounded-lg hover:bg-zinc-500/30 hover:text-zinc-200 transition-colors shrink-0"
                                          title="Cancelar Edição"
                                        >
                                          <X size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2 shrink-0">
                                      <div className="font-title text-sm font-bold bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)] flex items-center gap-1.5">
                                        <Check size={12} className="text-emerald-400/70" />
                                        {palpite.gols_a} x {palpite.gols_b}
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => handleEditPalpite(jogo.id, friend.id, palpite.gols_a, palpite.gols_b)}
                                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                                        title="Editar Palpite"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {jogos.filter(j => {
                  const isLocked = j.flag_a && j.flag_a.includes('_LOCKED');
                  if (selectedRound === 'Encerradas') return j.encerrado;
                  if (selectedRound === 'Em Andamento') return !j.encerrado && isLocked;
                  return j.rodada === selectedRound && !j.encerrado && !isLocked;
                }).length === 0 && (
                <div className="text-center text-slate-500 py-10 bg-zinc-900/10 border border-white/5 rounded-3xl text-sm">
                  Nenhum jogo cadastrado nesta rodada.
                </div>
              )}
            </div>

            {/* Painel do Administrador (Adicionar Jogo / Reset) */}
            <div className="bg-zinc-900/10 border border-dashed border-emerald-400/30 rounded-3xl p-5 md:p-6 shadow-xl mt-6">
              <h3 className="font-title text-base font-bold mb-1 flex items-center gap-2 text-slate-100">
                <Settings size={16} className="text-emerald-400" />
                Painel de Controle do Bolão
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Adicione novos confrontos (como as fases de mata-mata) ou realize a inicialização completa do banco.
              </p>

              <div className="flex flex-wrap gap-2.5 mb-4">
                <button 
                  id="btn-admin-form-toggle"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400 hover:text-black hover:shadow-lg hover:shadow-emerald-400/20" 
                  onClick={() => setShowAdminForm(!showAdminForm)}
                >
                  <Plus size={12} />
                  {showAdminForm ? 'Ocultar Formulário' : 'Adicionar Nova Partida'}
                </button>
                
                <button 
                  id="btn-admin-seed"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:border-slate-400" 
                  onClick={() => {
                    if(confirm('Atenção: Isso irá resetar/sobrescrever todos os participantes e carregar os 72 jogos oficiais do bolão. Todos os palpites atuais serão deletados. Continuar?')) {
                      handleSeedDatabase();
                    }
                  }}
                >
                  <RefreshCw size={12} />
                  Resetar e Carregar os 72 Jogos
                </button>
              </div>

              {showAdminForm && (
                <form onSubmit={handleAddGame} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rodada/Fase</span>
                    <select 
                      id="new-game-round"
                      value={newJogo.rodada} 
                      onChange={(e) => setNewJogo(prev => ({ ...prev, rodada: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    >
                      <option value="Rodada 1">Rodada 1</option>
                      <option value="Rodada 2">Rodada 2</option>
                      <option value="Rodada 3">Rodada 3</option>
                      <option value="16 avos de final">16 avos de final</option>
                      <option value="Oitavas de Final">Oitavas de Final</option>
                      <option value="Quartas de Final">Quartas de Final</option>
                      <option value="Semifinal">Semifinal</option>
                      <option value="Disputa 3º Lugar">Disputa 3º Lugar</option>
                      <option value="Grande Final">Grande Final</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data e Hora</span>
                    <input 
                      type="datetime-local" 
                      value={newJogo.data_hora}
                      onChange={(e) => setNewJogo(prev => ({ ...prev, data_hora: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time da Casa (Nome)</span>
                    <input 
                      type="text" 
                      placeholder="Ex: Brasil" 
                      value={newJogo.time_a}
                      onChange={(e) => setNewJogo(prev => ({ ...prev, time_a: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bandeira Time Casa (ex: br, ar, us)</span>
                    <input 
                      type="text" 
                      placeholder="Ex: br" 
                      value={newJogo.flag_a}
                      onChange={(e) => setNewJogo(prev => ({ ...prev, flag_a: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time de Fora (Nome)</span>
                    <input 
                      type="text" 
                      placeholder="Ex: Alemanha" 
                      value={newJogo.time_b}
                      onChange={(e) => setNewJogo(prev => ({ ...prev, time_b: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bandeira Time Fora (ex: de, fr)</span>
                    <input 
                      type="text" 
                      placeholder="Ex: de" 
                      value={newJogo.flag_b}
                      onChange={(e) => setNewJogo(prev => ({ ...prev, flag_b: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end mt-2">
                    <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 bg-emerald-400 text-black hover:shadow-lg hover:shadow-emerald-400/20 active:scale-95">
                      Salvar Jogo
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Seed Rápido para Banco Vazio */}
            {jogos.length === 0 && (
              <div className="bg-zinc-900/10 border border-white/5 rounded-3xl p-8 text-center max-w-md mx-auto shadow-xl">
                <h3 className="font-title text-base font-bold mb-1 text-slate-100">O banco de dados está vazio!</h3>
                <p className="text-slate-400 text-xs mb-5">
                  Clique abaixo para criar os 6 amigos e carregar as 72 partidas da Copa do Mundo 2026.
                </p>
                <button 
                  id="btn-quick-seed"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 bg-emerald-400 text-black hover:shadow-lg hover:shadow-emerald-400/20 active:scale-95" 
                  onClick={handleSeedDatabase}
                >
                  <RefreshCw size={12} />
                  Carregar Dados Oficiais (Seed DB)
                </button>
              </div>
            )}

          </section>
        </main>
      )}
      {/* Modal para Imagem Ampliada */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Imagem Ampliada" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,1)] ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()} // Previne fechar ao clicar na própria imagem se ela for menor que a tela
          />
          <button 
            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10 hover:scale-110"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} />
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
