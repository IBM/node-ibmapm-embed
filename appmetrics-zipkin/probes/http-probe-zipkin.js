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

var Probe = require('../lib/probe.js');
var aspect = require('../lib/aspect.js');
var tool = require('../lib/tools.js');
var util = require('util');
var logger = global.knj_logger;

var serviceName;
var ibmapmContext;
var tracer;
var traceInfo = {};

const {
  Request,
  HttpHeaders: Header,
  option: {
    Some,
    None
  },
  Annotation,
  TraceId
} = require('zipkin');


function hasZipkinHeader(httpReq) {
  const headers = httpReq.headers || {};
  return headers[(Header.TraceId).toLowerCase()] !== undefined && headers[(Header.SpanId).toLowerCase()] !== undefined;
}

function HttpProbeZipkin() {
  Probe.call(this, 'http');
  this.config = {
    filters: []
  };
}
util.inherits(HttpProbeZipkin, Probe);


function stringToBoolean(str) {
  return str === '1';
}

function stringToIntOption(str) {
  try {
    // eslint-disable-next-line radix
    return new Some(parseInt(str, 10));
  } catch (err) {
    return None;
  }
}

HttpProbeZipkin.prototype.updateProbes = function() {
  serviceName = this.serviceName;
  ibmapmContext = this.ibmapmContext;
  tracer = this.tracer;
};

HttpProbeZipkin.prototype.attach = function(name, target) {
  serviceName = this.serviceName;
  tracer = this.tracer;
  var that = this;

  if (name === 'http') {
    if (target.__zipkinProbeAttached__) return target;
    target.__zipkinProbeAttached__ = true;
    var methods = ['on', 'addListener'];

    aspect.before(target.Server.prototype, methods,
      function(obj, methodName, args, probeData) {
        if (args[0] !== 'request') return;
        if (obj.__zipkinhttpProbe__) return;
        obj.__zipkinhttpProbe__ = true;
        aspect.aroundCallback(args, probeData, function(obj, args, probeData) {
          if (process.env.JAEGER_ENDPOINT_NOTREADY === 'true'){
            return;
          }
          var httpReq = args[0];
          var res = args[1];
          var childId;
          // Filter out urls where filter.to is ''
          var traceUrl = parse(httpReq.url);

          var passdown_edgeRequest = false;
          var passdown_reqMethod = 'GET';
          var passdown_sampled = true;

          if (traceUrl !== '') {
            [passdown_edgeRequest, passdown_reqMethod, traceUrl, passdown_sampled]
              = that.opentracingProbeStart(args, probeData, httpReq, traceUrl);
            aspect.after(res, 'end', probeData, function(obj, methodName, args, probeData, ret) {
              that.opentracingProbeEnd(probeData, traceUrl, passdown_edgeRequest, passdown_reqMethod, passdown_sampled, res);
            });
          }
        });
      });
  }
  return target;
};

HttpProbeZipkin.prototype.opentracingStart = function(methodArgs, probeData, httpReq, traceUrl) {
  var reqMethod = httpReq.method;
  var childId;
  var edgeRequest = false;
  var sampled = true;
  if (reqMethod.toUpperCase() === 'OPTIONS' && httpReq.headers['access-control-request-method']) {
    reqMethod = httpReq.headers['access-control-request-method'];
  }
  if (hasZipkinHeader(httpReq)) {
    const headers = httpReq.headers;
    var spanId = headers[(Header.SpanId).toLowerCase()];
    if (spanId !== undefined) {
      const traceId = new Some(headers[(Header.TraceId).toLowerCase()] || headers[(Header.TraceId)]);
      const parentSpanId = new Some(headers[(Header.ParentSpanId).toLowerCase()] || headers[(Header.ParentSpanId)]);
      const sampled = new Some(headers[(Header.Sampled).toLowerCase()] || headers[(Header.Sampled)]);
      const flags = (new Some(headers[(Header.Flags).toLowerCase()] || headers[(Header.Flags)])).flatMap(stringToIntOption).getOrElse(0);
      var id = new TraceId({
        traceId: traceId,
        parentId: parentSpanId,
        spanId: spanId,
        sampled: sampled.map(stringToBoolean),
        flags
      });
      tracer.setId(id);
      childId = tracer.createChildId();
      tracer.setId(childId);
      probeData.traceId = tracer.id;
    };
  } else {
    edgeRequest = true;
    tracer.setId(tracer.createRootId());
    probeData.traceId = tracer.id;
    // Must assign new options back to args[0]
    const { headers } = Request.addZipkinHeaders(methodArgs[0], tracer.id);
    Object.assign(methodArgs[0].headers, headers);
  }

  traceInfo[tracer.id._spanId] = 'start';

  sampled = (methodArgs[0].headers[(Header.Sampled)] || methodArgs[0].headers[(Header.Sampled).toLowerCase()]) === '1';
  var urlPrefix = 'http://' + httpReq.headers.host;
  var maxUrlLength = global.KNJ_TT_MAX_LENGTH;
  if (urlPrefix.length < global.KNJ_TT_MAX_LENGTH) {
    maxUrlLength = global.KNJ_TT_MAX_LENGTH - urlPrefix.length;
  } else {
    maxUrlLength = 1;
  }
  if (traceUrl.length > maxUrlLength) {
    traceUrl = traceUrl.substr(0, maxUrlLength);
  }

  if (sampled){
    tracer.recordBinary('http.url', urlPrefix + traceUrl);
    tracer.recordAnnotation(new Annotation.ServerRecv());
  }
  logger.debug('http-tracer(before): ', tracer.id, sampled, traceUrl);
  return [edgeRequest, reqMethod, traceUrl, sampled];
};

HttpProbeZipkin.prototype.opentracingEnd = function(probeData, traceUrl, edgeRequest, reqMethod, sampled, res){
  if (traceInfo[probeData.traceId._spanId] === 'start'){
    delete traceInfo[probeData.traceId._spanId];
  } else {
    return;
  }

  tracer.setId(probeData.traceId);
  if (sampled){
    tracer.recordServiceName(serviceName);
    tracer.recordRpc(traceUrl);
    tracer.recordBinary('service.name', serviceName);
    tracer.recordAnnotation(new Annotation.LocalAddr(0));
    if (res) {
      var status_code = res.statusCode.toString();
      tracer.recordBinary('http.status_code', status_code);
      if (status_code >= 400) {
        tracer.recordBinary('error', 'true');
        tracer.recordMessage(this.fetchStack());
        if (res.statusMessage){
          tracer.recordMessage(res.statusMessage.toString());
        }
      }
    }
    tracer.recordBinary('http.method', reqMethod.toUpperCase());
    if (process.env.APM_TENANT_ID){
      tracer.recordBinary('tenant.id', process.env.APM_TENANT_ID);
    }
    tracer.recordBinary('edge.request', '' + edgeRequest);
    tracer.recordBinary('request.type', 'http');
    tool.recordIbmapmContext(tracer, ibmapmContext);
    tracer.recordAnnotation(new Annotation.ServerSend());
  }
  logger.debug('http-tracer(after): ', tracer.id, sampled, traceUrl);
};

/*
 * Custom req.url parser that strips out any trailing query
 */
function parse(url) {
  ['?', '#'].forEach(function(separator) {
    var index = url.indexOf(separator);
    if (index !== -1) url = url.substring(0, index);
  });
  return url;
};

module.exports = HttpProbeZipkin;
