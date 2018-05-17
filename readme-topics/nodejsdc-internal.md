## Monitoring Node.js applications in IBM Cloud Private (internal use only)
Use the simplified procedure to deploy Node.js data collector in ICP for internal testing only:
1. Download the latest data collector build from https://rtpgsa.ibm.com/projects/i/itm_db2_agent/nodejs/cloudnative/NPMCD/latest/.
2. Update the Dockerfile for your Node.js application to add the following lines:
    <pre>
    RUN npm install <i>package_name</i>
    COPY <i>path_to_global_file</i> node_modules/ibmapm/etc</pre>
    where, <i>path_to_global_file</i> is the full path to the global.environment file that you downloaded from CEM UI.

3. Add the following line to the beginning of the main file of your Node.js application:
<code>require('ibmapm')</code>
4. Build the new Docker image.
5. Update the application yaml file to use the new Docker image.