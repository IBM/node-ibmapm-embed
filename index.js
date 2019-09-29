'use strict';
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
// PLACEHOLDER_FOR_BI_FIX
if (process.env.NODEJS_DC_DISABLE && process.env.NODEJS_DC_DISABLE.toLowerCase() === 'true') {
    return;
}
if (process.env.ITCAM_DC_ENABLED && process.env.ITCAM_DC_ENABLED.toLowerCase() === 'false') {
    return;
}

const util = require('util');
var log4js = require('log4js');
var path = require('path');
if (!global.NodeDCLoaded) {
    // The Node.js DC is not required.
    global.NodeDCLoaded = true;
} else {
    return;
}
var appmetrics = global.Appmetrics;
var url = require('url');

function isTrue(v) {
    if (v && ['false', 'False', 'FALSE', ''].indexOf(v) < 0) {
        return true;
    } else {
        return false;
    }
};
function isFalse(v) {
    return v && ['false', 'False', 'FALSE'].indexOf(v) === 0;
}

//    initialize log
global.KNJ_MAX_LOG_SIZE = 10485760;
var log4jsConfiguration = {
    appenders: {
        knj_log_console: {type: 'console'},
        knj_log_file: {
            type: 'multiFile',
            maxLogSize: global.KNJ_MAX_LOG_SIZE,
            base: '.',
            property: 'fileName',
            extension: '.log'
        }
    },
    categories: {
        default: {
            appenders: [
                isTrue(process.env.KNJ_LOG_TO_CONSOLE) ? 'knj_log_console' : 'knj_log_file'
            ],
            level: 'INFO'
        }
    }
};

var loglevel = process.env.KNJ_LOG_LEVEL ? process.env.KNJ_LOG_LEVEL.toUpperCase() : undefined;
var logger;
if (loglevel &&
    (loglevel === 'OFF' || loglevel === 'ERROR' || loglevel === 'INFO' ||
        loglevel === 'DEBUG' || loglevel === 'ALL')) {
    log4jsConfiguration.categories.default.level = loglevel;
    log4js.configure(log4jsConfiguration);
    process.env.KNJ_LOG_LEVEL = loglevel;
    global.knj_logger = log4js.getLogger('knj_log');
    logger = global.knj_logger;
} else {
    log4jsConfiguration.categories.default.level = 'INFO';
    log4js.configure(log4jsConfiguration);
    global.knj_logger = log4js.getLogger('knj_log');
    logger = global.knj_logger;
    process.env.KNJ_LOG_LEVEL = 'INFO';
}
logger.addContext('fileName', 'nodejs_dc');
var commontools = require('./lib/tool/common');

//    initialize log end
// Sometimes we need to change the name of some environment variables to consistant all of DC.

commontools.envDecrator();
global.DC_VERSION = getDCVersion();
var configObj;
var opentracing_sampler = process.env['OPENTRACING_SAMPLER'] || 0.01;
var opentracing_disabled = !process.env['OPENTRACING_ENABLED'] && isFalse(process.env['OPENTRACING_ENABLED']);

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

// initialize BAM configuration end


initJaegerSender();
commontools.enableTrace(appmetrics);

// Start DC in case rest client is ready to send payload
var restClient = require('ibmapm-restclient');
restClient.checkReadyStatus(startDC);


var DCStarted = false;

function startDC() {
    if (DCStarted) {
        logger.debug('index.js', 'DC started already!');
        return;
    }
    DCStarted = true;
    refreshJaegerSender();
    logger.debug('index.js', 'startDC()', 'start DC.');

    var plugin = require('./lib/plugin.js').monitoringPlugin;
    plugin.init('Cloudnative');

    logger.info('== Data Collector version:', global.DC_VERSION);
    logger.info('== Capabilities:');
    logger.info('   |== Metrics:', 'Enabled');
    logger.info('   |== Diagnostic:', commontools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE) ? 'Enabled' : 'Disabled');
    logger.info('   |== Transaction Tracking:',
        commontools.testTrue(process.env.KNJ_ENABLE_TT) ? 'Enabled' : 'Disabled');
    logger.info('== Supported Integrations:', 'IBM Cloud Application Management,',
        'IBM Cloud Application Performance Management');

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

function getDCVersion() {
    var packageJson = require(path.join(__dirname, 'package.json'));
    if (packageJson && packageJson.version) {
        return packageJson.version;
    }
    return '1.0.0';
};

function initJaegerSender() {
    if (!opentracing_disabled) {
        const zipkin = require('./appmetrics-zipkin/index.js');
        const zipkinUrl = process.env.JAEGER_ENDPOINT_ZIPKIN ?
            process.env.JAEGER_ENDPOINT_ZIPKIN : 'http://localhost:9411/api/v1/spans';
        var jaegerEndpoint = url.parse(zipkinUrl);
        var enabled = true;
        var zipkinOptions;
        if (jaegerEndpoint.protocol === 'https:'){
            zipkinOptions = {
                zipkinEndpoint: zipkinUrl,
                sampleRate: opentracing_sampler,
                pfx: global.JAEGER_PFX,
                passphase: global.JAEGER_PASSPHASE
            };
            if (!zipkinOptions.pfx || !zipkinOptions.passphase) {
                enabled = false;
            }
        } else {
            zipkinOptions = {
                host: jaegerEndpoint.hostname,
                port: jaegerEndpoint.port,
                sampleRate: opentracing_sampler
            };
            if (!process.env.JAEGER_ENDPOINT_ZIPKIN) {
                enabled = false;
            }
        }
        zipkin(zipkinOptions);
        var internalUrls = [
            '/applicationmgmt/0.9',
            '/metric/1.0',
            '/uielement/0.8',
            '/agent_mgmt/0.6',
            'configmaps',
            '?type=providers',
            '?type=aar/middleware',
            '?type=adr/middleware',
            '/1.0/monitoring/data',
            '/OEReceiver/v1/monitoringdata/',
            '/api/v1/spans',
            '/api/v1/namespaces',
            '/apis/extensions/v1beta1/namespaces'
        ];
        zipkin.updatePathFilter(internalUrls);
        zipkin.updateHeaderFilter({
            'User-Agent': 'NodeDC'
        });
        if (!enabled){
            zipkin.disable();
            process.env.JAEGER_ENDPOINT_NOTREADY = 'true';
        } else {
            zipkin.enable();
            process.env.JAEGER_ENDPOINT_NOTREADY = 'false';
        }

    }
}

function refreshJaegerSender(){
    logger.debug('refreshJaegerSender enter');
    if (!opentracing_disabled) {
        logger.debug('enter');
        const zipkin = require('./appmetrics-zipkin/index.js');
        const zipkinUrl = process.env.JAEGER_ENDPOINT_ZIPKIN ?
            process.env.JAEGER_ENDPOINT_ZIPKIN : 'http://localhost:9411/api/v1/spans';
        var jaegerEndpoint = url.parse(zipkinUrl);
        var enabled = false;
        logger.debug('jaeger', jaegerEndpoint.hostname, jaegerEndpoint.port, opentracing_sampler);
        var zipkinOptions;
        if (jaegerEndpoint.protocol === 'https:'){
            zipkinOptions = {
                zipkinEndpoint: zipkinUrl,
                sampleRate: opentracing_sampler,
                pfx: global.JAEGER_PFX,
                passphase: global.JAEGER_PASSPHASE
            };
            if (zipkinOptions.pfx && zipkinOptions.passphase) {
                enabled = true;
            }
        } else {
            zipkinOptions = {
                host: jaegerEndpoint.hostname,
                port: jaegerEndpoint.port,
                sampleRate: opentracing_sampler
            };
            if (process.env.JAEGER_ENDPOINT_ZIPKIN) {
                enabled = true;
            }
        }
        zipkin.update(zipkinOptions);
        if (!enabled){
            zipkin.disable();
            process.env.JAEGER_ENDPOINT_NOTREADY = 'true';
        } else {
            zipkin.enable();
            process.env.JAEGER_ENDPOINT_NOTREADY = 'false';
        }
        logger.debug('done', zipkinUrl, process.env.JAEGER_ENDPOINT_NOTREADY);
    }
};
