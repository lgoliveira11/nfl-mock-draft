export const getCpuPick = (availableProspects, currentTeam) => {
  if (!availableProspects || availableProspects.length === 0) return null;

  // Best Player Available overall
  const bestAvailable = availableProspects[0];

  if (!currentTeam || !currentTeam.needs || currentTeam.needs.length === 0) {
    return bestAvailable;
  }

  const teamNeeds = currentTeam.needs;

  // Find the highest ranked player that matches a team need
  const bestNeedPlayer = availableProspects.find(p => teamNeeds.includes(p.position));

  if (!bestNeedPlayer) {
    return bestAvailable;
  }

  // CPU Logic: If the best player that fills a need is within 10 spots of the absolute best player, take the need.
  // Otherwise, the value is too good to pass up (BPA).
  // E.g., if Best Available is Rank #5, and Best Need is Rank #12 (diff=7), we take the Need.
  // If Best Available is Rank #5, and Best Need is Rank #20 (diff=15), we take the BPA.
  const rankDiff = bestNeedPlayer.rank - bestAvailable.rank;

  if (rankDiff <= 10) {
    return bestNeedPlayer;
  }

  return bestAvailable;
};
