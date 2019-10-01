/*
 * DNS Updater
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
fluid.registerNamespace("iodCloud.dns");

require("kettle");

/**
 * A DNS record.
 * @typedef {Object} DNSRecord
 * @property {String} zone The DNS zone - parent domain of the domain.
 * @property {String} domain The domain - a subordinate domain of the zone.
 * @property {String} type The record type (such as 'A', 'CNAME', 'TXT').
 * @property {String} content The record content.
 * @property {Number} ttl The time-to-live, in seconds.
 */

fluid.defaults("iodCloud.dnsProvider", {
    gradeNames: "fluid.component",

    invokers: {
        // Gets a DNS record.
        getRecord: "fluid.notImplemented",
        // Gets the DNS zone.
        getZone: "fluid.notImplemented",
        // Updates a DNS record for a domain
        updateRecord: "fluid.notImplemented",
        getDomain: {
            funcName: "iodCloud.dns.getDomain",
            args: ["{dnsProvider}", "{arguments}.0"]
        }
    }
});

/**
 * Gets the DNS zone and hostname of the iod-server at the given site.
 * @param {Component} dns The iodCloud.dnsProvider instance.
 * @param {String} siteID The site identifier
 * @return {Promise} Resolves with an object containing the zone and domain.
 */
iodCloud.dns.getDomain = function (dns, siteID) {
    var promise = fluid.promise();

    dns.getZone().then(function (zone) {
        promise.resolve({
            zone: zone,
            domain: siteID + "." + zone
        });
    }, promise.reject);

    return promise;
};
