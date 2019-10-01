-- Get a DNS record
SELECT
    domains.name AS zone,
    records.name AS domain,
    records.type,
    records.content,
    records.ttl
FROM
    records
INNER JOIN domains
    ON records.domain_id = domains.id
WHERE
    records.name = @domain
    AND records.type = @type
    AND domains.name = @zone
    AND NOT records.disabled
LIMIT 1;
