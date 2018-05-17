// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
'use strict';
var fs = require('fs');
var url = require('url');
var crypto = require('crypto');
var restClient = require('./ibm_apm_restclient/lib/restclient/httpsender.js');
var aarTools = require('./tool/aartools');
var adrTools = require('./tool/adrtools');
var uuid = require('uuid');
var os = require('os');
var commonTools = require('./tool/common');
var k8sutil = require('../lib/ibm_apm_restclient/lib/tools/k8sutil');
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');
var serviceEndPointResIDs = [];
var hostPorts = {};
// var instanceResID;

// var getSourceDomain = function() {
//     if (process.env.VCAP_APPLICATION) {
//         return 'Public Cloud';
//     } else if (k8sutil.isICP()) {
//         return 'Private Cloud';
//     } else {
//         return 'On-premise';
//     }

// };

var getDeployment = function() {
    if (k8sutil.isICP()) {
        return 'cloud';
    } else {
        return 'traditional';
    }

};


function JsonSender() {
    this.port = 443;
    this.app_hostname = os.hostname();
    this.nodeAppString = undefined;
    this.nodeAppMD5String = undefined;
    this.applicationName = process.env.APPLICATION_NAME;
    this.osMD5 = undefined;
    this.nodeRuntimeString = undefined;
    this.nodeRuntimeMD5String = undefined;
    this.nodeAppRuntimeString = undefined;
    this.nodeAppRuntimeMD5String = undefined;
    this.nodeAppNPMString = undefined;
    this.nodeAppNPMMD5String = undefined;
    this.interfaceMD5String = undefined;
    this.serviceEndPointMD5Strings = [];
    this.instanceString = undefined;
    this.instanceMD5String = undefined;
    this.isServiceEndPointReady = false;
    this.externalRegister = {};
    this.startTime = (new Date()).toISOString();
    this.vcap = undefined;

    this.app_data = undefined;

    this.isAppMetricInitialized = false;
    this.environment = undefined;

    this.registeredAll = false;
    this.aarBatchForBI = {
        payload: [],
        committed: false
    };
    this.dcversion = global.DC_VERSION ? global.DC_VERSION : getDCVersion();
    this.serviceIds = [];
    this.serviceNames = [];
    this.isicp = k8sutil.isICP();
}

function getDCVersion() {
    var packageFile = __dirname + '/../package.json';
    var packageString = fs.readFileSync(packageFile);
    var packageJson = JSON.parse(packageString);
    if (packageJson && packageJson.version) {
        return packageJson.version;
    }
    return '1.0.0';
};

function getServerAddress(family, defAddr) {
    var interfaces = os.networkInterfaces();
    for (var intf in interfaces) {
        if (interfaces.hasOwnProperty(intf)) {
            var iface = interfaces[intf];
            // console.log(iface);
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];

                if (alias.family === family && alias.address !== '127.0.0.1' &&
                    alias.address !== '::1' && !alias.internal)
                    return alias.address;
            }
        }
    }
    return defAddr || '127.0.0.1';
}

var _this = this;
JsonSender.prototype.register = function register() { // Register DC and Resouce
    // Prepare Node.js App related reusable strings: this.applicationName, this.nodeAppMD5String

    logger.debug('Register...');
    var path = process.mainModule ? process.mainModule.filename : process.argv[1];
    _this.IP = getServerAddress('IPv4', '127.0.0.1');
    _this.IPv6 = getServerAddress('IPv6', '::1');
    if (process.env.VCAP_APPLICATION) {
        _this.vcap = JSON.parse(process.env.VCAP_APPLICATION);
        _this.applicationName = _this.applicationName || _this.vcap.application_name;
        _this.nodeAppString = _this.vcap.application_id;
        _this.nodeAppMD5String = _this.vcap.application_id;
        _this.nodeAppNPMString = _this.IP + process.version;
        _this.instanceString = _this.vcap.instance_id;
        _this.instanceMD5String = _this.vcap.instance_id;
        _this.nodeRuntimeString = _this.vcap.application_id + 'nodeserver';
        _this.nodeAppRuntimeString = _this.vcap.application_id + 'nodeapplicationruntime';
    } else if (_this.isicp) {
        _this.applicationName = _this.applicationName || k8sutil.getNamespace() +
            k8sutil.getPodName() + path;

        _this.nodeAppString = k8sutil.getNamespace() +
            (process.env.APPLICATION_NAME ||
                k8sutil.getDeployName() || k8sutil.getPodGenerateName());

        _this.nodeAppNPMString = k8sutil.getNamespace() + k8sutil.getContainerID() +
            k8sutil.getPodName() + process.version;
        _this.instanceString = k8sutil.getNamespace() + k8sutil.getContainerID() + path;
        _this.instanceMD5String = crypto.createHash('md5').update(_this.instanceString)
            .digest('hex');
        // _this.instanceMD5String = k8sutil.getContainerID();
        // instanceResID = _this.instanceMD5String;
        _this.nodeRuntimeString = k8sutil.getNamespace() + k8sutil.getContainerID() + 'nodeserver';
        _this.nodeAppRuntimeString = k8sutil.getNamespace() + k8sutil.getContainerID() +
            'nodeapplicationruntime';
        _this.serviceNames = k8sutil.getFullServiceName();
        _this.serviceIds = k8sutil.getServiceID();
        _this.nodeAppMD5String = crypto.createHash('md5').update(_this.nodeAppString)
            .digest('hex');
    } else {
        _this.applicationName = _this.applicationName || process.argv[1];
        _this.nodeAppString = _this.app_hostname + _this.applicationName;
        _this.nodeAppNPMString = _this.IP + process.version;
        _this.instanceString = _this.IP + path + _this.applicationName;
        _this.instanceMD5String = crypto.createHash('md5').update(_this.instanceString)
            .digest('hex');
        _this.nodeRuntimeString = _this.nodeAppString + 'nodeserver';
        _this.nodeAppRuntimeString = _this.nodeAppString + 'nodeapplicationruntime';
        _this.nodeAppMD5String = crypto.createHash('md5').update(_this.nodeAppString)
            .digest('hex');
    }
    _this.nodeRuntimeMD5String = crypto.createHash('md5').update(_this.nodeRuntimeString)
        .digest('hex');
    _this.nodeAppRuntimeMD5String = crypto.createHash('md5').update(_this.nodeAppRuntimeString)
        .digest('hex');
    _this.nodeAppNPMMD5String = crypto.createHash('md5').update(_this.nodeAppNPMString)
        .digest('hex');


    _this.dcMD5String = crypto.createHash('md5').update(_this.instanceString + 'NodejsDC')
        .digest('hex');
    logger.debug('The plain text of node server id: ', _this.nodeRuntimeString);
    logger.debug('The plain text of node application runtime id: ', _this.nodeAppRuntimeMD5String);
    logger.debug('The plain text of npm id: ', _this.nodeAppNPMString);
    logger.debug('The plain text of application instance id: ', _this.instanceString);
    logger.debug('The plain text of application id: ', _this.nodeAppString);
    logger.debug('The plain text of provider id: ', _this.instanceString + 'NodejsDC');

    // Register DC:
    _this.registerDC();
    // register NPM Packages:
    _this.registerNPM();

};

JsonSender.prototype.registerDC = function registerDC() {
    var dcObj = {
        id: this.dcMD5String,
        type: ['provider', 'NodeDC'],
        deployment: getDeployment(),
        startedTime: this.startTime,
        properties: {
            name: 'NodeJSDC',
            version: this.dcversion
        }
    };

    if (this.isicp) {
        dcObj.properties.namespace = k8sutil.getNamespace();
    }
    if (process.env.KNJ_ENABLE_DEEPDIVE &&
        process.env.KNJ_ENABLE_DEEPDIVE.toLowerCase() === 'true') {
        dcObj.properties.diagnosticsEnabled = true;
    } else {
        dcObj.properties.diagnosticsEnabled = false;
    }

    if (process.env.KNJ_ENABLE_METHODTRACE &&
        process.env.KNJ_ENABLE_METHODTRACE.toLowerCase() === 'true') {
        dcObj.properties.methodTraceEnabled = true;
    } else {
        dcObj.properties.methodTraceEnabled = false;
    }
    if (process.env.KNJ_ENABLE_TT &&
        process.env.KNJ_ENABLE_TT.toLowerCase() === 'true') {
        dcObj.properties.transactionTrackingEnabled = true;
    } else {
        dcObj.properties.transactionTrackingEnabled = false;
    }

    dcObj.references = [
        { direction: 'to', type: 'monitors', id: this.nodeAppRuntimeMD5String },
        { direction: 'to', type: 'monitors', id: this.nodeAppMD5String },
        { direction: 'to', type: 'monitors', id: this.instanceMD5String }
    ];
    restClient.registerDC(dcObj);

};

JsonSender.prototype.registerNPM = function registerNPM() {

    var npmObj = {
        id: this.nodeAppNPMMD5String,
        type: ['npm'],
        deployment: getDeployment(),
        properties: {
            name: 'NPM Packages'
        },
        references: [
            { direction: 'to', type: 'deployedTo', id: this.nodeRuntimeMD5String }
        ]
    };
    if (this.isicp) {
        npmObj.properties.namespace = k8sutil.getNamespace();
    }
    if (process.mainModule.paths && process.mainModule.paths.length > 0) {
        var find = false;
        for (let i in process.mainModule.paths) {
            var packageFile = process.mainModule.paths[i].split('node_modules')[0] +
                '/' + 'package.json';
            try {
                let packageStr = fs.readFileSync(packageFile);
                let packJson = JSON.parse(packageStr);
                if (packJson.dependencies) {
                    npmObj['VersionDependencies'] = {};
                }
                for (let dkey in packJson.dependencies) {
                    logger.debug('-->' + dkey + ': ' + packJson.dependencies[dkey]);
                    npmObj['VersionDependencies'][dkey] = packJson.dependencies[dkey];
                }
                find = true;
                break;
            } catch (e) {
                logger.error('Failed to get ' + packageFile);
            }
        }
        if (!find) {
            logger.warn('Failed to get package.json, will not generate NPM properties.');
        }
    }

    restClient.registerResource(npmObj);
};

JsonSender.prototype.init = function init(envType) {
    _this = this;
    var the_port;
    try {
        if (process.env.KNJ_CONFIG_FILE) {
            restClient.setConfiguration('./' + process.env.KNJ_CONFIG_FILE);
        } else {
            restClient.setConfiguration('./config.json');
        }
        this.register();
        _this.IP = getServerAddress('IPv4', '127.0.0.1');
        _this.IPv6 = getServerAddress('IPv6', '::1');

        var vcapApplication;
        if (process.env.VCAP_APPLICATION) {
            vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);

            _this.app_data = {
                APP_NAME: this.applicationName || vcapApplication['application_name'],
                INSTANCE_ID: vcapApplication['instance_id'],
                INSTANCE_INDEX: vcapApplication['instance_index'],
                URI: vcapApplication['uris'],
                START_TIME: vcapApplication['started_at'],
                APP_PORT: vcapApplication['port']
            };
        } else {
            the_port = commonTools.getServerPort();
            the_port = the_port === 'unknown' ? 0 : the_port;

            if (!process.env.APPLICATION_NAME) {
                // find name in package.json
                if (process.mainModule.paths && process.mainModule.paths.length > 0) {
                    var name = generateAppNameByPackage();

                    if (!name) {
                        logger.warn('Failed to get name in package.json,' +
                            ' will generate applicationName and' +
                            ' APP_GUID by file position.');
                        this.generateAppNameAndGuidbyPath();
                    } else {
                        this.applicationName = name;
                    }
                } else {
                    this.generateAppNameAndGuidbyPath();
                }
            }

            _this.app_data = {
                APP_NAME: this.applicationName,
                INSTANCE_ID: '' + process.pid,
                INSTANCE_INDEX: 0,
                URI: [os.hostname() + ':' + the_port],
                START_TIME: (new Date()).toISOString(),
                APP_PORT: the_port
            };
        }
    } catch (e) {
        logger.error('JsonSender initialization error: ' + e);
        logger.error(e.stack);
    }

};

JsonSender.prototype.generateAppNameAndGuidbyPath = function generateAppNameAndGuidbyPath() {
    var the_path = process.env.PWD;
    var the_folder = the_path.replace(/\//g, '_');
    var arg_str = process.argv[1].replace(/\//g, '_');
    var appGuid = os.hostname() + '_' + the_folder + '_' + arg_str;
    var nodeAppNPMMD5 = crypto.createHash('md5');
    nodeAppNPMMD5.update(appGuid);
    appGuid = nodeAppNPMMD5.digest('hex');

    if (process.argv[1].indexOf(the_path) !== -1)
        this.applicationName = this.applicationName || process.argv[1];
    else
        this.applicationName = this.applicationName || the_path + '/' + process.argv[1];
};

function generateAppNameByPackage() {
    let name;
    for (let i in process.mainModule.paths) {
        if (process.mainModule.paths.hasOwnProperty(i)) {
            let packageFile = process.mainModule.paths[i].split('node_modules')[0] +
                '/' + 'package.json';
            try {
                let packageString = fs.readFileSync(packageFile);
                let packageJson = JSON.parse(packageString);
                if (packageJson.name) {
                    name = packageJson.name;
                    break;
                }
            } catch (e) {
                logger.info('Could not found the ' + packageFile);
            }
        }
    }
    return name;
}

JsonSender.prototype.registerAppModel = function registerAppModel() {
    if (this.vcap && !global.RESOURCE_SVCEP_REGISTED) {
        global.RESOURCE_SVCEP_REGISTED = true;
        for (var index = 0; index < this.vcap.application_uris.length; index++) {
            var uri = this.vcap.application_uris[index];
            var interfaceMD5String = crypto.createHash('MD5').update(uri + ':' + this.vcap.port)
                .digest('hex');
            this.serviceEndPointMD5Strings.push(interfaceMD5String);
            var interfaceObj = {
                id: interfaceMD5String,
                type: ['serviceEndpoint'],
                deployment: getDeployment(),
                properties: {
                    uri: uri,
                    port: this.vcap.port,
                    name: this.vcap.name
                },
                references: [
                    { direction: 'from', type: 'exposes', id: this.nodeAppMD5String }
                ]
            };
            restClient.registerResource(interfaceObj);
        }

        var instanceObj = {
            id: this.instanceMD5String,
            type: ['nodeServiceInstance'],
            deployment: getDeployment(),
            properties: {
                startedTime: this.startTime,
                name: this.applicationName + ':' + this.vcap.instance_index,
                instance_index: this.vcap.instance_index,
                instance_id: this.vcap.instance_id
            },
            references: [
                { direction: 'to', type: 'federates', id: this.nodeAppMD5String },
                { direction: 'to', type: 'runsOn', id: this.nodeRuntimeMD5String },
                { direction: 'to', type: 'dependsOn', id: this.nodeAppNPMMD5String }
            ]

        };
        for (var indexsvc = 0; indexsvc < this.serviceEndPointMD5Strings.length; indexsvc++) {
            var svcep = this.serviceEndPointMD5Strings[indexsvc];
            instanceObj.references.push({ direction: 'to', type: 'implements', id: svcep });
        }
        // var refs = getexternalRef();
        // if (refs.length > 0) {
        //     instanceObj.references = instanceObj.references.concat(refs);
        // }
        restClient.registerResource(instanceObj);
        this.registerAppRuntime();
    }
};
JsonSender.prototype.registerAppRuntime = function registerAppRuntime() {
    logger.debug('json-sender.js', 'registerAppRuntime', 'start');
    let runtimeObj = {
        id: this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        deployment: getDeployment(),
        properties: {
            name: 'Node Application Runtime'
        },
        references: [
            { direction: 'to', type: 'federates', id: this.nodeRuntimeMD5String },
            { direction: 'to', type: 'federates', id: this.instanceMD5String },
            { direction: 'to', type: 'dependsOn', id: this.nodeAppNPMMD5String }
        ]

    };

    restClient.registerResource(runtimeObj);
};

JsonSender.prototype.registerAppModelOnPre = function registerAppModelOnPre(reqData) {
    if (this.vcap || this.isicp) {
        return;
    }
    // global.RESOURCE_SVCEP_REGISTED = true;

    var host = reqData.requestHeader.host;
    if (!host.toLowerCase().startsWith('http')) {
        host = 'http://' + host;
    }
    var uri = url.parse(host);
    if (hostPorts[uri.href]) {
        return;
    }
    hostPorts[uri.href] = true;
    var interfaceMD5 = crypto.createHash('MD5');
    interfaceMD5.update(uri.protocol + '//' + uri.host);
    this.interfaceMD5String = interfaceMD5.digest('hex');
    var interfaceObj = {
        id: this.interfaceMD5String,
        type: ['serviceEndpoint'],
        deployment: getDeployment(),
        properties: {
            uri: uri.protocol + '//' + uri.hostname,
            port: uri.port === null ? 80 : uri.port,
            name: this.applicationName
        },
        references: [
            { direction: 'from', type: 'exposes', id: this.nodeAppMD5String }
        ]
    };
    restClient.registerResource(interfaceObj);

    var instanceObj = {
        id: this.instanceMD5String,
        type: ['nodeServiceInstance'],
        deployment: getDeployment(),
        properties: {
            startedTime: this.startTime,
            name: this.applicationName
        },
        references: [
            { direction: 'to', type: 'runsOn', id: this.nodeRuntimeMD5String },
            { direction: 'to', type: 'federates', id: this.nodeAppMD5String },
            { direction: 'to', type: 'implements', id: this.interfaceMD5String },
            { direction: 'to', type: 'dependsOn', id: this.nodeAppNPMMD5String }
        ]

    };

    restClient.registerResource(instanceObj);
    this.registerAppRuntimeOnPre();
};

JsonSender.prototype.registerAppRuntimeOnPre = function registerAppRuntimeOnPre() {
    logger.debug('json-sender.js', 'registerAppRuntimeOnPre', 'start');
    let runtimeObj = {
        id: this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        deployment: getDeployment(),
        properties: {
            name: 'Node Application Runtime'
        },
        references: [
            { direction: 'to', type: 'federates', id: this.nodeRuntimeMD5String },
            { direction: 'to', type: 'federates', id: this.instanceMD5String },
            { direction: 'to', type: 'dependsOn', id: this.nodeAppNPMMD5String }
        ]

    };

    restClient.registerResource(runtimeObj);
};
JsonSender.prototype.registerAppModelOnICP = function registerAppModelOnICP() {
    logger.debug('json-sender.js', 'registerAppModelOnICP', 'start');
    var svcArr = k8sutil.getServicesConn();
    for (var index = 0; index < svcArr.length; index++) {
        var svc = svcArr[index];
        // var uri = svc.clusterIP;
        // var port = svc.port.toString();
        // var interfaceMD5String = crypto.createHash('MD5').update(uri + ':' + port).digest('hex');
        this.serviceEndPointMD5Strings.push(svc.uid);
        serviceEndPointResIDs.push(svc.uid);
        var interfaceObj = {
            id: svc.uid,
            type: ['serviceEndpoint'],
            deployment: getDeployment(),
            properties: {
                name: this.applicationName,
                mergeTokens: svc.mergeTokens.concat([svc.uid]),
                namespace: k8sutil.getNamespace(),
                connections: svc.connections
            },
            references: [
                { direction: 'from', type: 'exposes', id: this.nodeAppMD5String }
            ]
        };
        if (svc.connections.length > 0) {
            interfaceObj.properties.uri = svc.connections[0];
        }
        if (svc.nodePort.length > 0) {
            interfaceObj.properties.connections = interfaceObj.properties.connections.concat(
                commonTools.combineArr(k8sutil.getNodeIPs(), ':', svc.nodePort));
        }
        restClient.registerResource(interfaceObj);
    }


    var instanceObj = {
        id: this.instanceMD5String,
        type: ['nodeServiceInstance'],
        deployment: getDeployment(),
        properties: {
            startedTime: this.startTime,
            name: this.applicationName,
            namespace: k8sutil.getNamespace(),
            mergeTokens: [
                k8sutil.getNodeName() + '.' + k8sutil.getNamespace() +
                '.' + k8sutil.getPodID() + '.' + k8sutil.getContainerName(),
                k8sutil.getContainerID(),
                k8sutil.getPodID()
            ]
        },
        references: [
            { direction: 'to', type: 'runsOn', id: this.nodeRuntimeMD5String },
            { direction: 'to', type: 'federates', id: this.nodeAppMD5String },
            { direction: 'to', type: 'dependsOn', id: this.nodeAppNPMMD5String }
        ]

    };
    if (k8sutil.getContainerID()) {
        instanceObj.properties.containerId = k8sutil.getContainerID();
    }
    if (k8sutil.getPodName()) {
        instanceObj.properties.podName = k8sutil.getPodName();
    }

    for (var indexsvc = 0; indexsvc < this.serviceEndPointMD5Strings.length; indexsvc++) {
        var svcep = this.serviceEndPointMD5Strings[indexsvc];
        instanceObj.references.push({ direction: 'to', type: 'implements', id: svcep });
    }
    restClient.registerResource(instanceObj);
    this.registerAppRuntimeOnICP();
    global.SERVICEENDPOINT_REGISTED = true;
};

JsonSender.prototype.registerAppRuntimeOnICP = function registerAppRuntimeOnICP() {
    logger.debug('json-sender.js', 'registerAppRuntimeOnICP', 'start');
    let containerId = k8sutil.getContainerID();
    let runtimeObj = {
        id: this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        deployment: getDeployment(),
        properties: {
            name: this.applicationName + '.' + containerId.substr(containerId.length - 5, 5),
            namespace: k8sutil.getNamespace(),
            mergeTokens: [
                k8sutil.getNodeName() + '.' + k8sutil.getNamespace() +
                '.' + k8sutil.getPodID() + '.' + k8sutil.getContainerName(),
                k8sutil.getContainerID(),
                k8sutil.getPodID()
            ]
        },
        references: [
            { direction: 'to', type: 'federates', id: this.nodeRuntimeMD5String },
            { direction: 'to', type: 'federates', id: this.instanceMD5String },
            { direction: 'to', type: 'dependsOn', id: this.nodeAppMD5String }
        ]

    };
    if (k8sutil.getContainerID()) {
        runtimeObj.properties.containerId = k8sutil.getContainerID();
    }
    if (k8sutil.getPodName()) {
        runtimeObj.properties.podName = k8sutil.getPodName();
    }

    restClient.registerResource(runtimeObj);
};


JsonSender.prototype.dynamicRegister = function dynamicRegister(env) {
    logger.debug('json-sender.js', 'dynamicRegister', this.registeredAll);
    if (this.registeredAll) {
        return;
    }
    var osEnvItems = {};
    var appEnvItems = {};
    var engineEnvItems = {};

    for (var entry in env) {
        if (entry.substring(0, 3) === 'os.')
            osEnvItems[entry] = env[entry];
        else if (entry === 'runtime.version' ||
            entry === 'runtime.name' ||
            entry === 'agentcore.version' ||
            entry === 'heap.size.limit' ||
            entry === 'max.old.space.size' ||
            entry === 'max.heap.size' ||
            entry === 'max.semi.space.size') {
            engineEnvItems[entry] = env[entry];
        } else {
            appEnvItems[entry] = env[entry];
        }
    }

    var nodeEngineObj = {
        id: this.nodeRuntimeMD5String,
        type: ['nodeServer'],
        deployment: getDeployment(),
        properties: commonTools.merge([{
            name: 'Node.js Server',
            mergeTokens: [this.IP, 'IPv6:' + this.IPv6, this.app_hostname]
        }, engineEnvItems]),
        VersionDependencies: {
            version: process.versions.node,
            http_parser: process.versions.http_parser,
            v8: process.versions.v8,
            ares: process.versions.ares,
            uv: process.versions.uv,
            zlib: process.versions.zlib,
            modules: process.versions.modules,
            openssl: process.versions.openssl
        }
        // },
        // references: [{
        //     type: 'runsOn',
        //     matchTokens: [this.IP, 'IPv6:' + this.IPv6, this.app_hostname]
        // }
        // ]

    };
    if (this.isicp) {
        nodeEngineObj.properties.namespace = k8sutil.getNamespace();
    }
    restClient.registerResource(nodeEngineObj);

    var nodeappPayload = {
        id: this.nodeAppMD5String,
        type: ['service'],
        deployment: getDeployment(),
        properties: commonTools.merge([{
            version: process.versions.node,
            name: this.applicationName,
            path: process.mainModule ? process.mainModule.filename : process.argv[1]
        }, appEnvItems])
    };
    if (this.vcap) {
        nodeappPayload.properties.applicationId = this.vcap.application_id;
        nodeappPayload.properties.spaceName = this.vcap.space_name;
        nodeappPayload.properties.spaceId = this.vcap.space_id;
        // nodeappPayload.properties.instance_index = undefined;
        // nodeappPayload.properties.instance_id = undefined;

    }
    nodeappPayload.properties.isCluster = isCluster();
    if (this.isicp) {
        nodeappPayload.properties.namespace = k8sutil.getNamespace();
    }
    restClient.registerAppResource(nodeappPayload);

    if (this.isicp) {
        this.registerAppModelOnICP();
    } else if (this.vcap) {
        this.registerAppModel();
    }
    this.registeredAll = true;
};


var isCluster = function() {
    var cluster = require('cluster');
    if (cluster.isWorker) {
        return true;
    }
    if ((cluster.isMaster) && (Object.keys(cluster.workers).length > 1)) {
        return true;
    }
    return false;
};

JsonSender.prototype.setEnvironment = function setEnvironment(env) {
    logger.debug('json-sender.js', 'setEnvironment', env);
    this.isAppMetricInitialized = true;
    this.environment = env;
};

JsonSender.prototype.send = function send(data) {
    if (data == null || data.appInfo == null) {
        return;
    }
    if (this.isAppMetricInitialized) {
        this.dynamicRegister(this.environment);
    }
    var metricPayloads = [];
    var dimensions_content = {};
    if (this.isicp) {
        for (var i = 0, len = this.serviceNames.length; i < len; i++) {
            dimensions_content[this.serviceNames[i]] = 'serviceIds';
        }
        if (this.serviceNames.length <= 0) {
            this.serviceNames = k8sutil.getFullServiceName();
        }
    }
    let resid1 = {};
    let resid2 = {};
    let resid3 = {};
    if (this.nodeAppRuntimeMD5String) {
        resid1.applicationRuntimeResourceID = this.nodeAppRuntimeMD5String;
        resid3.applicationRuntimeResourceID = this.nodeAppRuntimeMD5String;
    }
    if (this.nodeRuntimeMD5String) {
        resid1.serverResourceID = this.nodeRuntimeMD5String;
        resid2.serverResourceID = this.nodeRuntimeMD5String;
        resid3.serverResourceID = this.nodeRuntimeMD5String;
    }
    if (this.nodeAppNPMMD5String) {
        resid1.npmResourceID = this.nodeAppNPMMD5String;
        resid2.npmResourceID = this.nodeAppNPMMD5String;
        resid3.npmResourceID = this.nodeAppNPMMD5String;
    }
    if (this.nodeAppMD5String) {
        resid2.serviceResourceID = this.nodeAppMD5String;
        resid1.serviceResourceID = this.nodeAppMD5String;
    }
    if (this.instanceMD5String) {
        resid2.serviceInstanceResourceID = this.instanceMD5String;
        resid3.serviceInstanceResourceID = this.instanceMD5String;
    }
    var reqSummPayload = this.genReqSumm(commonTools.merge([dimensions_content, resid1]), data);
    metricPayloads.push(reqSummPayload);

    var reqsSummPayload =
        this.genRequestSummaries(commonTools.merge([dimensions_content, resid3]), data);
    metricPayloads = metricPayloads.concat(reqsSummPayload);

    if (this.nodeAppRuntimeMD5String) {

        var enginePayloadMeta = {
            resourceID: this.nodeAppRuntimeMD5String,
            timestamp: new Date().toISOString()
        };
        var gcPayload = this.genGCPayload(commonTools.merge([dimensions_content, resid2]),
            data, enginePayloadMeta);
        metricPayloads.push(gcPayload);

        var elPayload = this.genELPayload(commonTools.merge([dimensions_content, resid2]),
            data, enginePayloadMeta);
        metricPayloads = metricPayloads.concat(elPayload);

        var sysPayload = this.genSysInfo(commonTools.merge([dimensions_content, resid2]),
            data, enginePayloadMeta);
        metricPayloads.push(sysPayload);
    }
    // Plus other parts for BI
    var payloadBISpecial = {
        BIOnly: true,
        APP_NAME: this.app_data.APP_NAME,
        INSTANCE_ID: this.app_data.INSTANCE_ID,
        INSTANCE_INDEX: this.app_data.INSTANCE_INDEX,
        URI: this.app_data.URI,
        START_TIME: this.app_data.START_TIME,
        APP_PORT: this.app_data.APP_PORT,
        PORT: data.appInfo.PORT,
        HTTP_REQ: data.httpReq,
        eventloop_time: data.El.eventloop_time,
        averageEventLoopLatency: data.El.eventloop_latencyAvg,
        minimumEventLoopLatency: data.El.eventloop_latencyMin,
        maximumEventLoopLatency: data.El.eventloop_latencyMax,
        averageEventLoopTickTime: data.El.loop_average,
        maximumEventLoopTickTime: data.El.loop_maximum,
        minimumEventLoopTickTime: data.El.loop_minimum,
        eventLoopTickCount: data.El.loop_count,
        REQCOUNT: data.appInfo.REQCOUNT,
        PID: data.appInfo.PID,
        APP_ENTRY: data.appInfo.APP_ENTRY,
        app_memAll: data.appInfo.app_memAll,
        app_uptime: data.appInfo.app_uptime
    };
    if (data.appInfo.TYPE) {
        payloadBISpecial.TYPE = data.appInfo.TYPE;
    }
    metricPayloads.push(payloadBISpecial);
    restClient.sendMetrics(metricPayloads);
    if (data.prof.length > 0) {
        this.sendMethodProfiling(data.prof, data.profMeta);
    }
    return;
};
JsonSender.prototype.genELPayload = function genELPayload(dimensions_content,
    data, enginePayloadMeta) {
    var elPayload = [];
    for (let index in data.EL_Arr) {
        let eventloop = data.EL_Arr[index];
        enginePayloadMeta.timestamp = new Date(eventloop.eventloop_timestamp).toISOString();
        elPayload.push(commonTools.merge([
            enginePayloadMeta, {
                metrics: {
                    averageEventLoopLatency: eventloop.eventloop_latencyAvg,
                    minimumEventLoopLatency: eventloop.eventloop_latencyMin,
                    maximumEventLoopLatency: eventloop.eventloop_latencyMax
                }
            }, {
                tags: commonTools.merge([dimensions_content,
                    { _componentType: 'eventLoop' }
                ])
            }
        ]));
    }

    for (let index in data.Loop_Arr) {
        let loop = data.Loop_Arr[index];
        enginePayloadMeta.timestamp = new Date(loop.loop_timestamp).toISOString();
        elPayload.push(commonTools.merge([
            enginePayloadMeta, {
                metrics: {
                    averageEventLoopTickTime: loop.loop_average,
                    maximumEventLoopTickTime: loop.loop_maximum,
                    minimumEventLoopTickTime: loop.loop_minimum,
                    loopCpuUser: loop.loop_cpu_user,
                    loopCpuSystem: loop.loop_cpu_system,
                    eventLoopTickCount: loop.loop_count
                }
            }, {
                tags: commonTools.merge([dimensions_content,
                    { _componentType: 'loop' }
                ])
            }
        ]));
    }

    return elPayload;
};
JsonSender.prototype.genGCPayload = function genGCPayload(dimensions_content,
    data, enginePayloadMeta) {
    var gcPayload = commonTools.merge([
        enginePayloadMeta, {
            metrics: {
                gcDuration: data.GC.gc_duration,
                scavengeGcCount: data.GC.gc_sCount,
                markSweepGcCount: data.GC.gc_mCount,
                incrementalMarkingGcCount: data.GC.gc_iCount,
                processWeakCallbacksGcCount: data.GC.gc_wCount,
                usedHeap: data.GC.gc_heapUsed,
                heapSize: data.GC.gc_heapSize
            }
        }, {
            tags: commonTools.merge([dimensions_content,
                { _componentType: 'garbageCollector' }
            ])
        }
    ]);
    return gcPayload;
};
JsonSender.prototype.genReqSumm = function genReqSumm(dimensions_content, data) {

    var requestSummary = {
        resourceID: this.instanceMD5String,
        tags: commonTools.merge([dimensions_content,
            { _componentType: 'requestSummary' }
        ]),
        metrics: commonTools.merge([{
            requestRate: data.appInfo.REQRATE,
            averageResponseTime: data.appInfo.RESP_TIME,
            slowestResponseTime: data.appInfo.MAX_RSPTIME
        }, data.appInfo2])
    };
    return requestSummary;
};

JsonSender.prototype.genRequestSummaries = function genRequestSummaries(dimensions_content, data) {
    var requestsSummaryPayload = [];
    for (var index in data.httpReq) {
        var req = data.httpReq[index];
        requestsSummaryPayload.push({
            resourceID: this.nodeAppMD5String,
            timestamp: new Date().toISOString(),
            tags: commonTools.merge([dimensions_content,
                {
                    _componentType: 'requestsSummary'
                }
            ]),
            metrics: {
                requestName: req['URL'],
                requestMethod: req['METHOD'],
                averageServiceResponseTime: req['REQ_RESP_TIME'],
                throughput: req['HIT_COUNT']
            }

        });
    }
    return requestsSummaryPayload;

};

JsonSender.prototype.genSysInfo = function genReqSumm(dimensions_content, data, enginePayloadMeta) {

    var sysInfo = commonTools.merge([
        enginePayloadMeta, {
            metrics: {
                sysCpuPercentage: data.computeInfo.os_sysCpuPercentage,
                sysMemoryAll: data.computeInfo.os_sysMemAll,
                sysMemoryUsed: data.computeInfo.os_sysMemUsed,
                sysMemoryFree: data.computeInfo.os_sysMemFree,
                cpuPercentage: data.appInfo.CPU_P,
                memoryRssSize: data.appInfo.MEM_RSS,
                memoryTotalSize: data.appInfo.app_memAll,
                virtualMemory: data.appInfo.virtualMemory,
                upTime: data.appInfo.UPTIME
            }
        }, {
            tags: commonTools.merge([dimensions_content,
                { _componentType: 'sysInfo' }
            ])
        }
    ]);
    return sysInfo;
};

JsonSender.prototype.getDataType = function getDataType() {
    return 'json';
};

JsonSender.prototype.sendAAR = function(req_inst) {
    logger.debug('json-sender.js', 'sendAAR');
    if (!(commonTools.testTrue(process.env.KNJ_ENABLE_TT)) &&
        process.env.KNJ_ENVTYPE === 'Cloudnative') {
        // send AAR from http request at resource level
        var interaction_info = {};
        if (req_inst.header && req_inst.requestHeader) {
            interaction_info =
                aarTools.extractInfoFromHeader(req_inst.header, req_inst.requestHeader);
        }
        interaction_info.method = req_inst.method;
        interaction_info.appName = req_inst.url;
        interaction_info.url = interaction_info.fullurl ||
            commonTools.getFullURL(req_inst.url, this.IP, commonTools.getServerPort(),
                interaction_info.protocol);

        var payload_json = {
            metrics: {
                status: req_inst.statusCode < 400 ? 'Good' : 'Failed',
                responseTime: req_inst.duration / 1000
            },
            properties: {
                // threadID: '0',
                documentType: '/AAR/Middleware/NODEJS',
                softwareServerType: 'http://open-services.net/ns/crtv#NodeJS',
                softwareModuleName: this.applicationName,
                resourceID: this.nodeAppMD5String,
                processID: process.pid,
                diagnosticsEnabled: commonTools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE),
                applicationName: this.applicationName,
                serverName: this.app_hostname,
                serverAddress: this.IP,
                requestName: req_inst.url,
                componentName: this.isicp ? 'Node.JS Application' : 'Bluemix Node.JS Application',
                transactionName: req_inst.url,
                documentVersion: '2.0', // why?
                startTime: (new Date(req_inst.time)).toISOString(),
                finishTime: (new Date(req_inst.time + req_inst.duration)).toISOString(),
                documentID: uuid.v1()
            },
            interactions: []
        };
        if (process.env.HYBRID_BMAPPID && process.env.HYBRID_BMAPPID !== 'undefined') {
            payload_json.properties.originID = global.KNJ_BAM_ORIGINID;
        }
        if (this.isicp && this.serviceIds.length > 0) {
            payload_json.properties.serviceIds = this.serviceIds;
        } else if (this.isicp) {
            this.serviceIds = k8sutil.getServiceID();
        }
        restClient.sendAAR(payload_json, function(err) {
            if (err) {
                logger.error(err.message);
            }
        }, global.KNJ_AAR_BATCH_ENABLED);
    }

};

JsonSender.prototype.sendAARTT = function(data) {
    logger.debug('json-sender.js', 'sendAARTT');
    var payload_json = aarTools.composeAARTT(data, commonTools.getServerPort());

    restClient.sendAAR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    }, global.KNJ_AAR_BATCH_ENABLED);
};

JsonSender.prototype.sendADR = function(data) {
    logger.debug('json-sender.js', 'sendADR');
    var payload_json = {
        properties: {
            startTime: data.time,
            finishTime: Math.floor(data.time + data.duration),
            documentType: 'ADR/Middleware/NODEJS',
            contentType: 'methodTrace',
            documentID: uuid.v1(),
            reqType: data.type.toUpperCase(),
            methodEntries: commonTools.testTrue(process.env.KNJ_ENABLE_METHODTRACE) ?
                'true' : 'false',
            reqName: data.name
        },
        statistics: {
            summary: {
                responseTime: data.duration / 1000
            }
        }
    };

    payload_json.statistics.traceData = adrTools.composeTraceData([], data.request, 1);

    restClient.sendADR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    });
};

JsonSender.prototype.sendMethodProfiling = function(data, meta) {
    var payload_json = {
        properties: {
            startTime: meta.startTime,
            finishTime: meta.finishTime,
            documentType: 'ADR/Middleware/NODEJS',
            contentType: 'methodProfiling',
            documentID: uuid.v1()
        },
        statistics: {
            summary: {}
        }
    };
    var traceData = [];
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            traceData.push({
                count: data[i].profiling_count,
                name: data[i].profiling_name,
                line: data[i].profiling_line,
                file: data[i].profiling_file
            });
        }
    }
    payload_json.statistics.summary.profilingSampleCount = meta.count;
    payload_json.statistics.traceData = traceData;
    restClient.sendADR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    });
};
exports.jsonSender = new JsonSender();
