DELETE FROM records;
DELETE FROM domains;

-- Zone
INSERT INTO
    domains
    (id, name, type)
VALUES
    (1, '{{ iod_clients_domain }}', 'NATIVE');

INSERT INTO
    records
    (domain_id, name, type, content, ttl, change_date)
VALUES
    -- SOA record
    (
        1,
        '{{ iod_clients_domain }}',
        'SOA',
        'ns.{{ iod_cloud_domain }} soa.{{ iod_clients_domain }} 100 86400 7200 7200 60',
        60,
        strftime('%s', 'now')
    ),
    -- CNAME record for clients
    (
        1,
        '{{ iod_clients_domain }}',
        'CNAME',
        '{{ iod_cloud_domain }}',
        7200,
        strftime('%s', 'now')
    ),
    -- A record for api
    (
        1,
        '{{ iod_api_domain }}',
        'A',
        '{{ iod_external_ip }}',
        7200,
        strftime('%s', 'now')
    );


