'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
var log4js = require('log4js');
global.knj_logger = log4js.getLogger('knj_log');
var tap = require('tap');
var HttpRequest = require('../lib/http-request');
var req = {
    url: 'test.com',
    method: 'hello'
};
tap.plan(1);
tap.tearDown(function() {
    console.log('End of http-request.js.');
});
tap.test('http-request.js.', function(t) {
    var httpreq = new HttpRequest(req, 10);
    t.ok(httpreq, 'Is not a ICp env.');
    httpreq.updateResponseTime(req, 20);
    t.end();
});
