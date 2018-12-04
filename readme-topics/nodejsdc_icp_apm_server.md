# Configuring the data collector for applications in IBM Cloud Private
You can configure the Node.js data collector to monitor applications in IBM Cloud Private and connect to the Cloud APM v8 server.

## Prerequisites
- The following information about the Cloud APM v8 server is required during data collector configuration:
> - The URL of the target Cloud APM v8 server
> - The location of the key file, either a URL to download the key file or a local file directory (required only by secure HTTPS connection)
> - The key file password that is paired with the key file (required only by secure HTTPS connection)
- If you use Microservice Builder to deploy your Node.js-based microservies, it is assumed that the development environment for Microservice Builder is set up. If not, follow the instructions in [Setting up your development environment](https://microclimate-dev2ops.github.io/gettingstarted).

- The service account that you use to install and configure the data collector must have access to Kubernetes resources. You can run the following commands on the Kubernetes master node to determine if the data collector has access to resources by using your service account:
    
    ```
    kubectl auth can-i list nodes --as system:serviceaccount:<namespace>:<service_account_name>
    kubectl auth can-i get pods --as system:serviceaccount:<namespace>:<service_account_name>
    kubectl auth can-i list services --as system:serviceaccount:<namespace>:<service_account_name>
    ```
    
    Remember to change the `<namespace>` and `<service_account_name>` in the commands to the namespace of your environment and the name for the service account that you use to configure the data collector. By default, the `<service_account_name>` is `default`.

    If your service account does not have access to Kubernetes resources, follow the instructions in [Configuring the data collector to access Kubernetes resources](nodejsdc_config_access.md).

## Procedure

### Deploying the Node.js application by using Microclimate with data collector installed

If you deploy the Node.js-based microservices by using IBM Microservice Builder, theNode.js data collector is automatically installed in the microservices so you can start monitoring quickly. 

1. Run the following command to create a micro-service:

   `bx dev create`

   Remember: When prompted, choose <b>Node</b> as the language. For
   detailed instructions, see [Create and deploy a simple
   microservice](https://microclimate-dev2ops.github.io/gettingstarted).

2. Create a file named apm-server-config-secret.yaml on your local system and edit the file to add the following information:

<pre>    
apiVersion: v1
kind: Secret
metadata:
  name: apm-server-config
data:
  ibm_apm_server_url: <i>apm_server_url</i>
  ibm_apm_keyfile: <i>key_file_url</i>
  ibm_apm_keyfile_password: <i>key_file_pswd</i>
</pre>

where:

- <i>apm_server_url</i> is the base64 encoded URL for Cloud APM v8 server. 
- <i>key_file_url</i> is the location of the key file, either a URL to download the key file or a local file directory (required only by secure HTTPS connection).
- <i>key_file_pswd</i> is the key file password that is paired with the key file (required only by secure HTTPS connection).

Remember: All the above values should be base64 encoded values. You can run <code>echo n <i>original_url</i> | base64</code> on Linux to get the encoded value.


3. On the Kubernetes master node and in the same namespace of your Node.js application, run the following command to create the Cloud APM v8 server secret:

<pre>kubectl create -f apm-server-config-secret.yaml</pre>

4. Push the project to a new repository in the GitHub organization that the Microclimate pipeline is monitoring and is automatically built.

### Manually configuring data collection for Node.js application

If you have Node.js-based microservices or applications that are NOT created and deployed with Microservice Builder, manually update your current deployment to configure data collection for the microservices or applications. 

1. Create a file named apm-server-config-secret.yaml on your local system and edit the file to add the following information:

<pre>    
apiVersion: v1
kind: Secret
metadata:
  name: apm-server-config
data:
  ibm_apm_server_url: <i>apm_server_url</i>
  ibm_apm_keyfile: <i>key_file_url</i>
  ibm_apm_keyfile_password: <i>key_file_pswd</i>
</pre>

where:

- <i>apm_server_url</i> is the base64 encoded URL for Cloud APM v8 server. 
- <i>key_file_url</i> is the location of the key file, either a URL to download the key file or a local file directory (required only by secure HTTPS connection).
- <i>key_file_pswd</i> is the key file password that is paired with the key file (required only by secure HTTPS connection).

Remember: All the above values should be base64 encoded values. You can run <code>echo n <i>original_url</i> | base64</code> on Linux to get the encoded value.


2. On the Kubernetes master node and in the same namespace of your Node.js application, run the following command to create the Cloud APM v8 server secret:

<pre>kubectl create -f apm-server-config-secret.yaml</pre>

3. Update the Dockerfile for your Node.js application to add the following line that start with RUN:

<pre>RUN npm install ibmapm --save</pre>

4. Add the following line to the beginning of the main file of your Node.js application:
<pre>
   require('ibmapm');
</pre>
   Tip: If you start your application by running the node app.js
   command, app.js is the main file of your application.

5. Remove the current Docker image by running the `docker rmi` command.

   The following example removes the Docker image by using the image tag:

   <pre>docker rmi -f mycluster.icp:8500/admin/trader:Node.js</pre>

6. Build and tag the Docker image again with the updated Dockerfile by running the following command:

   <pre>docker build -t docker_image_name:<i>image_tag</i> .</pre>

   where <i>image_tag</i> is the Docker image tag, which must contain the IBM Cloud Private registry.

   Example:

   <pre>docker build -t mycluster.icp:8500/admin/trader:Node.js .</pre>

   where mycluster.icp:8500 is the IBM Cloud Private registry.

7. Push the new Docker image to your registry by running the following command:

   <pre>docker push <i>image_tag</i></pre>

   where <i>image_tag</i> is the Docker image tag that you specified in
   the previous step.

   Example:

   <pre>docker push mycluster.icp:8500/admin/trader:Node.js</pre>

8. Edit the Node.js application deployment yaml file by adding the following variables to the container specification. Specify your application name in the APPLICATION_NAME value.
<pre>
          - name: APPLICATION_NAME
            value: <i>your_app_name</i>
          - name: IBM_APM_SERVER_URL
            valueFrom:
              secretKeyRef:
                name: apm-server-config
                key: ibm_apm_server_url
                optional: true
          - name: IBM_APM_KEYFILE
            valueFrom:
              secretKeyRef:
                name: apm-server-config
                key: ibm_apm_keyfile
                optional: true
          - name: IBM_APM_KEYFILE_PASSWORD
            valueFrom:
              secretKeyRef:
                name: apm-server-config
                key: ibm_apm_keyfile_password
                optional: true
</pre>
9. For the configurations to take effect, run the following command:

<pre>kubectl replace -f deployment</pre>
