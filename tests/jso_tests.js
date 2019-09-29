'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
process.env.KNJ_ENVTYPE = 'Cloudnative';
process.env.KNJ_ENABLE_DEEPDIVE = true;
process.env.KNJ_ENABLE_TT = true;
process.env.KNJ_DISABLE_METHODTRACE = false;
process.env.KNJ_ENABLE_METHODTRACE = true;
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
process.env.IBM_APM_SERVER_URL =
    'aHR0cDovL2ZvcnRhcHRlc3Rvbmx5Lmlnbm9yZQ==';
process.env.MONITORING_SERVER_TYPE = 'BI';
process.env.KNJ_FILE_COMMIT_TIME = 1;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var jso = require('../lib/jso');
var config = require('../lib/config.js');
var data = {
    type: 'http',
    top: {
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
            cpuTimeDelta: -1
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
};
tap.plan(1);
tap.tearDown(function() {
    console.log('End of JSO test.');
    global.NodeDCLoaded = false;
    var dc = require('../index');
    var bamplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BAMPlugin');
    var biplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BIPlugin');
    dc.stopDC();
    bamplugin.stop();
    biplugin.stop();
    // process.exit(0);
});
tap.test('JSO test.', function(t) {
    config.init();
    var jsoFile = jso.open();
    var methIdstart = jsoFile.startMethod(data.top.tid, data.request.timer, data.name, '1');
    console.log('methId', methIdstart);
    t.ok(methIdstart, 'Start method is OK.');

    jsoFile.stopMethod(data.top.tid, data.request.timer,
        data.name, '1', data.stack, data.context);

    jsoFile.startRequest(data.top.tid, data.id, data.request.timer, data.top === data,
        data.type.toUpperCase(), data.name);

    jsoFile.stopRequest(data.top.tid, data.id, data.request.timer, data.top === data,
        data.type.toUpperCase(), data.name, data.stack, data.context);
    t.end();
});
