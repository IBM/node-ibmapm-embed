# Node.js Data Collector for IBM APM Bluemix Integration Agent (BI Agent) 

**BI Agent Data Collector Specified Server and Credential Configuration**

Please configure BI Agent Server and Credential information in etc/global.environment file, all configuration item are supported for both configuration file and environment variables. Environment variable will take first priority.

|Configuration Item                | Sample Values                         | Default Value | Comments                                               |
|:---------------------------------|:--------------------------------------|:--------------|:-------------------------------------------------------|
|APM_BM_GATEWAY_URL (required*)    |"https://1.2.3.4:443" or not set       |not set        |The URL BI agent provides to collect data.|
|APM_SNI (sometimes required*)     |"abc.ibm.com" or not set               |"default.server" |When the keyfile's Owner/CN is not default.server (not the default onPremise server keyfile), this field is **required**!. Please assign this environment with your target server url's hostname(or your keyfile's Owner/CN).|
|APM_KEYFILE (required*)           |"keyfile_test.p12" or not set          |"keyfile.p12"  |You will put a keyfile in etc folder for server credential, assign the file name here.|
|APM_KEYFILE_PSWD (required)       |"passw0rd" or not set                  |"ccmR0cKs!"    |To set the password of the keyfile here.|

The items with (required*) mean, although they are required, but they could be overwritten by config.properities, if you have assign correct information in config.properties, you can ignore these items.




If your application will be pushed to Bluemix, add the following lines in the manifest.yml file to set the required environment variable:  
```
env:
  - KNJ_DISABLE_METHODTRACE: "true"

```
If your application will be run on local test, run the following commands to export the required environment variables before you start the application:  
```
export KNJ_DISABLE_METHODTRACE=true
```

**BI Agent Data Collector Specified Environment Variables**  

|Environment Variable              | Sample Values                         | Default Value | Comments                                               |
|:---------------------------------|:--------------------------------------|:--------------|:-------------------------------------------------------|
|KNJ_DISABLE_METHODTRACE (optional)  |"true", "True", "", "False" or not set |not set        |To disables Method Trace. By default, method trace is enabled.|
