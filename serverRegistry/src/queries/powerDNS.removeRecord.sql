-- Remove a DNS record (disables it rather than remove)
UPDATE records
SET
    disabled = 1,
    change_date = strftime('%s', 'now')
WHERE
    name = @domain
    AND type = @type
    AND domain_id = (SELECT id FROM domains WHERE domains.name = @zone)
