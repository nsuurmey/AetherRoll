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

  // groups: [{ count, sides }], modifier, exploding, advantage, disadvantage
  function execute({ groups, modifier = 0, exploding = false, advantage = false, disadvantage = false }) {
    if ((advantage || disadvantage) && groups.length === 1 && groups[0].sides === 20 && groups[0].count === 1) {
      const a = rollDie(20, exploding);
      const b = rollDie(20, exploding);
      const keepA = advantage ? a.total >= b.total : a.total <= b.total;
      const kept = keepA ? a : b;
      const dropped = keepA ? b : a;
      const total = kept.total + modifier;
      const isCrit = kept.total === 20;
      const isCritFail = kept.total === 1;
      return {
        total,
        groups: [{ sides: 20, kept: kept.rolls, dropped: dropped.rolls, isKept: true }],
        modifier,
        advantage,
        disadvantage,
        isCrit,
        isCritFail,
        label: buildLabel([{ count: 1, sides: 20 }], modifier, advantage, disadvantage, exploding),
      };
    }

    const resultGroups = groups.map(({ count, sides }) => {
      const rolls = [];
      let groupTotal = 0;
      for (let i = 0; i < count; i++) {
        const r = rollDie(sides, exploding);
        rolls.push(r.rolls);
        groupTotal += r.total;
      }
      const isCrit = sides === 20 && rolls.some(r => r[0] === 20);
      const isCritFail = sides === 20 && rolls.some(r => r[0] === 1);
      return { sides, rolls, total: groupTotal, isCrit, isCritFail };
    });

    const diceTotal = resultGroups.reduce((a, g) => a + g.total, 0);
    const total = diceTotal + modifier;
    const isCrit = resultGroups.some(g => g.isCrit);
    const isCritFail = resultGroups.some(g => g.isCritFail);

    return {
      total,
      groups: resultGroups,
      modifier,
      advantage: false,
      disadvantage: false,
      isCrit,
      isCritFail,
      label: buildLabel(groups, modifier, advantage, disadvantage, exploding),
    };
  }

  function buildLabel(groups, modifier, advantage, disadvantage, exploding) {
    let parts = groups.map(g => `${g.count}d${g.sides}`).join('+');
    if (modifier !== 0) parts += (modifier > 0 ? '+' : '') + modifier;
    if (advantage) parts += ' (Adv)';
    if (disadvantage) parts += ' (Dis)';
    if (exploding) parts += ' (Exp)';
    return parts;
  }

  return { execute };
})();
