-- Rename skills to be more user-friendly.
-- tasks and user_skills both reference skills.id (FK), so renaming here
-- automatically covers all user data and task history.

UPDATE skills SET name = 'Execution'  WHERE name = 'Deep Focus';
UPDATE skills SET name = 'Learning'   WHERE name = 'Synthesis';
UPDATE skills SET name = 'Recovery'   WHERE name = 'Restoration';
UPDATE skills SET name = 'Creativity' WHERE name = 'Creative';
