/* eslint-disable indent */
// eslint-disable-next-line spaced-comment
/*******************************************************************************
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/
'use strict';

var path = require('path');

var aspect = require('./lib/aspect.js');
var fs = require('fs');
var PropertyReader = require('properties-reader');
var properties = PropertyReader(__dirname + '/appmetrics-zipkin.properties');
var {Endpoint, Span} = require('zipkin/lib/model');
Endpoint.prototype.setServiceName = function setServiceName(serviceName) {
    // In zipkin, names are lowercase. This eagerly converts to alert users early.
    this.serviceName = serviceName || undefined;
};
Span.prototype.setName = function setName(name) {
    // In zipkin, names are lowercase. This eagerly converts to alert users early.
    this.name = name || undefined;
};

const {
    BatchRecorder,
    jsonEncoder: {JSON_V2}
} = require('zipkin');

const {
    HttpLogger
} = require('zipkin-transport-http');
const HttpsLogger = require('./lib/zipkin-transport-https');

// Load module probes into probes array by searching the probes directory.
var probes = [];

var dirPath = path.join(__dirname, 'probes');
var files = fs.readdirSync(dirPath);
var processName = '';

module.exports = function(options) {
    options = options;
    processName = path.basename(process.argv[1]);
    if (processName.includes('.js')) {
        processName = processName.substring(0, processName.length - 3);
    }
    files.forEach(function(fileName) {
        var file = path.join(dirPath, fileName);
        var probeModule = new (require(file))();
        probes.push(probeModule);
    });
    start(options);
};

function start(options) {
    // Set up the zipkin
    var host, port, serviceName, sampleRate;
    var zipkin_endpoint, pfx, passphase;

    global.KNJ_TT_MAX_LENGTH = global.KNJ_TT_MAX_LENGTH || 128;

    // Uses properties from file if present
    if (properties) {
        if (properties.get('host')) {
            host = properties.get('host');
        }
        if (properties.get('port')) {
            port = properties.get('port');
        }
        if (properties.get('serviceName')) {
            serviceName = properties.get('serviceName');
        }
        if (properties.get('sampleRate')) {
            sampleRate = properties.get('sampleRate');
        }
    }
    if (options) {
        host = options['host'];
        port = options['port'];
        if (options.zipkinEndpoint) {
            zipkin_endpoint = options.zipkinEndpoint;
        }
        if (options.pfx) {
            pfx = options.pfx;
        }
        if (options.passphase) {
            passphase = options.passphase;
        }
        serviceName = options['serviceName'];
        sampleRate = options['sampleRate'];
    }

    if (!serviceName) {
        serviceName = 'default'; // processName;
    }
    if (!host) {
        host = 'localhost';
    }
    if (!port) {
        port = 9411;
    }
    if (!sampleRate) {
        sampleRate = 1.0;
    }

    // Test if the host & port are valid
    // if (host && port) {
    //   tcpp.probe(host, port, function(err, available) {
    //     if (err) {
    //       console.log('Unable to contact Zipkin at ' + host + ':' + port);
    //       return;
    //     }
    //     if (!available) {
    //       console.log('Unable to contact Zipkin at ' + host + ':' + port);
    //     }
    //   });
    // }

    const zipkinUrl = zipkin_endpoint || `http://${host}:${port}/api/v2/spans`;
    const recorder = new BatchRecorder({
        logger: zipkinUrl.startsWith('https:') ?
            new HttpsLogger({
                endpoint: zipkinUrl,
                jsonEncoder: JSON_V2,
                pfx: pfx,
                passphase: passphase
            }) :
            new HttpLogger({
                endpoint: zipkinUrl,
                jsonEncoder: JSON_V2
            })
    });

    // Configure and start the probes
    probes.forEach(function(probe) {
        probe.setConfig(options);
        probe.setRecorder(recorder);
        probe.setServiceName(serviceName);
        probe.start();
        //    probe.enableRequests();
    });
}

module.exports.update = function(options) {
    start(options);
    // for (var i = 0; i < probes.length; i++) {
    //   probes[i].updateServiceName(probes[i].serviceName);
    // }
    probes.forEach(function(probe) {
        probe.updateProbes();
        //    probe.enableRequests();
    });
};

module.exports.updateServiceName = function(serviceName) {
    probes.forEach(function(probe) {
        probe.setServiceName(serviceName);
        probe.updateProbes();
    });
};

module.exports.updatePathFilter = function(paths) {
    probes.forEach(function(probe) {
        probe.setPathFilter(paths);
        probe.updateProbes();
    });
};


module.exports.updateHeaderFilter = function(headers) {
    probes.forEach(function(probe) {
        probe.setHeaderFilter(headers);
        probe.updateProbes();
    });
};


module.exports.updateIbmapmContext = function(context) {
    probes.forEach(function(probe) {
        probe.setIbmapmContext(context);
        probe.updateProbes();
    });
};

module.exports.stop = function() {
    probes.forEach(function(probe) {
        probe.stop();
        //    probe.enableRequests();
    });
};

module.exports.disable = function() {
    probes.forEach(function(probe) {
        probe.disable();
        //    probe.enableRequests();
    });
};
module.exports.enable = function() {
    probes.forEach(function(probe) {
        probe.enable();
        //    probe.enableRequests();
    });
};
/*
 * Patch the module require function to run the probe attach function
 * for any matching module. This loads the monitoring probes into the modules
 */
var data = {};
/* eslint no-proto:0 */
aspect.after(module.__proto__, 'require', data, function(obj, methodName, args, context, ret) {
    if (ret == null || ret.__ddProbeAttached__) {
        return ret;
    } else {
        for (var i = 0; i < probes.length; i++) {
            if (probes[i].name === args[0]) {
                ret = probes[i].attach(args[0], ret, module.exports);
            }
        }
        return ret;
    }
});
