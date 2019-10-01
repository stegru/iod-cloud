/*
 * Provides dynamic DNS using PowerDNS.
 *
 * Copyright 2019 Raising the Floor - International
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * The R&D leading to these results received funding from the
 * Department of Education - Grant H421A150005 (GPII-APCP). However,
 * these results do not necessarily represent the policy of the
 * Department of Education, and you should not assume endorsement by the
 * Federal Government.
 *
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */
"use strict";

var fluid = fluid || require("infusion");
var iodCloud = fluid.registerNamespace("iodCloud");

require("kettle");

var fs = require("fs"),
    path = require("path"),
    Database = require("better-sqlite3");

fluid.defaults("iodCloud.powerDNS", {
    gradeNames: "iodCloud.dnsProvider",

    invokers: {
        getZone: {
            funcName: "iodCloud.powerDNS.getZone",
            args: ["{that}", "{arguments}.0"] // siteID
        },
        updateRecord: {
            funcName: "iodCloud.powerDNS.updateRecord",
            // zone, domain, recordType, content, [ttl]
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2", "{arguments}.3", "{arguments}.4"]
        },
        getRecord: {
            funcName: "iodCloud.powerDNS.getRecord",
            // zone, domain, recordType
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2", "{arguments}.3", "{arguments}.4"]
        },
        getDB: {
            funcName: "iodCloud.powerDNS.getDB",
            args: ["{that}.options.databaseFile"]
        }
    },
    members: {
        // The domain that the clients are part of (the DNS zone).
        zone: null,
        query: {}
    },
    // Distributed from config
    databaseFile: null
});

/**
 * Opens the database.
 * @param {String} databaseFile The database file.
 * @return {Database} The database object.
 */
iodCloud.powerDNS.getDB = function (databaseFile) {
    return new Database(databaseFile, {fileMustExist: true});
};

/**
 * Gets and prepares a SQL statement.
 *
 * Reads from a file in the queries directory which contains the SQL query, and returns a prepared statement.
 *
 * @param {Component} that The iodCloud.powerDNS instance.
 * @param {Database} db The database connection.
 * @param {String} query The query name.
 * @return {Statement} The prepared statement.
 */
iodCloud.powerDNS.getStatement = function (that, db, query) {
    var queryText = that.query[query];
    if (!queryText) {
        queryText = fs.readFileSync(path.join(__dirname, "queries/powerDNS." + query + ".sql"), "utf8");
        that.query[query] = queryText;
    }

    return db.prepare(queryText);
};

/**
 * Gets the DNS zone of the subdomains.
 * @param {Component} that The iodCloud.powerDNS instance.
 * @return {Promise} Resolves with the domain name.
 */
iodCloud.powerDNS.getZone = function (that) {
    var promise = fluid.promise();

    if (that.zone) {
        promise.resolve(that.zone);
    } else {
        var db = that.getDB();
        try {
            var statement = iodCloud.powerDNS.getStatement(that, db, "getZone");
            var r = statement.get();
            promise.resolve(r.name);
        } catch (e) {
            promise.reject(e);
        }
    }

    return promise;
};

/**
 * Gets the DNS record for a given domain and type.
 *
 * This assumes a domain has no more than 1 record of a single type.
 *
 * @param {Component} that The iodCloud.powerDNS instance.
 * @param {String} zone The DNS zone (the parent domain of the iod servers)
 * @param {String} domain The full domain that the record applies to.
 * @param {String} type Type of record (eg, A, CNAME, TXT)
 * @return {Promise<DNSRecord>} Resolves with the DNS record, or null if not found.
 */
iodCloud.powerDNS.getRecord = function (that, zone, domain, type) {
    var promise = fluid.promise();

    var db = that.getDB();
    try {
        var statement = iodCloud.powerDNS.getStatement(that, db, "getRecord");
        var r = statement.get({
            zone: zone,
            domain: domain,
            type: type
        });
        promise.resolve(r);
    } catch (e) {
        promise.reject(e);
    }

    return promise;
};

/**
 * Updates a DNS record. If there isn't an existing record with a matching domain and type, a new one is added.
 *
 * While there is no harm in a single domain having multiple records of the same type, the use case for this application
 * does not require it.
 *
 * @param {Component} that The iodCloud.powerDNS instance.
 * @param {String} zone The DNS zone (the parent domain of the iod servers)
 * @param {String} domain The full domain that the record applies to.
 * @param {String} type Type of record (eg, A, CNAME, TXT)
 * @param {String} content The record content.
 * @param {String} ttl [optional] Time-to-live value, seconds. [default: 120]
 * @return {Promise} Resolves when complete.
 */
iodCloud.powerDNS.updateRecord = function (that, zone, domain, type, content, ttl) {
    var db = that.getDB();
    var promise = fluid.promise();

    try {
        /** @type DNSRecord */
        var record = {
            zone: zone,
            domain: domain,
            type: type,
            content: content,
            ttl: ttl || 120
        };

        var updateRecord = iodCloud.powerDNS.getStatement(that, db, "updateRecord");

        var result = updateRecord.run(record);
        if (result.changes === 0) {
            var addRecord = iodCloud.powerDNS.getStatement(that, db, "addRecord", record);
            addRecord.run(record);
        }
        promise.resolve();
    } catch (err) {
        promise.reject(err);
    }

    return promise;
};

