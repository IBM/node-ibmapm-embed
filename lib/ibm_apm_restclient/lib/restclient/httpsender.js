// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
'use strict';
var fs = require('fs');
var sender = require('./sender-queue');
var pluginconfig = require('./config').pluginConfig;
var logger = require('../plugins/logutil').getLogger('httpsender.js');

pluginconfig.loadPluginsConf(__dirname + '/../../etc/config.json');

var queue;
var cfg = {
    tenantID: 'tenantid-0000-0000-0000-000000000000',
    metrics: 'metric',
    AAR: 'aar/middleware',
    ADR: 'adr/middleware'
};

var dcId; // string
var resourceEntities = {}; // {<resourceid>:<entityid>, ...}
var relationships = {}; // {<resourceid>:[{type:<linktype>,to:<toresourceid>}], ...}

module.exports.checkReadyStatus = function(callback) {
    pluginconfig.consumerInsts.forEach(function(inst) {
        var name = inst.Name();
        inst.checkReadyStatus(function(initialized_status) {
            logger.debug(name + ' initialized = ' + initialized_status);
            if (initialized_status) {
                callback();
            }
        });
    });

    return;
};

module.exports.stop = function() {
    sender.stopQueue();
};

module.exports.setConfiguration = function(fileName, callback) {
    var tempCfg;
    logger.debug('Load configuration files: ', fileName);
    var file = process.env.KNJ_CONFIG_FILE || fileName;
    try {
        if (fs.existsSync(file)) {
            var confString = fs.readFileSync(file, 'utf8');
            tempCfg = JSON.parse(confString);
            cfg = tempCfg;
            if (!cfg.metrics) {
                cfg.metrics = 'metric';
            }
            if (!cfg.AAR) {
                cfg.AAR = 'aar/middleware';
            }
            if (!cfg.ADR) {
                cfg.ADR = 'adr/middleware';
            }
            if (cfg.proxy) {
                process.env.KNJ_PROXY = cfg.proxy;
            }
        } else {
            logger.info('No configuration file is set by KNJ_CONFIG_FILE');
        }
    } catch (e) {
        logger.error('register_topology set cofniguration failed.');
        logger.error(e);
    }
    if (process.env.IBAM_TENANT_ID) {
        cfg.tenantID = process.env.IBAM_TENANT_ID;
    }
    logger.debug('Configuration loaded ', cfg);
    if (callback && !global.AM_SERVICE_BOUND) {
        logger.debug('No backend BAM service, call the callback ', callback.name);
        callback();
    }
};

module.exports.getConfiguration = function() {
    return cfg;
};

module.exports._writeRegistryToFile = function() {
    try {
        var filename = './' + dcId + '.json';
        var fileContent = JSON.stringify({
            resourceEntities: resourceEntities,
            relationships: relationships
        });
        fs.writeFileSync(filename, fileContent, 'utf8');
    } catch (e) {
        logger.error('write registry to file failed');
        logger.error(e);
    }
};

module.exports._readRegistryFromFile = function() {
    try {
        var filename = './' + dcId + '.json';
        var fileContent = fs.readFileSync(filename, 'utf8');
        var jsonContent = JSON.parse(fileContent);
        resourceEntities = jsonContent.resourceEntities;
        relationships = jsonContent.relationships;
        return jsonContent;
    } catch (e) {
        logger.error('read registry to file failed');
        logger.error(e);
    }
};

module.exports.registerDC = function(obj, callback) {
    logger.debug('registerDC');
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    var payload = {
        uniqueId: obj.id,
        entityTypes: obj.type,
        startTime: obj.startTime || (new Date()).toISOString(), // '2016-05-27T03:21:25.432Z'
        sourceDomain: obj.sourceDomain
    };
    if (obj.references && obj.references.length > 0) {
        var references = [];
        for (var ref in obj.references) {
            var item = obj.references[ref];
            var ref_item = {
                _edgeType: item.type
            };
            ref_item['_' + item.direction + 'UniqueId'] = item.id;
            references.push(ref_item);
        }
        payload['_references'] = references;
    }

    for (var prop in obj.properties) { // merge properties
        payload[prop] = obj.properties[prop];
    }
    dcId = obj.id;

    queue.addTask({
        payload: payload,
        type: 'dc',
        callback: function(error, result) {
            if (callback) {
                callback(null, result);
            }
            if (error) {
                logger.error(error);
                if (callback) {
                    callback(error);
                }
                return;
            }
        }
    });
};

function genRef(refs) {
    let references = [];
    for (var ref in refs) {
        var item = refs[ref];
        var ref_item = {
            _edgeType: item.type
        };
        if (item.matchTokens) {
            ref_item.matchTokens = item.matchTokens;
        }
        if (item.id) {
            ref_item['_' + item.direction + 'UniqueId'] = item.id;
        }
        references.push(ref_item);
    }
    return references;
}
module.exports.registerAppResource = function(obj, callback) {
    logger.debug('register Application Resource ', obj);
    if (!obj.type || !obj.id || !obj.properties) {
        logger.error('registerResource payload is not complete, must have: ' +
            'id, type and properties');
        return;
    }
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    var payload = { // merge public attributes
        uniqueId: obj.id,
        entityTypes: obj.type,
        sourceDomain: obj.sourceDomain
    };
    if (obj.references && obj.references.length > 0) {
        payload['_references'] = genRef(obj.references);
    }
    for (var prop in obj.properties) { // merge properties
        payload[prop] = obj.properties[prop];
    }
    queue.addTask({
        payload: payload,
        type: 'resources: ' + payload.entityTypes,
        callback: function(err, result) {
            if (err) {
                logger.error(err);
                if (callback) {
                    callback(err);
                }
                return;
            }
            if (callback) {
                callback(null, result);
            }
        }
    });
};
module.exports.registerResource = function(obj, callback) {
    logger.debug('register Resource ', obj);
    if (!obj.type || !obj.id || !obj.properties) {
        logger.error('registerResource payload is not complete, must have: ' +
            'id, type and properties');
        return;
    }
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    var payload = { // merge public attributes
        uniqueId: obj.id,
        entityTypes: obj.type,
        sourceDomain: obj.sourceDomain
    };
    if (obj.VersionDependencies) {
        payload['VersionDependencies'] = obj.VersionDependencies;
    }
    if (obj.references && obj.references.length > 0) {
        payload['_references'] = genRef(obj.references);
    }
    for (var prop in obj.properties) { // merge properties
        payload[prop] = obj.properties[prop];
    }

    queue.addTask({
        payload: payload,
        callback: function(err, result) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                logger.error(err);
                return;
            }
            if (callback) {
                callback(null, result);
            }
        },
        type: 'resources: ' + payload.entityTypes
    });
};

module.exports.sendMetrics = function(payload, callback) {
    logger.debug('sendMetrics ', JSON.stringify(payload));
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    if (payload instanceof Array) {
        var timestamp = (new Date()).toISOString();

        for (var index = 0; index < payload.length; index++) {
            if (payload[index].hasOwnProperty('APP_NAME')) {
                continue; // ignore checking for additional items for BI payload
            }

            if (!payload[index].resourceID || !payload[index].dimensions ||
                !payload[index].metrics) {
                logger.warn('sendMetrics payload is not complete, must have: ' +
                    'resourceID, dimensions and metrics');
                return;
            }
            payload[index].timestamp = timestamp;
        }
    } else {
        if (!payload.resourceID || !payload.dimensions || !payload.metrics) {
            logger.warn('sendMetrics payload is not complete, must have: ' +
                'resourceID, dimensions and metrics');
            return;
        }
        payload.timestamp = (new Date()).toISOString();
    }
    queue.addTask({
        payload: payload,
        type: 'metrics: ',
        callback: callback
    });
};

var aarBatch = {
    payload: [],
    committed: false
};

module.exports.sendAAR = function(payload, callback, batched) {
    logger.debug('sendAAR', payload);
    if (!payload.properties || !payload.metrics) {
        logger.error('sendAAR payload is not complete, must have: properties and metrics');
        return;
    }
    if (!dcId) {
        callback({ message: 'dcId is not ready' });
        return;
    }
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    if (!batched) {
        queue.addTask({
            payload: payload,
            type: 'aar:',
            callback: callback
        });
        return;
    }

    if (payload.properties.originID) {
        delete payload.properties.originID;
    }
    payload.properties['tenantID'] = cfg.tenantID;
    // Meet Patch Condition KNJ_AAR_BATCH_FREQ, then put into task queue
    if (aarBatch.payload.length === 0) {
        aarBatch.committed = false;
        let timeoutObj = setTimeout(
            function() {
                if (aarBatch.payload.length > 0) {
                    queue.addTask({
                        payload: aarBatch.payload,
                        type: 'aar: batched',
                        callback: callback
                    });
                }
                aarBatch.payload = [];
                aarBatch.committed = true;
            },
            global.KNJ_AAR_BATCH_FREQ * 1000
        );
        timeoutObj.unref();
    }
    if (!aarBatch.committed) {
        aarBatch.payload.push(payload);
    }
    // Meet Patch Condition KNJ_AAR_BATCH_COUNT, then put into task queue
    if (aarBatch.payload.length >= global.KNJ_AAR_BATCH_COUNT) {
        queue.addTask({
            payload: aarBatch.payload,
            type: 'aar: batched',
            callback: callback
        });
        aarBatch.committed = true;
        aarBatch.payload = [];
    }
};

var adrBatch = {
    payload: [],
    committed: false
};
module.exports.sendADR = function(payload, callback) {
    if (!payload.properties || !payload.statistics) {
        logger.error('sendADR payload is not complete, must have: properties and statistics',
            payload);
        return;
    }
    if (!dcId) {
        callback({ message: 'dcId is not ready' });
    } else {
        if (!queue) {
            queue = sender.getQueue('bam');
        }
        payload.properties['originID'] = global.KNJ_BAM_ORIGINID;
        payload.properties['tenantID'] = cfg.tenantID;
        // Meet Patch Condition KNJ_ADR_BATCH_FREQ, then put into task queue
        if (adrBatch.payload.length === 0) {
            adrBatch.committed = false;
            let timeoutObj = setTimeout(
                function() {
                    if (adrBatch.payload.length > 0) {
                        queue.addTask({
                            payload: adrBatch.payload,
                            type: 'adr: batched',
                            callback: callback
                        });
                    }
                    adrBatch.payload = [];
                    adrBatch.committed = true;
                },
                global.KNJ_ADR_BATCH_FREQ * 1000
            );
            timeoutObj.unref();
        }
        if (!adrBatch.committed) {
            adrBatch.payload.push(payload);
        }
        if (adrBatch.payload.length >= global.KNJ_ADR_BATCH_COUNT) {
            queue.addTask({
                payload: adrBatch.payload,
                type: 'adr: batched',
                callback: callback
            });
            adrBatch.payload = [];
            adrBatch.committed = true;
        }
    }
};

module.exports.sendJSO = function(payload, callback) {
    logger.debug('sendJSO');
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    queue.addTask({
        payload: payload,
        type: 'jso: ',
        callback: callback
    });
};

// the type should be value of PluginConfig.prototype.queuetypes
module.exports.send = function(payload, type, callback) {
    if (!queue) {
        queue = sender.getQueue('bam');
    }
    if (type === pluginconfig.queuetypes.DC) {
        this.registerDC(payload, callback);
    }

    if (type === pluginconfig.queuetypes.RESOURCE) {
        this.registerResource(payload, callback);
    }

    if (type === pluginconfig.queuetypes.METRICS) {
        this.sendMetrics(payload, callback);
    }

    if (type === pluginconfig.queuetypes.AAR) {
        this.sendAAR(payload, callback);
    }

    if (type === pluginconfig.queuetypes.ADR) {
        this.sendADR(payload, callback);
    }

    if (type === pluginconfig.queuetypes.JSO) {
        this.sendJSO(payload, callback);
    }
};
