-- Add campaign context and schedule config
ALTER TABLE daily_lessons ADD COLUMN campaign_context TEXT;
ALTER TABLE gamification_config ADD COLUMN lesson_schedule TEXT DEFAULT '{"days":[1,2,3,4,5],"perDay":{"default":2}}';
