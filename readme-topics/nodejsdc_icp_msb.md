# Configuring data collection for Node.js-based microservices in IBM Cloud Private

1. Run the following command to create a micro-service:
```
   bx dev create
```
   Remember: When prompted, choose Node as the language. For
   detailed instructions, see Create and deploy a simple
   microservice.

2. Create the server secret yaml file named
   apm-server-config-secret.yaml and put either of the following
   code blocks in it, depending on which server you want the data
   collector to connect to:

   *  For the data collector to connect to APM for DevOps server:
```
      apiVersion: v1
      kind: Secret
      metadata:
        name: apm-server-config
      data:
        ibm_apm_server_ingress_url: apm_for_devops_server_url
```
   *  For the data collector to connect to V8.1.4 Cloud APM
      server:
```
      apiVersion: v1
      kind: Secret
      metadata:
        name: apm-server-config
      data:
        ibm_apm_server_url: apm_server_url
        ibm_apm_keyfile: key_file_url
        ibm_apm_keyfile_password: key_file_pswd
```
3. On the Kubernetes master node and in the same namespace of
   your APM for DevOps server, run the following command to
   create the apm-server-config-secret.yaml:
```
   kubectl create -f apm-server-config-secret.yaml
```
4. Push the project to a new repository in the GitHub
   organization that the MSB pipeline is monitoring and is
   automatically built.


Parent topic: [Node.js Data Collector for IBM Application Performance Management (APM)](../README.md)
