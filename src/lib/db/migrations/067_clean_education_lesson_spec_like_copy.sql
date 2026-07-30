UPDATE daily_lessons
SET description = REPLACE(description, 'introspecção', 'reflexão')
WHERE description LIKE '%introspecção%';

UPDATE daily_lessons
SET description = REPLACE(description, 'introspecÃ§Ã£o', 'reflexÃ£o')
WHERE description LIKE '%introspecÃ§Ã£o%';
