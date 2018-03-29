'use strict';
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

const util = require('util');
var log4js = require('log4js');
var commontools = require('./lib/tool/common');

if (!global.NodeDCLoaded) {
    // The Node.js DC is not required.
    global.NodeDCLoaded = true;
} else {
    return;
}
var appmetrics = global.Appmetrics;
// var configsvc = require('./lib/tool/configureservice').ConfigureService;

// initialize log
if (!commontools.testTrue(process.env.KNJ_LOG_TO_FILE)) {
    log4js.loadAppender('console');
} else {
    log4js.loadAppender('file');
    log4js.addAppender(log4js.appenders.file('nodejs_dc.log'), 'knj_log');
}

var logger = log4js.getLogger('knj_log');
var loglevel = process.env.KNJ_LOG_LEVEL ? process.env.KNJ_LOG_LEVEL.toUpperCase() : undefined;
if (loglevel &&
    (loglevel === 'OFF' || loglevel === 'ERROR' || loglevel === 'INFO' ||
        loglevel === 'DEBUG' || loglevel === 'ALL')) {
    logger.setLevel(loglevel);
} else {
    logger.setLevel('INFO');
}

//    initialize log end
// Sometimes we need to change the name of some environment variables to consistant all of DC.
commontools.envDecrator();

process.env.MONITORING_SERVER_TYPE = 'BAM';


if (process.env.MONITORING_SECURITY_URL) {
    process.env.APM_KEYFILE_URL = process.env.MONITORING_SECURITY_URL;
}

if (commontools.testTrue(process.env.SECURITY_OFF)) {
    global.SECURITY_OFF = true;
}

// initialize BAM configuration
if (process.env.MONITORING_SERVER_TYPE === 'BAM') {

    global.KNJ_ADR_BATCH_COUNT = global.KNJ_ADR_BATCH_COUNT || 100;
    global.KNJ_ADR_BATCH_FREQ = global.KNJ_ADR_BATCH_FREQ || 60;

    if (process.env.KNJ_BAM_ORIGINID) {
        global.KNJ_BAM_ORIGINID = process.env.KNJ_BAM_ORIGINID;
    } else {
        global.KNJ_BAM_ORIGINID = 'defaultProvider';
    }

    if (process.env.KNJ_BAM_APPLICATION_TOPIC) {
        global.KNJ_BAM_APPLICATION_TOPIC = process.env.KNJ_BAM_APPLICATION_TOPIC;
    } else {
        global.KNJ_BAM_APPLICATION_TOPIC = 'applications';
    }
}


// configsvc.on('conf_update', function(conf) {
//     logger.info('The configuration of DC is updated.', conf);
//     if (conf) {
//         process.env.ITCAM_DC_ENABLED = conf.ITCAM_DC_ENABLED;
//         process.env.KNJ_ENABLE_TT = conf.KNJ_ENABLE_TT;
//         process.env.KNJ_ENABLE_DEEPDIVE = conf.KNJ_ENABLE_DEEPDIVE;
//         process.env.KNJ_DISABLE_METHODTRACE = conf.KNJ_DISABLE_METHODTRACE;
//     }
// });

// initialize BAM configuration end

if (process.env.NODEJS_DC_DISABLE && process.env.NODEJS_DC_DISABLE.toLowerCase() === 'true') {
    logger.info('The Node.js DC is disabled. ' +
        ' Please refer to the document to configure the Node.js DC again.');
    return;
}
if (process.env.ITCAM_DC_ENABLED && process.env.ITCAM_DC_ENABLED.toLowerCase() === 'false') {
    logger.info('The Node.js DC is disabled. ' +
        ' Please refer to the document to configure the Node.js DC again.');
    return;
}
commontools.enableTrace(appmetrics);

// Start DC in case rest client is ready to send payload
var restClient = require('./lib/ibm_apm_restclient/lib/restclient/httpsender.js');
restClient.checkReadyStatus(startDC);

var DCStarted = false;

function startDC() {
    if (DCStarted) {
        logger.debug('index.js', 'DC started already!');
        return;
    }
    DCStarted = true;

    logger.debug('index.js', 'startDC()', 'start DC.');

    var plugin = require('./lib/plugin.js').monitoringPlugin;
    plugin.init('Cloudnative');

}

exports.stopDC = function() {
    appmetrics.stop();
    require('./lib/metric-manager').metricManager.stop();
};

exports.attach = function(options) {

    // Protect our options from modification.
    options = util._extend({}, options);
    // if the user hasn't supplied appmetrics, require here.
    if (!options.appmetrics) {
        options.appmetrics = require('appmetrics');
    }
    appmetrics = options.appmetrics;
    return exports;
};
