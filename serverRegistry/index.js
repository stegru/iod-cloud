/*
 * iod-server registry
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

var crypto = require("crypto"),
    fs = require("fs"),
    path = require("path");

require("./src/dns.js");
require("./src/power-dns.js");

fluid.defaults("iodCloud.serverRegistry", {
    gradeNames: "kettle.app",
    serverUrl: "http://localhost",

    requestHandlers: {
        getHost: {
            // Called by clients to get the iod-server host for their site.
            route: "/server/hostname/:siteName([-.a-z0-9]+)",
            method: "get",
            type: "iodCloud.serverRegistry.hostname.handler"
        },
        setIP: {
            // Update the internal address of the iod-server.
            route: "/server/ip/:siteName([-.a-z0-9]+)/:localIP([0-9.]{7,15})",
            method: "put",
            type: "iodCloud.serverRegistry.ip.handler"
        },
        certChallenge: {
            // Set the TXT record of the iod-server's domain name.
            route: "/server/cert/:siteName([-.a-z0-9]+)",
            method: "post",
            type: "iodCloud.serverRegistry.cert.handler"
        },
        certRemoveChallenge: {
            // Remove the TXT record of the iod-server's domain name.
            route: "/server/cert/:siteName([-.a-z0-9]+)",
            method: "delete",
            type: "iodCloud.serverRegistry.cert.handler"
        }
    },

    listeners: {
        "onCreate.loadApiKey": {
            funcName: "iodCloud.serverRegistry.loadApiKey",
            args: [ "{iodCloudServer}.options.configDir" ]
        }
    },

    components: {
        dnsProvider: {
            type: "iodCloud.powerDNS"
        }
    }
});

iodCloud.serverRegistry.apiKey = undefined;

iodCloud.serverRegistry.loadApiKey = function (configDir) {
    iodCloud.serverRegistry.apiKey = fs.readFileSync(path.join(configDir, "API-KEY"), "utf8").trim();
};

// General handler for /server requests
fluid.defaults("iodCloud.serverRegistry.handler", {
    gradeNames: ["kettle.request.http"],
    invokers: {
        getSiteID: {
            funcName: "iodCloud.serverRegistry.getSiteID",
            args: [ "{arguments}.0" ] // siteName
        }
    },
    requestMiddleware: {
        "auth": {
            priority: "first",
            middleware: "{that}.authMiddleware"
        }
    },
    components: {
        authMiddleware: {
            type: "kettle.middleware",
            options: {
                invokers: {
                    handle: "iodCloud.serverRegistry.authorise"
                }
            }
        }
    },
    listeners: {
        "onRequestError.removeStack": {
            // Remove the 'stack' field from the error response
            priority: "first",
            func: "fluid.set",
            args: ["{arguments}.0", "stack", undefined]
        }
    }
});

/**
 * Basic authorisation of clients, using a shared static key. Needs to be improved.
 *
 * @param {Component} request The request handler.
 * @return {Promise} Resolves if the request has been authorised (or noAuth is true in the options). Rejects if not.
 */
iodCloud.serverRegistry.authorise = function (request) {
    var promise = fluid.promise();
    if (request.options.noAuth || request.req.headers["x-api-key"] === iodCloud.serverRegistry.apiKey) {
        promise.resolve();
    } else {
        promise.reject({
            statusCode: 401,
            message: "Not for you"
        });
    }
    return promise;
};


/**
 * Returns the site id for the given site. This is the bit that's prepended to the domain, in order to avoid putting
 * anything in DNS that identifies the deployment site.
 *
 * @param {String} siteName [external] The name of the site.
 * @return {String} The site ID.
 */
iodCloud.serverRegistry.getSiteID = function (siteName) {
    // This should be replaced with a lookup, but for now just generate something reproducible and non-reversible.
    return "iod-server-" + crypto.createHmac("sha512", "iod").update(siteName).digest("hex").substr(0, 8);
};

// Handler for the 'hostname' requests
fluid.defaults("iodCloud.serverRegistry.hostname.handler", {
    gradeNames: ["iodCloud.serverRegistry.handler"],
    noAuth: true,
    invokers: {
        handleRequest: {
            funcName: "iodCloud.serverRegistry.hostname.handleRequest",
            args: [
                "{dnsProvider}",
                "{request}",
                "@expand:{that}.getSiteID({request}.req.params.siteName)"
            ]
        }
    }
});

/**
 * The result of the hostname request
 * @typedef HostnameResult {Object}
 * @property {String} hostname Hostname of the iod server.
 * @property {Boolean} unknown true if there's no 'A' record for the hostname.
 */

/**
 * Handle a /server/hostname request.
 *
 * This gets the iod-server's hostname for a site.
 *
 * Responds with {HostnameResult}.
 *
 * @param {Component} dns The iodCloud.dnsProvider instance.
 * @param {Object} request The request object.
 * @param {String} siteID The site identifier.
 */
iodCloud.serverRegistry.hostname.handleRequest = function (dns, request, siteID) {
    dns.getDomain(siteID).then(function (domainZone) {
        dns.getRecord(domainZone.zone, domainZone.domain, "A").then(function (record) {
            request.events.onSuccess.fire({
                hostname: domainZone.domain,
                unknown: !record
            });
        }, request.handlerPromise.reject);
    }, request.handlerPromise.reject);
};

// Handler for the 'ip' requests
fluid.defaults("iodCloud.serverRegistry.ip.handler", {
    gradeNames: ["iodCloud.serverRegistry.handler"],
    invokers: {
        handleRequest: {
            funcName: "iodCloud.serverRegistry.ip.handleRequest",
            args: [
                "{dnsProvider}",
                "{request}",
                "@expand:{that}.getSiteID({request}.req.params.siteName)",
                "{request}.req.params.localIP"
            ]
        }
    }
});

/**
 * Handle a /server/ip request. This sets the IP for the iod-server's hostname, updating the DNS record.
 *
 * @param {Component} dns The iodCloud.dnsProvider instance.
 * @param {Object} request The request object.
 * @param {String} siteID The site identifier.
 * @param {String} localIP [external] The new IP address of the iod server.
 */
iodCloud.serverRegistry.ip.handleRequest = function (dns, request, siteID, localIP) {
    fluid.log("dns Update: " + siteID + ", " + localIP);

    var ip = iodCloud.sanitiseIP(localIP);
    if (!ip || !/^[-a-z0-9]{4,}/i.test(siteID)) {
        request.handlerPromise.reject({
            message: "Bad IP address",
            isError: true,
            statusCode: 400
        });
        return;
    }

    dns.getDomain(siteID).then(function (domainZone) {
        dns.updateRecord(domainZone.zone, domainZone.domain, "A", ip);
        request.events.onSuccess.fire("ok");
    }, request.handlerPromise.reject);
};

// Handler for the 'cert' requests
fluid.defaults("iodCloud.serverRegistry.cert.handler", {
    gradeNames: ["iodCloud.serverRegistry.handler"],
    invokers: {
        handleRequest: {
            funcName: "iodCloud.serverRegistry.cert.handleRequest",
            args: [
                "{dnsProvider}",
                "{request}",
                "@expand:{that}.getSiteID({request}.req.params.siteName)",
                "{request}.req.body.challenge"
            ]
        }
    }
});

/**
 * Handle a /server/cert request.
 *
 * This sets the DNS TXT record to the challenge, for the _acme-challenge sub domain of the iod server's name.
 *
 * @param {Component} dns The iodCloud.dnsProvider instance.
 * @param {Object} request The request object.
 * @param {String} siteID [external] The site identifier (validated in the route).
 * @param {String} challenge [external] The certificate challenge, for the TXT record.
 */
iodCloud.serverRegistry.cert.handleRequest = function (dns, request, siteID, challenge) {
    fluid.log("cert challenge Update: " + siteID + ", " + challenge);

    // The challenge should be a base64url encoded 256 bit hash - just check if it vaguely represents a base64 string.
    if (challenge && challenge.length > 10 && challenge.length < 100 && /^[-A-Za-z0-9+/=]+$/.test(challenge)) {
        dns.getDomain(siteID).then(function (domainZone) {
            var subdomain = "_acme-challenge." + domainZone.domain;
            dns.updateRecord(domainZone.zone, subdomain, "TXT", challenge, 30);
            request.events.onSuccess.fire("ok");
        }, request.handlerPromise.reject);
    } else {
        request.handlerPromise.reject({
            message: challenge ? "Strange challenge" : "Missing challenge",
            isError: true,
            statusCode: 400
        });
    }
};

/**
 * Parses an IP address, ensuring it's valid and removing leading zeroes.
 *
 * @param {String} ipAddress The IP address.
 * @return {String} The clean IP address, or undefined if it was not valid.
 */
iodCloud.sanitiseIP = function (ipAddress) {
    var result = undefined;
    if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ipAddress)) {
        var bytes = ipAddress.split(".", 5);
        if (bytes.length === 4) {
            var newBytes = bytes.map(function (byte) {
                var value = parseInt(byte);
                if (value >= 0 && value <= 255) {
                    return parseInt(byte).toString();
                }
            });
            result = newBytes.join(".");
        }
    }
    return result;
};

