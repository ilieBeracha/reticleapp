-- Enable realtime for notification_history so clients receive INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE notification_history;

-- Full replica identity so the payload includes all columns on INSERT
ALTER TABLE notification_history REPLICA IDENTITY FULL;
