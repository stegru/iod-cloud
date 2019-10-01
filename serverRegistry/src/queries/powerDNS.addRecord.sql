-- Adds a new DNS record
INSERT INTO
    records (domain_id, name, type, content, ttl, change_date, disabled)
VALUES (
   (SELECT id FROM domains WHERE domains.name = @zone),
   @domain,
   @type,
   @content,
   @ttl,
   strftime('%s', 'now'),
   0);
