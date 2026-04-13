export const getCpuPick = (availableProspects, currentTeam) => {
  if (!availableProspects || availableProspects.length === 0) return null;

  // Se o time não tem needs cadastradas, vai direto de BPA
  if (!currentTeam || !currentTeam.needs || currentTeam.needs.length === 0) {
    return availableProspects[0];
  }

  const teamNeeds = currentTeam.needs;
  const needBonuses = {};

  // Calcula o bônus base para cada posição de need listada pelo time.
  // Equipes podem ter 2, 3, 5 needs. A fórmula se adapta ao tamanho do array.
  teamNeeds.forEach((position, index) => {
    // A primeira need (index 0) tem o maior bônus base (ex: 14)
    // A cada índice subsequente, o bônus cai 3 pontos.
    let baseBonus = 14 - (index * 3);
    
    // Garante um pequeno bônus mínimo (2) para quem estiver na lista, não importa o tamanho dela
    if (baseBonus < 2) baseBonus = 2;

    // Aleatoriedade: Adiciona uma flutuação aleatória entre -2 e +2 ao peso da need.
    // Isso faz com que a prioridade possa mudar levemente em diferentes simulações.
    const randomFactor = Math.floor(Math.random() * 5) - 2; 

    needBonuses[position] = Math.max(0, baseBonus + randomFactor);
  });

  let bestPick = null;
  let bestValueScore = Infinity;

  // Analisa os top 30 jogadores disponíveis no board. 
  // Limitar as opções avaliadas previne que um jogador esquecido (rank 200) ganhe de um BPA de topo.
  const maxScanDepth = Math.min(30, availableProspects.length);

  for (let i = 0; i < maxScanDepth; i++) {
    const prospect = availableProspects[i];
    
    // O score base é o rank original do jogador (quanto menor, melhor)
    let valueScore = prospect.rank;

    // Aplica o desconto se for uma need
    if (needBonuses[prospect.position]) {
      valueScore -= needBonuses[prospect.position];
    }

    // Leve aleatoriedade no julgamento individual do jogador (surpresas no draft)
    valueScore += Math.floor(Math.random() * 3);

    // Salva o jogador com o MENOR Value Score (ou seja, custo-benefício mais vantajoso)
    if (valueScore < bestValueScore) {
      bestValueScore = valueScore;
      bestPick = prospect;
    }
  }

  // Fallback de segurança: Pega o BPA se ocorrer algum erro numérico
  if (!bestPick) {
    return availableProspects[0];
  }

  return bestPick;
};
