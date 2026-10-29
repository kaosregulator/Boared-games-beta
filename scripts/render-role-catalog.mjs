/** Writes docs/ROLES.md from src/rewards/catalog.json:  node scripts/render-role-catalog.mjs */
import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync('src/rewards/catalog.json', 'utf8'));
const byKey = new Map(catalog.roles.map(r => [r.key, r]));
const nameOf = key => {
  const r = byKey.get(key);
  return r ? `${r.emoji} ${r.name}` : key;
};

function unlockText(role) {
  const u = role.unlock;
  switch (u.type) {
    case 'chat-level': return `Tatsu chat level ${u.level}`;
    case 'self-select': return `Pick it yourself${role.years ? ` (${role.years})` : ''}`;
    case 'stat': return u.value === null ? `${u.metric} ${u.op} *threshold not set yet*` : `${u.metric} ${u.op} ${u.value.toLocaleString('en-US')}`;
    case 'win': return u.count === 1 ? 'Win once' : `Win ${u.count} times`;
    case 'event': return `Event: \`${u.event}\``;
    case 'launch': return `Play ${u.distinct} of: ${u.games.join(', ')}`;
    case 'meta': return u.requires ? `Earn ${u.requires.map(nameOf).join(' + ')}` : `Earn ${u.atLeast} of: ${u.requiresAnyOf.map(nameOf).join(', ')}`;
    case 'count': return `Earn ${u.atLeast} ${u.families.join('/')} roles`;
    case 'early-member': return `First ${u.cap} Discord sign-ins`;
    case 'manual': return 'Awarded by staff';
    default: return u.type;
  }
}

let out = '# Role catalogue\n\n';
out += 'Generated from `src/rewards/catalog.json` by `scripts/render-role-catalog.mjs`. Edit the JSON, not this file.\n\n';
out += 'Earned roles are coloured by rarity, so the colour means the same thing in every family: ';
out += Object.entries(catalog.rarityColors).map(([k, v]) => `${k} \`${v}\``).join(' · ') + '.\n';
out += 'Every role is created with **no permissions**, not hoisted and not mentionable.\n';

for (const [family, title] of Object.entries(catalog.families)) {
  const roles = catalog.roles.filter(r => r.family === family);
  out += `\n## ${title}\n\n| Role | Game | Unlock | Rarity | Why it's worth wearing |\n| --- | --- | --- | --- | --- |\n`;
  for (const r of roles) {
    out += `| ${r.emoji} **${r.name}** | ${r.game ?? ''} | ${unlockText(r)} | ${r.rarity} | ${r.meaning} |\n`;
  }
}
fs.writeFileSync('docs/ROLES.md', out);
console.log(`docs/ROLES.md: ${catalog.roles.length} roles`);
