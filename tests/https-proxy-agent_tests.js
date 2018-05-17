'use strict';
process.env.DC_TEST_MODE = true;
process.env.MONITORING_SERVER_TYPE = 'BAM';
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_LOG_TO_CONSOLE = true;
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
var tap = require('tap');

tap.plan(2);
tap.tearDown(function() {
    console.log('End of HttpsProxyAgent.');
});
tap.test('HttpProxyAgent.', function(t) {
    var HttpsProxyAgent = require('../lib/ibm_apm_restclient/lib/restclient/https-proxy-agent');
    var proxyAgent = new HttpsProxyAgent('https://localhost:443');
    console.log(proxyAgent);
    t.ok(proxyAgent, 'HttpsProxyAgent is created.');
    t.end();
});
tap.test('HttpsProxyAgent.', function(t) {
    var HttpsProxyAgent = require('../lib/ibm_apm_restclient/lib/restclient/https-proxy-agent');
    var proxyAgent = new HttpsProxyAgent('http://localhost:8080');
    console.log(proxyAgent);
    t.ok(proxyAgent, 'HttpsProxyAgent is created.');
    t.end();
});
