'use strict';
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
const util = require('util');

var log4js = require('log4js');
var properties = require('properties');
var fs = require('fs');
var path = require('path');
if (!global.NodeDCLoaded) {
    // The Node.js DC is not required.
    global.NodeDCLoaded = true;
} else {
    return;
}
var appmetrics = global.Appmetrics;
// var configsvc = require('./lib/tool/configureservice').ConfigureService;

//    initialize log
if (process.env.KNJ_LOG_TO_CONSOLE) {
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
    logger.info('KNJ_LOG_LEVEL is set to', loglevel);
} else {
    logger.setLevel('INFO');
    logger.info('KNJ_LOG_LEVEL is not set or not set correctly through environment variables.');
    logger.info('The program set default log level to INFO.');
}
var commontools = require('./lib/tool/common');

//    initialize log end
// Sometimes we need to change the name of some environment variables to consistant all of DC.
commontools.envDecrator();

//    initialize different code path - BI/BAM/Agent
var configObj;
if (!process.env.MONITORING_SERVER_TYPE) {
    try {
        var configString = fs.readFileSync(path.join(__dirname,
            '/etc/config.properties'));

        configObj = properties.parse(configString.toString(), {
            separators: '=',
            comments: [';', '@', '#']
        });
        process.env.MONITORING_SERVER_TYPE = configObj.MONITORING_SERVER_TYPE;
    } catch (e) {
        logger.error('Failed to read etc/config.properties');
        logger.error('Use default MONITORING_SERVER_TYPE: BAM');
        logger.info(e);
        process.env.MONITORING_SERVER_TYPE = 'BAM';
    }
}

if (!process.env.MONITORING_SERVER_URL &&
    configObj && configObj.MONITORING_SERVER_URL) {
    process.env.MONITORING_SERVER_URL = configObj.MONITORING_SERVER_URL;
}

if (!process.env.MONITORING_APPLICATION_NAME &&
    configObj && configObj.MONITORING_APPLICATION_NAME) {
    process.env.MONITORING_APPLICATION_NAME = configObj.MONITORING_APPLICATION_NAME;
}
if (!process.env.MONITORING_SECURITY_URL &&
    configObj && configObj.MONITORING_SECURITY_URL) {
    process.env.MONITORING_SECURITY_URL = configObj.MONITORING_SECURITY_URL;
}
if (!process.env.MONITORING_SERVER_NAME &&
    configObj && configObj.MONITORING_SERVER_NAME) {
    process.env.MONITORING_SERVER_NAME = configObj.MONITORING_SERVER_NAME;
}

if (process.env.MONITORING_SECURITY_URL) {
    process.env.APM_KEYFILE_URL = process.env.MONITORING_SECURITY_URL;
}

// initialize shared configurations:
if (commontools.testTrue(process.env.SECURITY_OFF)) {
    global.SECURITY_OFF = true;
}

if (typeof (process.env.KNJ_ENABLE_TT) === 'undefined' && configObj && configObj.KNJ_ENABLE_TT) {
    process.env.KNJ_ENABLE_TT = configObj.KNJ_ENABLE_TT;
}

if (typeof (process.env.KNJ_SAMPLING) === 'undefined' && configObj && configObj.KNJ_SAMPLING) {
    process.env.KNJ_SAMPLING = configObj.KNJ_SAMPLING;
}

if (typeof (process.env.KNJ_MIN_CLOCK_TRACE) === 'undefined' &&
    configObj && configObj.KNJ_MIN_CLOCK_TRACE) {
    process.env.KNJ_MIN_CLOCK_TRACE = configObj.KNJ_MIN_CLOCK_TRACE;
}

if (typeof (process.env.KNJ_MIN_CLOCK_STACK) === 'undefined' &&
    configObj && configObj.KNJ_MIN_CLOCK_STACK) {
    process.env.KNJ_MIN_CLOCK_STACK = configObj.KNJ_MIN_CLOCK_STACK;
}

if (typeof (process.env.KNJ_DISABLE_METHODTRACE) === 'undefined' &&
    configObj && configObj.KNJ_DISABLE_METHODTRACE) {
    process.env.KNJ_DISABLE_METHODTRACE = configObj.KNJ_DISABLE_METHODTRACE;
}
if (typeof (process.env.KNJ_AAR_BATCH_FREQ) === 'undefined' &&
    configObj && configObj.KNJ_AAR_BATCH_FREQ) {
    process.env.KNJ_AAR_BATCH_FREQ = configObj.KNJ_AAR_BATCH_FREQ;
}
if (typeof (process.env.KNJ_AAR_BATCH_COUNT) === 'undefined' &&
    configObj && configObj.KNJ_AAR_BATCH_COUNT) {
    process.env.KNJ_AAR_BATCH_COUNT = configObj.KNJ_AAR_BATCH_COUNT;
}
// initialize shared configurations end

// initialize BAM configuration
var bamConfObj;
if (process.env.MONITORING_SERVER_TYPE === 'BAM') {
    try {
        var bamConfString = fs.readFileSync(path.join(__dirname,
            '/etc/bam.properties'));

        bamConfObj = properties.parse(bamConfString.toString(), {
            separators: '=',
            comments: [';', '@', '#']
        });
    } catch (e) {
        logger.error('Failed to read etc/bam.properties.');
        logger.error('Use default BAM configuration.');
        logger.info(e);
    }

    if (bamConfObj) {
        global.KNJ_AAR_BATCH_COUNT = process.env.KNJ_AAR_BATCH_COUNT ||
            bamConfObj.KNJ_AAR_BATCH_COUNT;
        global.KNJ_AAR_BATCH_FREQ = process.env.KNJ_AAR_BATCH_FREQ ||
            bamConfObj.KNJ_AAR_BATCH_FREQ;
        global.KNJ_ADR_BATCH_COUNT = process.env.KNJ_ADR_BATCH_COUNT ||
            bamConfObj.KNJ_ADR_BATCH_COUNT;
        global.KNJ_ADR_BATCH_FREQ = process.env.KNJ_ADR_BATCH_FREQ ||
            bamConfObj.KNJ_ADR_BATCH_FREQ;
    }
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
    logger.fatal('The Node.js DC is disabled. ' +
        ' Please refer to the document to configure the Node.js DC again.');
    return;
}
if (process.env.ITCAM_DC_ENABLED && process.env.ITCAM_DC_ENABLED.toLowerCase() === 'false') {
    logger.fatal('The Node.js DC is disabled. ' +
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
