const Dice = (() => {
  function roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function rollDie(sides, exploding) {
    const rolls = [];
    let result = roll(sides);
    rolls.push(result);
    if (exploding) {
      while (result === sides) {
        result = roll(sides);
        rolls.push(result);
      }
    }
    return { total: rolls.reduce((a, b) => a + b, 0), rolls };
  }

  function rollPool(groups, exploding) {
    const resultGroups = groups.map(({ count, sides }) => {
      const rolls = [];
      let groupTotal = 0;
      for (let i = 0; i < count; i++) {
        const r = rollDie(sides, exploding);
        rolls.push(r.rolls);
        groupTotal += r.total;
      }
      const isCrit     = sides === 20 && rolls.some(r => r[0] === 20);
      const isCritFail = sides === 20 && rolls.some(r => r[0] === 1);
      return { sides, rolls, total: groupTotal, isCrit, isCritFail };
    });
    const total      = resultGroups.reduce((a, g) => a + g.total, 0);
    const isCrit     = resultGroups.some(g => g.isCrit);
    const isCritFail = resultGroups.some(g => g.isCritFail);
    return { groups: resultGroups, total, isCrit, isCritFail };
  }

  // groups: [{ count, sides }], modifier, exploding, advantage, disadvantage
  function execute({ groups, modifier = 0, exploding = false, advantage = false, disadvantage = false }) {
    if (advantage || disadvantage) {
      const rollA = rollPool(groups, exploding);
      const rollB = rollPool(groups, exploding);
      const keepA = advantage ? rollA.total >= rollB.total : rollA.total <= rollB.total;
      const kept    = keepA ? rollA : rollB;
      const dropped = keepA ? rollB : rollA;
      const total   = kept.total + modifier;
      return {
        total,
        kept,
        dropped,
        groups: kept.groups,
        modifier,
        advantage,
        disadvantage,
        isCrit:     kept.isCrit,
        isCritFail: kept.isCritFail,
        label: buildLabel(groups, modifier, advantage, disadvantage, exploding),
      };
    }

    const pool  = rollPool(groups, exploding);
    const total = pool.total + modifier;
    return {
      total,
      kept: null,
      dropped: null,
      groups: pool.groups,
      modifier,
      advantage: false,
      disadvantage: false,
      isCrit:     pool.isCrit,
      isCritFail: pool.isCritFail,
      label: buildLabel(groups, modifier, false, false, exploding),
    };
  }

  function buildLabel(groups, modifier, advantage, disadvantage, exploding) {
    let parts = groups.map(g => `${g.count}d${g.sides}`).join('+');
    if (modifier !== 0) parts += (modifier > 0 ? '+' : '') + modifier;
    if (advantage)    parts += ' (Adv)';
    if (disadvantage) parts += ' (Dis)';
    if (exploding)    parts += ' (Exp)';
    return parts;
  }

  function poolBreakdown(pool) {
    return pool.groups.map(g => {
      const flat = g.rolls.map(r => Array.isArray(r) ? r.join('→') : r);
      return `d${g.sides}: [${flat.join(', ')}]`;
    }).join(' | ');
  }

  return { execute, poolBreakdown };
})();
