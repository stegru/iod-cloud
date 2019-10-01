-- Update a DNS record
UPDATE records
SET
    content = @content,
    ttl = @ttl,
    disabled = 0,
    change_date = strftime('%s', 'now')
WHERE
    name = @domain
    AND type = @type
    AND domain_id = (SELECT id FROM domains WHERE domains.name = @zone)
