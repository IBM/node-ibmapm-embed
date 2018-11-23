# Manually configuring data collection for Node.js-based microservices and Node.js applications

If your Node.js-based microservices or Node.js applications are
not deployed using Microservice Builder, manually configure the
Node.js data collector for data collection.

1. Create the APM for DevOps server secret yaml file named
   apm-server-config-secret.yaml by running either the create -f
   or the apply -f command.

2. Add the following information to the
   apm-server-config-secret.yaml file:
```
   apiVersion: v1
   kind: Secret
   metadata:
     name: apm-server-config
   data:
     ibm_apm_server_ingress_url: apm_for_devops_server_url
```
   where, apm_for_devops_server_url is the base64 encoded URL of
   the APM for DevOps server. For example, on a Linux system run
   the echo -n original_url | base64 command to get the encoded
   value.

3. On the IBM Cloud Private master node, create the server secret
   by running the following command:
```
   kubectl create -f apm-server-config-secret.yaml
```
4. Update the Dockerfile for your Node.js application to add the
   following line that start with RUN:
```
   RUN npm install ibmapm --save
```
5. Add the following line to the beginning of the main file of
   your Node.js application:
```
   require('ibmapm');
```
   Tip: If you start your application by running the node app.js
   command, app.js is the main file of your application.

6. Remove the current Docker image by running the docker rmi
   command.

   The following example removes the Docker image by using the
   image tag:
```
   docker rmi -f mycluster.icp:8500/admin/trader:Node.js
```
7. Build and tag the Docker image again with the updated
   Dockerfile by running the following command:
```
   docker build -t docker_image_name:image_tag .
```
   where image_tag is the Docker image tag, which must contain
   the IBM Cloud Private registry.

   Example:
```
   docker build -t mycluster.icp:8500/admin/trader:Node.js .
```
   where mycluster.icp:8500 is the IBM Cloud Private registry.

8. Push the new Docker image to your registry by running the
   following command:
```
   docker push image_tag
```
   where image_tag is the Docker image tag that you specified in
   the previous step.

   Example:
```
   docker push mycluster.icp:8500/admin/trader:Node.js
```
9. Edit the Node.js application deployment yaml file by adding
   the following variables to the container specification.
   Specify your application name in the APPLICATION_NAME value.
```
             - name: APPLICATION_NAME
               value: your_app_name
             - name: IBM_APM_SERVER_INGRESS_URL
               valueFrom:
                 secretKeyRef:
                   name: apm-server-config
                   key: ibm_apm_server_ingress_url
                   optional: true
```
10. For the configurations to take effect, run the following
    command:
```
    kubectl replace -f deployment
```
```
