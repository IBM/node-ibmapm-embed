// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

function HttpRequest(req, responseTime) {
    this.reqUrl = req.url;
    this.hitCount = 1;
    this.totalResponseTime = responseTime;
    this.averageResponseTime = responseTime;
    this.latestResponseTime = responseTime;
    this.method = req.method;
}

HttpRequest.prototype.updateResponseTime = function updateResponseTime(req, responseTime) {
    this.reqUrl = req.url;
    this.hitCount++;
    this.totalResponseTime += responseTime;
    this.averageResponseTime = Math.floor(this.totalResponseTime / this.hitCount);
    this.latestResponseTime = responseTime;
};

module.exports = HttpRequest;
