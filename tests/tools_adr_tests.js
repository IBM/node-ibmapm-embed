'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var adrTools = require('../lib/tool/adrtools');
var request = {
    name: '/flights.html',
    type: 'http',
    id: 3,
    timer: {
        startTime: [334501, 28989145],
        startTimeMillis: 1513675617560,
        timeDelta: 6.788108,
        cpuTimeDelta: 20
    },
    context: {
        url: '/flights.html',
        method: 'GET',
        statusCode: 304
    },
    tracedStart: true,
    traceStopped: true,
    stack: 'Error\nat SendStream.notModified(D:\\send\\index.js:303)',
    children: [{
        name: '/flights.html',
        type: 'http',
        id: 3,
        timer: {
            startTime: [334501, 28989145],
            startTimeMillis: 1513675617560,
            timeDelta: 6.788108,
            cpuTimeDelta: 20
        },
        context: {
            url: '/flights.html',
            method: 'GET',
            statusCode: 304
        },
        tracedStart: true,
        traceStopped: true,
        stack: 'Error\nat SendStream.notModified(D:\\send\\index.js:303)'
    }]
};
var level = 1;
tap.plan(1);
tap.tearDown(function() {
    console.log('End of AAR tools.');
    var bamplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BAMPlugin');
    var biplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BIPlugin');
    bamplugin.stop();
    biplugin.stop();
});
tap.test('ADR tools.', function(t) {
    var trace = [];
    adrTools.composeTraceData(trace, request, level);
    console.log(trace);
    t.ok(trace, 'ADR is generated.');
    t.end();
});
