/**
 * Utility for calculating NFL draft pick grades.
 */

const POSITIONAL_VALUE = {
  QB: 5,
  EDGE: 3,
  OT: 3,
  CB: 3,
  WR: 1,
  IDL: 1,
  IOL: 1,
  RB: 0,
  TE: 0,
  LB: 0,
  S: 0,
  K: -5,
  P: -5,
  LS: -5
};

export function calculateGrade(pickData, playerRank, playerGrade, teamNeeds) {
  if (!pickData || playerRank === undefined || playerGrade === undefined) return null;

  const { pickNumber, round, position } = pickData;

  // 1. Value Score - Baseline 85
  let multiplier = 1.0;
  if (round === 1) multiplier = 2.0;
  else if (round >= 4) multiplier = 0.5;

  const valueDiff = pickNumber - playerRank;
  const valueScore = Math.max(0, Math.min(100, 85 + (valueDiff * multiplier)));

  // 2. Talent Score - Normalizing 5.0-8.0 to 0-100
  const talentScore = Math.max(0, Math.min(100, ((playerGrade - 5.0) / (8.0 - 5.0)) * 100));

  // 3. Need Score
  let needScore = 40;
  if (teamNeeds && teamNeeds.length > 0) {
    const needIndex = teamNeeds.indexOf(position);
    if (needIndex === 0) needScore = 100;
    else if (needIndex === 1 || needIndex === 2) needScore = 85;
    else if (needIndex !== -1) needScore = 70;
  }
  
  // QB Bonus in Round 1
  if (position === 'QB' && round === 1 && teamNeeds && teamNeeds.includes('QB')) {
    needScore = Math.min(100, needScore + 10);
  }

  // 4. Positional Bonus
  const positionalBonus = POSITIONAL_VALUE[position] || 0;

  // Final Weighted Score (Round-based)
  let finalScore;
  let breakdown = { value: valueScore, talent: talentScore };

  if (round <= 2) {
    // Round 1-2: 40/40/20 + Positional Bonus
    finalScore = (valueScore * 0.4) + (talentScore * 0.4) + (needScore * 0.2) + positionalBonus;
    breakdown.need = needScore;
    breakdown.positional = positionalBonus;
  } else {
    // Round 3-7: 60/40 (Value/Talent)
    finalScore = (valueScore * 0.6) + (talentScore * 0.4);
    breakdown.need = 0;
    breakdown.positional = 0;
  }

  return {
    score: finalScore,
    grade: getGradeFromScore(finalScore),
    breakdown: breakdown
  };
}

function getGradeFromScore(score) {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 89) return 'A-';
  if (score >= 85) return 'B+';
  if (score >= 84) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 76) return 'C+';
  if (score >= 72) return 'C';
  if (score >= 68) return 'C-';
  if (score >= 64) return 'D+';
  if (score >= 60) return 'D';
  if (score >= 56) return 'D-';
  if (score >= 52) return 'E+';
  if (score >= 48) return 'E';
  return 'E-';
}

export function getGradeColor(grade) {
  if (grade.startsWith('A')) return '#22c55e'; // Green
  if (grade.startsWith('B')) return '#84cc16'; // Light Green
  if (grade.startsWith('C')) return '#eab308'; // Yellow
  if (grade.startsWith('D')) return '#f97316'; // Orange
  return '#ef4444'; // Red
}
