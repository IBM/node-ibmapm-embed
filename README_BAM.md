# IBM Bluemix Application Monitoring(BAM) for Node.js Data Collector  

Set **Connection Information** in the configuration file. The configuration file is by default "config.json" in the running path of your Node.js application, or the file that is defined in the *KNJ_CONFIG_FILE* environment variable. For more information, see the Supported Environment Variables table.  
Sample configuration file (The default config.json at the running path is used):  
```
{
        "ingressURL" : "http://1.2.3.4:80/1.0/data",
        "tenantID" : "6defb2b3-4e44-463b-9731-09c64e7fdb67"
}
```  

**BAM Spedified Connection Information**  

|Connection Variable        | Sample Values                         | Default Value   | Comments                                                   |
|:---------------------------|:--------------------------------------|:----------------|:-----------------------------------------------------------|
|ingressURL (**must have**)  |"http://1.2.3.4:80/1.0/data"|N/A              |Ingress URL that all monitoring data is sent to.          |
|tenantID (**must have**)    |"6defb2b3-4e44-463b-9731-09c64e7fdb67" |N/A              |An MD5 code that can identify your company.                  |


4.(Optional) Configure **Environment Variables** by editing the `manifest.yml` file (for Bluemix) or by using the `export` command (for local test).  

If your application will be pushed to Bluemix, add the following lines in the manifest.yml file to set the required environment variable:
```
env:
  - KNJ_CONFIG_FILE: config.json
  - KNJ_RESTCLIENT_TIMER: "100"
  - KNJ_RESTCLIENT_MAX_RETRY: 2

```
If your application will be run on local test, run the following commands to export the required environment variables before you start the application:
```
export KNJ_CONFIG_FILE=config.json
export KNJ_RESTCLIENT_TIMER=100
export KNJ_RESTCLIENT_MAX_RETRY=2
```

**BAM Data Collector Specified Environment Variables**  

|Environment Variable              | Sample Values                         | Default Value | Comments                                               |
|:---------------------------------|:--------------------------------------|:--------------|:-------------------------------------------------------|
|KNJ_CONFIG_FILE (optional)        |"config.json", "test-config.json"      |"config.json"  |Specifies a configuration file name (full path or relative path to the running path of your Node.js application). For the content of the file, see Step 3.|
|KNJ_ENABLE_DEEPDIVE (optional)     |"true", "True", "", "False" or not set |not set        |Enables or disables diagnostics. By default, diagnostics is disabled.|
|KNJ_ENABLE_METHODTRACE (optional)  |"true", "True", "", "False" or not set |not set        |Enables or disables Method Trace. By default, method trace is diabled.|
|KNJ_ENABLE_PROFILING (optional)    |"true", "True", "", "False" or not set |not set        |Enables or disables method profiling. By default, method profiling is disabled.|
|KNJ_RESTCLIENT_TIMER (optional)   |"1000", "100"                          |"1000"         |Interval at which requests are sent to the sever, in milliseconds.|
|KNJ_RESTCLIENT_MAX_RETRY(optional)|"3", "2"                               |"3"            |Specifies the retry times when a reqeust fails.                |  

