## Configuring on-premises Node.js applications monitoring using the Winterfell server

1. In the `package.json` file of your Node.js application, add the following line to the dependencies section:
    <pre>ibmapm":"^2.0.0"</pre>
2. Add the following line to the begining of the main file of your Node.js application:
    <pre>require('ibmapm');</pre>
    **Tip:** If you start your application by running the node app.js command, `app.js` is the main file of your application.
3. Set the following two environment variables to specify the Node.js application name and the URL for the Winterfell server:

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
