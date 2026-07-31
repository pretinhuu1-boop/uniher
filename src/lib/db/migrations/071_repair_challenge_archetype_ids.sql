UPDATE challenges
SET archetype_id = CASE archetype_id
  WHEN 'arch_guardia' THEN 'arc_guardia'
  WHEN 'arch_protetora' THEN 'arc_protetora'
  WHEN 'arch_guerreira' THEN 'arc_guerreira'
  ELSE archetype_id
END
WHERE archetype_id IN ('arch_guardia', 'arch_protetora', 'arch_guerreira');
