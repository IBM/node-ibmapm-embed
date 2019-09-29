'use strict';
process.env.DC_TEST_MODE = true;
process.env.LOGS_DEBUG === 'true';
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = false;
process.env.KNJ_ENVTYPE = 'Cloudnative';
process.env.KNJ_ENABLE_DEEPDIVE = true;
process.env.KNJ_ENABLE_TT = true;
process.env.KNJ_DISABLE_METHODTRACE = false;
process.env.KNJ_ENABLE_METHODTRACE = true;
process.env.IBM_APM_SERVER_URL =
    'aHR0cDovL2ZvcnRhcHRlc3Rvbmx5Lmlnbm9yZQ==';
process.env.MONITORING_SERVER_TYPE = 'BI';
process.env.KNJ_FILE_COMMIT_TIME = 1;
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var requestManager = require('../lib/request-manager.js').requestManager;
var config = require('../lib/config.js');
var data = {
    timer: {
        startTime: [334501, 28989145],
        startTimeMillis: 1513675617560,
        timeDelta: 6.788108,
        cpuTimeDelta: -1
    },
    type: 'http',
    top: {
        id: 1,
        tid: 1
    },
    id: 3,
    time: 1513675617560,
    duration: 6.788108,
    name: '/flights.html',
    request: {
        name: '/flights.html',
        type: 'http',
        timer: {
            startTime: [334501, 28989145],
            startTimeMillis: 1513675617560,
            timeDelta: 6.788108,
            cpuTimeDelta: 70
        },
        context: {
            url: '/flights.html',
            method: 'GET',
            statusCode: 304
        },
        tracedStart: true,
        traceStopped: true,
        stack: 'Error\nat SendStream.notModified(D:\\send\\index.js:303)'
    },
    children: [{
        type: 'http',
        top: {
            tid: 1
        },

        id: 13,
        time: 1513675617560,
        duration: 6.788108,
        name: '/flights.html',
        parent: {
            type: 'http',
            id: 13
        },
        request: {
            name: '/flights.html',
            type: 'http',
            timer: {
                startTime: [334501, 28989145],
                startTimeMillis: 1513675617560,
                timeDelta: 6.788108,
                cpuTimeDelta: 70
            },
            context: {
                url: '/flights.html',
                method: 'GET',
                statusCode: 304
            },
            tracedStart: true,
            traceStopped: true,
            stack: 'Error\nat SendStream.notModified(D:\\send\\index.js:303)'
        }
    }]
};

tap.plan(2);
tap.tearDown(function() {
    console.log('End of request manager test.');
    global.NodeDCLoaded = false;
    var dc = require('../index');
    var bamplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BAMPlugin');
    var biplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BIPlugin');
    dc.stopDC();
    bamplugin.stop();
    biplugin.stop();
    // process.exit(0);
});
tap.test('request manager test for BAM.', function(t) {
    config.init();
    process.env.MONITORING_SERVER_TYPE = 'BAM';
    requestManager.start('BAM');
    var rm = require('../lib/request-manager.js');
    rm.writeToJso(data);
    t.end();
});
tap.test('request manager test for BI.', function(t) {
    config.init();
    process.env.MONITORING_SERVER_TYPE = 'BI';
    requestManager.start('SaaS');
    var rm = require('../lib/request-manager.js');
    rm.writeToJso(data);
    t.end();
});
