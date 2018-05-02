'use strict';
var https = require('https');
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');

var pluginConfig = require('../restclient/config.js').pluginConfig;
var k8sutil = require('../tools/k8sutil');
var sender = require('../restclient/sender-queue');
var rcutil = require('./util');
var cryptoutil = require('./cryptoutil');
var logger = require('./logutil').getLogger('BAMPlugin.js');

var queue;
var MOUNT_PATH = '/opt/ibm/apm/config';
var FILE_NAME_IBM_APM_INGRESS_URL = 'IBM_APM_INGRESS_URL';
var FILE_NAME_IBM_APM_ACCESS_TOKEN = 'IBM_APM_ACCESS_TOKEN';
var fullPathIngressUrl = path.join(MOUNT_PATH, FILE_NAME_IBM_APM_INGRESS_URL);
var fullPathToken = path.join(MOUNT_PATH, FILE_NAME_IBM_APM_ACCESS_TOKEN);
// the connection from AvailabilityMonitoring
var amconn = {};
var bamconns = {};
var app_guid;
var SB_PATH = '/1.0/credentials/app/';
// This connection is setted by env IBAM_INGRESS_URL & IBAM_TOKEN
var IBAM_options;
var topoPath = '?type=resources';
var providerPath = '?type=providers';
var metricPath = '?type=metric';
var aarPath = '?type=aar/middleware';
var adrPath = '?type=adr/middleware';
var topoAppPath = '?type=' + global.KNJ_BAM_APPLICATION_TOPIC;
var gzipped = true;
var tId = pluginConfig.cfg.tenantID;
var userAgentStr = 'NodejsDC'; // TODO: need to plus DC version then
var EventEmitter = require('events').EventEmitter;
var ready_event = new EventEmitter();
var initialized = false;
var metadataUrl = process.env.IBM_APM_METADATA_URL;
var uiUrl = process.env.IBM_APM_UI_URL;

function concatTask(tasks) {
    var task = { payload: '' };

    var payloads = [];
    if (tasks.length > 0) {

        tasks.forEach(function(element) {
            task = element;
            if (Array.isArray(element.payload)) {
                payloads = payloads.concat(element.payload);
            } else {
                payloads.push(element.payload);
            }
        }, this);
        task.payload = payloads;
    }

    return task;
}

module.exports.Name = function() {
    return 'BAMPlugin';
};

module.exports.checkReadyStatus = function(callback) {
    logger.debug('checkReadyStatus()');
    if (callback) {
        ready_event.once('bam_initialized', function() {
            logger.debug('Got bam_initialized event');
            callback(initialized);
        });
    }
};

module.exports.send = function(tasks, callback) {
    var task = concatTask(tasks);
    var payloads = task.payload;
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    for (var index = 0; index < payloads.length; index++) {
        if (Array.isArray(payloads[index])) {
            for (var i = 0; i < payloads[index].length; i++) {
                var payload = payloads[index][i];
                if (payload.BIOnly) {
                    continue; // ignore BI-only part
                }

                task.payload = payload;
                sendOne(task, callback);
            }
        } else {
            if (!payloads[index].BIOnly) {
                task.payload = payloads[index];
                sendOne(task, callback);
            }
        }
    }
};

function sendOne(task, callback) {
    logger.debug('BAMPlugin.sendOne', 'the type is ', task.type,
        'the payload is ', JSON.stringify(task.payload));

    dumpResourceIDs4Test(task.type, task.payload);

    if (task.type && task.type.indexOf('metadata:') === 0) {
        // send metadata directly
        queue.send(task);
        return;
    }

    if (task.type && task.type.indexOf('amui:') === 0) {
        // send metadata directly
        if (!(task.payload instanceof Buffer)) {
            task.payload = new Buffer(task.payload);
        }
        queue.send(task);
        return;
    }
    if (!task.additionalHeader) {
        task.additionalHeader = {};
    }
    if (amconn.backend_url && amconn.token) {
        // send to backend server of AvailabilityMonitoring service
        task.additionalHeader['Accept'] = 'application/json';
        task.additionalHeader['X-TenantId'] = tId;
        task.additionalHeader['Authorization'] = amconn.token;
        task.additionalHeader['User-Agent'] = userAgentStr;
        task.additionalHeader['BM-ApplicationId'] = app_guid;
        var me = '&origin=' + global.KNJ_BAM_ORIGINID;
        if (task.type.indexOf('resources:') === 0) {
            task.url = amconn.backend_url + topoPath + me;
            if (task.payload.entityTypes[0] === 'application' ||
                task.payload.entityTypes[0] === 'serviceEndpoint') {
                task.url = amconn.backend_url + topoAppPath + me;
            }
        }
        if (task.type.indexOf('metrics:') === 0) {
            task.url = amconn.backend_url + metricPath + me;
        }
        if (task.type.indexOf('aar:') === 0) {
            task.url = amconn.backend_url + aarPath + me;
        }
        if (task.type.indexOf('adr:') === 0) {
            task.url = amconn.backend_url + adrPath + me;
        }
        if (task.type.indexOf('dc') === 0) {
            task.url = amconn.backend_url + providerPath + me;
        }

        logger.debug('BAMPlugin.sendOne', 'the task send to backend service: ' + task.url);

        queue.send(task);
    }
    if (IBAM_options) {
        var additionalHeader = task.additionalHeader;
        if (IBAM_options.headers) {
            for (let key in IBAM_options.headers) {
                additionalHeader[key] = IBAM_options.headers[key];
            }
        }

        // env IBAM_INGRESS_URL & IBAM_TOKEN are set
        me = '&origin=' + global.KNJ_BAM_ORIGINID;
        if (task.type.indexOf('resources:') === 0) {
            task.url = process.env.IBAM_INGRESS_URL + topoPath + me;
            if (task.payload.entityTypes[0] === 'application' ||
                task.payload.entityTypes[0] === 'serviceEndpoint') {
                task.url = process.env.IBAM_INGRESS_URL + topoAppPath + me;
            }
        }
        if (task.type.indexOf('metrics:') === 0) {
            task.url = process.env.IBAM_INGRESS_URL + metricPath + me;
        }
        if (task.type.indexOf('aar:') === 0) {
            task.url = process.env.IBAM_INGRESS_URL + aarPath + me;
        }
        if (task.type.indexOf('adr:') === 0) {
            task.url = process.env.IBAM_INGRESS_URL + adrPath + me;
        }
        if (task.type.indexOf('dc') === 0) {
            task.url = process.env.IBAM_INGRESS_URL + providerPath + me;
        }

        logger.debug('BAMPlugin.sendOne', 'the task send to IBAM: ' + task.url);
        queue.send(task);
    }
    addQueue(task);

    if (callback) {
        callback(null, task);
    }
    return;
}

function addQueue(task) {
    for (let key in bamconns) {
        if (bamconns.hasOwnProperty(key)) {
            let element = bamconns[key];
            if (task.type.indexOf('resources:') === 0) {
                task.url = element.resource_url;
                if (task.payload.entityTypes[0] === 'application' ||
                    task.payload.entityTypes[0] === 'serviceEndpoint') {
                    task.url = element.resource_app_url;
                }
            }
            if (task.type.indexOf('metrics:') === 0) {
                task.url = element.metric_url;
            }
            if (task.type.indexOf('aar:') === 0) {
                task.url = element.tt_url;
            }
            if (task.type.indexOf('adr:') === 0) {
                task.url = element.deepdive_url;
                task.gzipped = gzipped;
            }
            if (task.type.indexOf('dc') === 0) {
                task.url = element.dc_url;
            }

            if (element.pfx) {
                task.addtionalOptions.pfx = element.pfx;
            }

            if (element.keyfile_password) {
                task.addtionalOptions.passphrase = element.keyfile_password;
            }
            if (element.header) {
                for (key in element.header) {
                    task.additionalHeader[key] = element.header[key];
                }
            }

            logger.debug('the task send to ' + task.url);

            queue.send(task);
        }
    }
}

var count = 1;
var intervalObj;
var intervalObjSec;
module.exports.stop = function() {
    logger.debug('Stop BAMPlugin.');
    if (intervalObj) {
        clearInterval(intervalObj);
    }
    if (intervalObjSec) {
        clearInterval(intervalObjSec);
    }
};

if (k8sutil.isICP()) {
    var controller = require('../tools/icpcontroller');
    var event = controller.getEvent();
    event.once('conn_ready_on_icp', initOnICP);
} else {
    init();
    logger.debug('Initialized from non-ICP environment.');
    intervalObj = setInterval(emitEvent, 10000);
    intervalObj.unref();
}

function emitEvent() {
    if (initialized) {
        logger.debug('Emit bam_initialized event. count = ', count, initialized);
        ready_event.emit('bam_initialized');
        if (count > 10) {
            clearInterval(intervalObj);
        }
        count++;
    }
}

function initOnICP(returnCode) {
    init();
    logger.debug('Initialized from ICP environment.', returnCode);
    intervalObj = setInterval(emitEvent, 10000);
    intervalObj.unref();
}

function init() {
    if (process.env.KNJ_VERSION) {
        userAgentStr += '/' + process.env.KNJ_VERSION;
    }
    logger.debug('process.env.VCAP_APPLICATION', process.env.VCAP_APPLICATION);
    rcutil.init();
    setAppTenantID();
    if (isURL(metadataUrl)) {
        sendMetadata(metadataUrl);
    }
    if (isURL(uiUrl)) {
        postAMUI(uiUrl);
    }
    if (process.env.VCAP_SERVICES) {
        checkAvailabilityMonitoring();
    }
    parseIngressURL();
    setServerConn();
    setServerConnGE();
}

function setServerConnGE() {
    logger.debug('BAMPlugin.js', 'setServerConnGE',
        'Retrive server configuration from global.environment.');
    let bamurl = pluginConfig.globalEnv.IBM_APM_INGRESS_URL;
    var me = '&origin=' + global.KNJ_BAM_ORIGINID;
    if (bamurl &&
        isURL(bamurl)) {
        bamurl = bamurl.trim();
        bamconns[bamurl] = {
            server_url: bamurl,
            resource_url: bamurl + topoPath + me,
            resource_app_url: bamurl + topoAppPath + me,
            metric_url: bamurl + metricPath + me,
            tt_url: bamurl + aarPath + me,
            deepdive_url: bamurl + adrPath + me,
            dc_url: bamurl + providerPath + me
        };

        bamconns[bamurl].header = {
            'X-TenantId': pluginConfig.globalEnv.APM_TENANT_ID ?
                pluginConfig.globalEnv.APM_TENANT_ID.trim() : tId,
            'BM-ApplicationId': app_guid,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'NodeDC'
        };

        logger.debug('BAMPlugin.js', 'setServerConnGE', bamconns[bamurl]);
    }

}

function setServerConn() {
    logger.debug('BAMPlugin.js', 'setServerConn',
        'Retrive server configuration from plugin configure file.');
    if (pluginConfig.plugins['BAM'] && pluginConfig.plugins['BAM'].connections) {

        var connections = pluginConfig.plugins['BAM'].connections;

        for (var index = 0; index < connections.length; index++) {
            var element = connections[index];
            if (!pluginConfig.isValidConn(element)) continue;
            var me = '&origin=' + global.KNJ_BAM_ORIGINID;
            bamconns[element.server_url] = {
                server_url: element.server_url,
                resource_url: element.server_url + topoPath + me,
                resource_app_url: element.server_url + topoAppPath + me,
                metric_url: element.server_url + metricPath + me,
                tt_url: element.server_url + aarPath + me,
                deepdive_url: element.server_url + adrPath + me,
                dc_url: element.server_url + providerPath + me,
                keyfile: element.keyfile,
                keyfile_password: element.keyfile_password,
                proxy: element.proxy
            };
            initialized = true; // ready to send payload
            if (element.keyfile) {
                try {
                    let buff = fs.readFileSync(__dirname + '/../../' + element.keyfile);
                    bamconns[element.server_url].pfx = buff;
                } catch (error) {
                    logger.error('failed to read keyfile from local: ' + error);
                }
            }

            if (element.keyfile_url) {
                var keyfile_options = url.parse(element.keyfile_url);
                var sendmethod = (keyfile_options.protocol === 'http:' ? http : https);
                var bamconn = bamconns[element.server_url];
                let req = sendmethod.request(keyfile_options, function(res) {
                    res.on('data', function(d) {
                        if (!bamconn.pfx) {
                            bamconn.pfx = d;
                        } else {
                            bamconn.pfx = Buffer.concat([bamconn.pfx, d],
                                bamconn.pfx.length + d.length);
                        }
                        bamconn.done = true;
                    });

                    res.on('error', function(error) {
                        logger.error('JsonSender response error: ', error);
                    });
                });
                req.on('error', function(error) {
                    logger.error('JsonSender request error: ', error);
                });
                req.end();
            }

            if (element.keyfile_password) {
                bamconns[element.server_url].passphrase = element.keyfile_password;
            }

            if (element.token) {
                bamconns[element.server_url].header = {
                    'X-TenantId': tId,
                    Authorization: 'Basic ' + element.token,
                    'BM-ApplicationId': app_guid,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'User-Agent': 'NodeDC'
                };
            }
        }
    }
}

function parseIngressURL() {
    logger.debug('Set the ingress url.',
        process.env.IBM_APM_INGRESS_URL, process.env.IBM_APM_ACCESS_TOKEN);
    let isbase64 = false;
    if (process.env.IBM_APM_INGRESS_URL) {
        isbase64 = isBase64Url(process.env.IBM_APM_INGRESS_URL);
        if (isbase64) {
            process.env.IBAM_INGRESS_URL =
                new Buffer(process.env.IBM_APM_INGRESS_URL, 'base64').toString();
        } else {
            process.env.IBAM_INGRESS_URL = process.env.IBM_APM_INGRESS_URL;
        }
    }
    if (k8sutil.isICP() && !process.env.IBAM_INGRESS_URL && k8sutil.getIngressUrl()) {
        process.env.IBAM_INGRESS_URL = k8sutil.getIngressUrl();
    }
    if (process.env.IBM_APM_ACCESS_TOKEN) {
        if (isbase64) {
            process.env.IBAM_TOKEN =
                new Buffer(process.env.IBM_APM_ACCESS_TOKEN, 'base64').toString();
        } else {
            process.env.IBAM_TOKEN = process.env.IBM_APM_ACCESS_TOKEN;
        }
    }

    if (k8sutil.isICP() && !process.env.IBAM_INGRESS_URL) {
        intervalObjSec = setInterval(pollMountSecret, 60000);
        intervalObjSec.unref();
    }

    if (process.env.IBAM_INGRESS_URL) {
        // check env IBAM_INGRESS_URL & IBAM_TOKEN, if these env are setted,
        // then send the data to it

        var header = {
            'X-TenantId': tId,
            'BM-ApplicationId': app_guid,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'NodeDC'
        };

        if (process.env.IBAM_TOKEN) {
            header.Authorization = process.env.IBAM_TOKEN;
        }

        IBAM_options = {
            headers: header
        };

        initialized = true; // ready to send payload
    }
}

function setAppTenantID() {
    app_guid = rcutil.getAppGuid();
    if (process.env.VCAP_APPLICATION) {
        var vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);
        app_guid = vcapApplication['application_id'];
        if (!app_guid) {
            logger.error('Failed to get application_id from VCAP_APPLICATION. ');
            return;
        }

        tId = vcapApplication['space_id'];
        if (!tId) {
            logger.error('Failed to get space_id from VCAP_APPLICATION. ');
            return;
        }
        logger.info('The application_id from VCAP_APPLICATION is ', app_guid);
        logger.info('The tenantID/space_id from VCAP_APPLICATION is ', tId);
    } else {
        logger.debug(' VCAP_APPLICATION env variable is not found.');
    }
}

function checkAvailabilityMonitoring() {

    // if the AvailabilityMonitoring is bound, then need to send the data to backend
    var vcap_service = JSON.parse(process.env.VCAP_SERVICES);
    var AMServiceName = 'AvailabilityMonitoring';
    if (process.env.IBAM_SVC_NAME) {
        logger.debug('IBAM_SVC_NAME is set as: ', process.env.IBAM_SVC_NAME);
        AMServiceName = process.env.IBAM_SVC_NAME;
    }

    if (vcap_service[AMServiceName]) {
        var cred_url = vcap_service[AMServiceName][0].credentials.cred_url + SB_PATH + app_guid;
        var token = vcap_service[AMServiceName][0].credentials.token;
        if (!token) {
            logger.error('Failed to get token from service  ', vcap_service[AMServiceName]);
            return;
        }
        cryptoutil.initkey(app_guid);
        token = cryptoutil.unobfuscate(token);
        var urlMap = url.parse(cred_url);
        var amoption = {
            hostname: urlMap['hostname'],
            host: urlMap['host'],
            path: urlMap['path'],
            method: 'GET',
            port: urlMap.port,
            agent: false,
            timeout: 60000
        };

        if (!urlMap.port) {
            amoption.port = urlMap.protocol === 'https:' ? 443 : 80;
        }

        initialized = true; // ready to send payload

        amoption.headers = {
            Accept: 'application/json',
            'X-TenantId': tId,
            Authorization: 'bamtoken ' + token,
            'User-Agent': userAgentStr
        };
        logger.debug('options to get the backend url: ', amoption);
        var isHttp = urlMap.protocol === 'http:';
        var sendMethod = isHttp ? http : https;
        let req = sendMethod.request(amoption, function(res) {
            logger.debug('statusCode from AvailabilityMonitoring  ', res.statusCode);
            res.on('data', function(d) {
                try {
                    // init AMConnection
                    var rescontent = JSON.parse(d.toString());
                    logger.debug('response body: ', rescontent);
                    if (rescontent['backend_url'] && rescontent['token']) {
                        amconn = {
                            backend_url: rescontent['backend_url'] + '/1.0/data',
                            token: 'bamtoken ' + rescontent['token']
                        };
                        logger.debug('get the backend service: ', amconn);

                        dumpProperties4Test();
                    }
                } catch (e) {
                    logger.error('faled to parse the backend url', e);
                }
            });

        });
        req.on('error', function(e) {
            logger.error('Failed to get backend url from AvailabilityMonitoring.', e);
        });
        req.end();
    }
}

function dumpResourceIDs4Test(type, payload) {
    if (process.env.DUMP_PROPERTIES_AVT) {
        let item = null;
        if (type === 'dc' || type.substr(0, 'resources'.length) === 'resources') {
            if (payload.hasOwnProperty('uniqueId') && payload.hasOwnProperty('entityTypes')) {
                let entityTypes = payload.entityTypes;
                if (entityTypes.length > 0) {
                    item = payload.uniqueId + ':' + payload.entityTypes[0] + '\n';
                    let dumpBuffer = new Buffer(item);
                    fs.writeFile('bam-avt-resource-list.properties',
                        dumpBuffer, { flag: 'a' },
                        function(err) {
                            if (err) {
                                logger.debug('Failed to dump resource id');
                            }
                            logger.debug('The resource id has been saved!');
                        });
                }
            }
        }
    }
}

function dumpProperties4Test() {
    if (process.env.DUMP_PROPERTIES_AVT) {
        var bamdump = 'backend_url=' + amconn.backend_url;
        if (amconn.backend_url) {
            bamdump += '\ntoken=' + amconn.token +
                '\napplication_id=' + app_guid;
            bamdump += '\nspace_id=' + tId;
        } else {
            bamdump = 'backend_url=' + process.env.IBAM_INGRESS_URL;
            bamdump += '\ntoken=' + amconn.token +
                '\napplication_id=' + app_guid;
            bamdump += '\nspace_id=' + tId;
        }


        var dumpBuffer = new Buffer(bamdump);
        fs.writeFile('bam-avt.properties', dumpBuffer, function(err) {
            if (err) {
                logger.debug('Failed to dump bam properties');
            }
            logger.debug('The bam properties file has been saved!');
        });
    }
}

function isBase64Url(httpurl) {
    if (!isURL(httpurl)) {
        return true;
    }
    return false;
}

function isURL(turl) {
    if (turl) {
        return turl.toLowerCase().startsWith('http');
    }
    return false;
}

function getMountSecret(mountSecret) {
    if (fs.existsSync(mountSecret)) {
        let val = fs.readFileSync(mountSecret).toString();
        return val.length === 0 ? undefined : val;
    } else {
        return undefined;
    }
}

function pollMountSecret() {
    // if (process.env.IBAM_INGRESS_URL) {
    //     clearInterval(intervalObjSec);
    //     return;
    // }
    let ingressUrl = getMountSecret(fullPathIngressUrl);
    let token = getMountSecret(fullPathToken);
    logger.debug('Poll the server configure from secrets:', ingressUrl, token);
    if (ingressUrl) {
        if (process.env.IBAM_INGRESS_URL && process.env.IBAM_INGRESS_URL === ingressUrl) {
            return;
        }
        process.env.IBAM_INGRESS_URL = ingressUrl;
        var header = {
            'X-TenantId': tId,
            'BM-ApplicationId': app_guid,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'NodeDC'
        };

        if (token) {
            header.Authorization = token;
            process.env.IBAM_TOKEN = token;
        }

        IBAM_options = {
            headers: header
        };
        initialized = true; // ready to send payload
        // clearInterval(intervalObjSec);
    }
}

function sendMetadata(mUrl) {
    logger.debug('BAMPlugin.js', 'sendMetadata', mUrl);
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    let task = {
        type: 'metadata:',
        url: mUrl,
        additionalHeader: {}
    };

    task.additionalHeader['X-TenantId'] = tId;
    task.additionalHeader['Provider'] = 'NodeDC';

    var mdapp = require('../../etc/ResourceTypes/nodeDCApplication_1.2_ResourceType.json');
    task['payload'] = JSON.stringify(mdapp);
    queue.addTask(task);

    var mdruntime = require('../../etc/ResourceTypes/nodeDCRuntime_1.2_ResourceType.json');
    task['payload'] = JSON.stringify(mdruntime);
    queue.addTask(task);
}

function postAMUI(uiUrl) {
    logger.debug('BAMPlugin.js', 'postAMUI', uiUrl);
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    let task = {
        type: 'amui:',
        url: uiUrl + '?version=' + global.DC_VERSION,
        additionalHeader: {}
    };

    task.additionalHeader['Content-Type'] = 'application/zip';
    task.additionalHeader['X-TenantId'] = tId;
    let amui = fs.readFileSync(path.join(__dirname, '/../../etc/AMUI/AMUI_kdn.zip'));

    task['payload'] = amui;
    queue.addTask(task);
}
