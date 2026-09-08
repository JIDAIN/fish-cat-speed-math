from pathlib import Path
import re

path = Path("src/lib/stage4-acceptance.test.ts")
text = path.read_text()
text = re.sub(
    r'\nconst expectedNonDirectSkillDrills = \[.*?\] as const;\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
old = '''  it("keeps the 160-skill tree intact and explicitly inventories the 140 direct drills", () => {
    expect(skillDefinitions).toHaveLength(160);
    expect(implementedSkillIds).toHaveLength(140);
    expect(new Set(implementedSkillIds).size).toBe(140);

    const direct = new Set<SkillId>(implementedSkillIds);
    const nonDirect = skillDefinitions
      .map((definition) => definition.id)
      .filter((skillId) => !direct.has(skillId));
    expect(nonDirect).toEqual(expectedNonDirectSkillDrills);
  });'''
new = '''  it("keeps the 160-skill tree intact and exposes every leaf as a direct drill", () => {
    expect(skillDefinitions).toHaveLength(160);
    expect(implementedSkillIds).toHaveLength(160);
    expect(new Set(implementedSkillIds).size).toBe(160);

    const direct = new Set<SkillId>(implementedSkillIds);
    const nonDirect = skillDefinitions
      .map((definition) => definition.id)
      .filter((skillId) => !direct.has(skillId));
    expect(nonDirect).toEqual([]);
  });'''
assert old in text, "stage4 acceptance inventory block changed unexpectedly"
path.write_text(text.replace(old, new, 1))
