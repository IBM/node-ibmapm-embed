// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
'use strict';
var fs = require('fs');
var path = require('path');
var logger = require('../plugins/logutil').getLogger('config.js');

function PluginConfig() {}

PluginConfig.prototype.queuetypes = {
    DC: 'DC',
    METRICS: 'METRICS',
    RESOURCE: 'RESOURCE',
    AAR: 'AAR',
    JSO: 'JSO',
    ADR: 'ADR'
};
PluginConfig.prototype.cfg = {
    //    ingressURL : undefined,
    tenantID: 'tenantid-0000-0000-0000-000000000000',
    metrics: 'metric',
    AAR: 'aar/middleware',
    ADR: 'adr/middleware',

    // target server
    serverURL: '',
    sslKeyFile: '',
    sslKeyFileUrl: '',
    sslKeyFilePassword: '',
    apmSNI: '',

    sendTransactionTrackingData: true,
    sendDiagnosticData: true,
    sendMethodTraceData: true
};
PluginConfig.prototype.consumerInsts = [];
PluginConfig.prototype.dcconsumers = [];
PluginConfig.prototype.resourceconsumers = [];
PluginConfig.prototype.aarconsumers = [];
PluginConfig.prototype.adrconsumers = [];
PluginConfig.prototype.metricconsumers = [];
PluginConfig.prototype.jsoconsumers = [];
PluginConfig.prototype.dataqueues = {};
PluginConfig.prototype.dcqueue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.metricqueue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.resourcequeue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.aarqueue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.adrqueue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.jsoqueue = {
    freq: 60 * 1000,
    isBatch: true,
    batchSize: 10
};
PluginConfig.prototype.destArr = [];

PluginConfig.prototype.plugins = [];


PluginConfig.prototype.init = function() {
    // load configuration from ENV
    if (process.env.APM_BM_SECURE_GATEWAY) {
        var tempConfig = {};
        tempConfig.serverURL = process.env.APM_BM_SECURE_GATEWAY;

        if (process.env.APM_KEYFILE_URL) {
            tempConfig.sslKeyFileUrl = process.env.APM_KEYFILE_URL;
        }

        if (process.env.APM_KEYFILE_PSWD) {
            tempConfig.sslKeyFilePassword = process.env.APM_KEYFILE_PSWD;
        }
        PluginConfig.prototype.destArr.push(tempConfig);
    }


};

PluginConfig.prototype.loadPluginsConf = function(filename, callback) {
    logger.debug('loadPluginsConf' + filename);
    logger.debug('current dir ' + __dirname);

    try {
        var fileContent = fs.readFileSync(filename, 'utf8');
        var jsonContent = JSON.parse(fileContent);
        this.cfg.tenantID = jsonContent.tenantID;
        this.cfg.ingressURL = jsonContent.ingressURL;
        if (jsonContent.dataqueues) {
            // init queue's defination.
            this.dataqueues = jsonContent.dataqueues;
            this.dataqueues.forEach(function(element) {

                if (element.name.toUpperCase() === this.queuetypes.DC) {
                    this.dcqueue.freq = element.frequency * 1000;
                    this.dcqueue.batchSize = element.batchsize;
                }

                if (element.name.toUpperCase() === this.queuetypes.METRICS) {
                    this.metricqueue.freq = element.frequency * 1000; ;
                    this.metricqueue.batchSize = element.batchsize;
                }

                if (element.name.toUpperCase() === this.queuetypes.RESOURCE) {
                    this.resourcequeue.freq = element.frequency * 1000; ;
                    this.resourcequeue.batchSize = element.batchsize;
                }

                if (element.name.toUpperCase() === this.queuetypes.AAR) {
                    this.aarqueue.freq = element.frequency * 1000; ;
                    this.aarqueue.batchSize = element.batchsize;
                }

                if (element.name.toUpperCase() === this.queuetypes.ADR) {
                    this.adrqueue.freq = element.frequency * 1000; ;
                    this.adrqueue.batchSize = element.batchsize;
                }
                if (element.name.toUpperCase() === this.queuetypes.JSO) {
                    this.jsoqueue.freq = element.frequency * 1000; ;
                    this.jsoqueue.batchSize = element.batchsize;
                }
            }, this);
        }

        for (var i = 0; i < jsonContent.consumers.length; i++) {
            try {
                this.plugins[jsonContent.consumers[i].name] = jsonContent.consumers[i];
                var pinst = require(path.join(__dirname, '/../../' +
                    jsonContent.consumers[i].plugin_file));
                var queuearr = jsonContent.consumers[i].listento.split(',');
                if (queuearr && queuearr.length > 0) {
                    if (queuearr.indexOf(this.queuetypes.DC) > -1) {
                        this.dcconsumers.push(pinst);
                    }
                    if (queuearr.indexOf(this.queuetypes.METRICS) > -1) {
                        this.metricconsumers.push(pinst);
                    }
                    if (queuearr.indexOf(this.queuetypes.RESOURCE) > -1) {
                        this.resourceconsumers.push(pinst);
                    }
                    if (queuearr.indexOf(this.queuetypes.AAR) > -1) {
                        this.aarconsumers.push(pinst);
                    }
                    if (queuearr.indexOf(this.queuetypes.ADR) > -1) {
                        this.adrconsumers.push(pinst);
                    }
                    if (queuearr.indexOf(this.queuetypes.JSO) > -1) {
                        this.jsoconsumers.push(pinst);
                    }
                }
            } catch (e) {
                logger.error('failed to instance plugin.' + jsonContent.consumers[i].plugin_file);
                logger.error(e);
            }
            this.consumerInsts.push(pinst);
        }
        if (callback) {
            callback(jsonContent);
        }
        return;
    } catch (e) {
        logger.error('failed to read configuration.');
        logger.error(e);
    }
};

PluginConfig.prototype.isValidConn = function(connection) {
    if (!connection) {
        return false;
    }
    if (!connection.server_url) {
        return false;
    }
    return true;
};

module.exports.pluginConfig = new PluginConfig();
