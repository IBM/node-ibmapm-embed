## Configuring on-premises Node.js applications monitoring using the Winterfell server

1. Install the Node.js data collector to your application by **either** of the following methods:

- Option 1:
    - a. In the `package.json` file of your Node.js application, add the following line to the dependencies section:
    <pre>"ibmapm":"^2.0.0"</pre>
    
    - b. Add the following line to the begining of the main file of your Node.js application:
    <pre>require('ibmapm');</pre>

<<<<<<< HEAD
- Option 2:
   - a. In the `package.json` file of your Node.js application, add the following line to the dependencies section:
    <pre>"appmetrics":"^4.0.0"</pre>
    
    - b. Add the following line to the begining of the main file of your Node.js application:
    <pre>require('appmetrics');</pre>
    
    **Tip:** If you start your application by running the node app.js command, `app.js` is the main file of your application.

2. Enable the Node.js data collector by specifying the server connection information with **either** of the following methods:

- Option 1: Set the **IBM_APM_SERVER_INGRESS_URL** and **APM_TENANT_ID** environment variables to specify the Kubernetes ingress URL and your tenant ID.

- Option 2: Specify the Kubernetes ingress URL and your tenant ID in the `\node_modules\ibmapm-embed\etc\global.environment` file.

3. Run the following command to install all required dependencies:
    <pre>npm install</pre>

4. Restart the Node.js application.
=======
    - APPLICATION_NAME
    - IBM_APM_SERVER_INGRESS_URL
    
    For example, on a Linux system, run the following commands to set the environment variables:
    <pre> 
    export APPLICATION_NAME=<i>nodejs_app_name</i>
    export IBM_APM_SERVER_INGRESS_URL=<i>winterfell_server_url</i>
    </pre>
4. Run the following command to install the ibmapm dependency:
    <pre>npm install ibmapm</pre>
5. Restart the Node.js application.
>>>>>>> master
