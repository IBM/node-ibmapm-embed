// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

// var fs = require('fs');
var encoder = require('./encoder');
/*
function readFile(fileName){
    var content = fs.readFileSync(fileName, 'utf8');
    return content;
}
*/
function addEncoder(fileContent, option){
    var contenWraper = encoder.wraper(fileContent, option);
    return contenWraper;
}

exports.addEncoder = addEncoder;
