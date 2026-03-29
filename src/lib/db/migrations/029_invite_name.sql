-- Add name field to invites so admin can pre-fill the invitee name
ALTER TABLE invites ADD COLUMN name TEXT;
