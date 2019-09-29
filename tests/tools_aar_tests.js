'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var aarTools = require('../lib/tool/aartools');

var data = {
    parent: {
        type: 'http',
        id: 17
    },
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
            statusCode: 304,
            requestHeader: {
                host: 'localhost:9080',
                connection: 'keep-alive',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) ',
                accept: 'text/html,application/xhtml+xml,application/xml;',
                referer: 'http://localhost:9080/flights.html',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                cookie: 'private_content_version=ef16a3ff5a078548029089330a697122;',
                'if-none-match': 'W/"3be9-1333595454"',
                'if-modified-since': 'Mon, 18 Dec 2017 01:40:34 GMT'
            }
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
    }]
};

var datalp = {
    type: 'LOOPBACK',
    top: {
        tid: 1
    },
    id: 3,
    time: 1513675617560,
    duration: 6.788108,
    name: '/flights.html',
    request: {
        parent: {
            type: 'LOOPBACK',
            id: 11
        },
        name: '/flights.html',
        type: 'LOOPBACK',
        timer: {
            startTime: [334501, 28989145],
            startTimeMillis: 1513675617560,
            timeDelta: 6.788108,
            cpuTimeDelta: -1
        },
        context: {
            url: '/flights.html',
            method: 'GET',
            statusCode: 404,
            requestHeader: {
                host: 'localhost:9080',
                connection: 'keep-alive',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) ',
                accept: 'text/html,application/xhtml+xml,application/xml;',
                referer: 'http://localhost:9080/flights.html',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                cookie: 'private_content_version=ef16a3ff5a078548029089330a697122;',
                'if-none-match': 'W/"3be9-1333595454"',
                'if-modified-since': 'Mon, 18 Dec 2017 01:40:34 GMT'
            }
        },
        tracedStart: true,
        traceStopped: true,
        stack: 'Error\nat SendStream.notModified(D:\\send\\index.js:303)'
    },
    children: [{
        type: 'LOOPBACK',
        top: {
            tid: 1
        },

        id: 13,
        time: 1513675617560,
        duration: 6.788108,
        name: '/flights.html',
        parent: {
            type: 'LOOPBACK',
            id: 13
        },
        request: {
            name: '/flights.html',
            type: 'LOOPBACK',
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
    }]
};
var port = '8080';
tap.plan(3);
tap.tearDown(function() {

    console.log('End of AAR tools.');
    var bamplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BAMPlugin');
    var biplugin = require('../node_modules/ibmapm-restclient/lib/plugins/BIPlugin');
    bamplugin.stop();
    biplugin.stop();
});
tap.test('AAR tools for HTTP.', function(t) {
    var aar = aarTools.composeAARTT(data, port);
    console.log(aar);
    t.ok(aar, 'AAR is generated.');
    t.end();
});

tap.test('AAR tools for LOOPBACK.', function(t) {
    var aar = aarTools.composeAARTT(datalp, port);
    console.log(aar);
    t.ok(aar, 'AAR is generated.');
    t.end();
});

var header = 'HTTP/1.1 304 Not Modified\r\nX-Powered-By: Express\r\nAccept-Ranges: bytes';
var requestHeader = {
    host: 'localhost:9080',
    connection: 'keep-alive',
    'upgrade-insecure-requests': '1',
    arm_correlator: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
};
tap.test('AAR tools for extractInfoFromHeader.', function(t) {
    var interaction_info = aarTools.extractInfoFromHeader(header, requestHeader);

    t.ok(interaction_info, 'interaction_info is generated.');
    t.end();
});
