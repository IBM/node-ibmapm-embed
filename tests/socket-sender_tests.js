'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var socketsender = require('../lib/socket-sender').socketSender;

tap.plan(1);
tap.tearDown(function() {
    console.log('End of socket-sender.js.');
});
tap.test('socket-sender.js.', function(t) {
    socketsender.getDataType();
    socketsender.getSocketPort();
    socketsender.send({ payload: 'hello' });
    t.end();
});
