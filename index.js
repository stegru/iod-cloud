/*
 * Install on Demand cloud server.
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
var fluid = require("infusion"),
    kettle = require("kettle");

fluid.module.register("gpii-iod-cloud", __dirname, require);

var iodCloud = fluid.registerNamespace("iodCloud");

require("./serverRegistry");

/**
 * Query and fetch the array of configs for this IoD Kettle Server.
 *
 * @return {Array} The array of Kettle config instances. In most situations
 *     there is only one.
 */
iodCloud.queryConfigs = function () {
    return fluid.queryIoCSelector(fluid.rootComponent, "kettle.config");
};

/**
 * Starts the server using the default development configuration
 * or if provided a custom config. Accepts an options block
 * that allows specifying the configuration name and directory
 * of configurations.
 *
 * @param {Object} options Accepts the following options:
 *   - configName {String} Name of a configuration to use, specified by the name
 *     of the file without the .json extension.
 *   - configPath {String} Directory of the configuration json files.
 */
iodCloud.start = function (options) {
    options = options || {};
    var configName = options.configName || "gpii-iod-cloud.dev";
    var configPath = options.configPath || __dirname + "/configs";

    kettle.config.loadConfig({
        configName: kettle.config.getConfigName(configName),
        configPath: kettle.config.getConfigPath(configPath)
    });
};

/**
 * Stops the instance that was started with iod.start()
 */
iodCloud.stop = function () {
    var configs = iodCloud.queryConfigs();
    fluid.each(configs, function (config) {
        config.destroy();
    });
};

module.exports = fluid;
