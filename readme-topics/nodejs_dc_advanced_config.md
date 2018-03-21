# Advanced configurations
This section introduces all supported variables for the Node.js data collector. You can set the variables to change the behavior of your data collector according to the description below.    

## Variables for changing data collector behavior

* For **Bluemix** applications, you can set the following variables in the `manifest.yml` file or on the **Bluemix UI**.  
* For **local** applications, you can set the following variables in the `config.properties` file.  

|Variable                | Importance                         | Default Value | Description                                               |
|:---------------------------------|:--------------------------------------|:--------------|:-------------------------------------------------------|
|KNJ_ENABLE_TT           |optional |False        |Enables or disables transaction tracking. By default, transaction tracking is **disabled**.
|KNJ_DISABLE_METHODTRACE   |optional |False        |Enables or disables Method Trace. By default, method trace is **enabled**.|
|KNJ_AAR_BATCH_FREQ            |optional |60        |Specifies the interval at which transaction tracking data is batched and sent to the server, in seconds. By default, transaction tracking data is batched and sent to the server **every minute**.
|KNJ_AAR_BATCH_COUNT            |optional |100        |Specifies the maximum number of requests that transaction tracking data contains before the data is batched and sent to the server. By default, when a batch of transaction tracking data contains **100** requests, this batch of data is sent to the server.
|KNJ_LOG_LEVEL            |optional |error        |Specifies the level of information that is printed in the log. Possible values are `off`, `error`, `info`, `debug`, `all`.                                              
|KNJ_SAMPLING            |optional                             |10             |The number of requests based on which a sample is taken. By default, data collector takes one sample for **every 10** requests.
|KNJ_MIN_CLOCK_TRACE       |optional                             |1              |If the response time of a request instance exceeds the value of this variable (in milliseconds), the data collector collects its method trace.
|KNJ_MIN_CLOCK_STACK       |optional                       |100              |If the response time of a request instance exceeds the value of this variable (in milliseconds), the data collector collects its stack trace.


**Parent topic:** [Node.js Data Collector for IBM Application Performance Management (APM)](../README.md)
