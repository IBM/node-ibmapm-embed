[![Codacy Badge](https://api.codacy.com/project/badge/Grade/3f8e27ab77d341e8a87ec3f9a4cb7f0c)](https://www.codacy.com/app/shiyanf/node-ibmapm-embed?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=IBM-APM/node-ibmapm-embed&amp;utm_campaign=Badge_Grade)
[![Build Status](https://travis-ci.org/IBM-APM/node-ibmapm-embed.svg?branch=master)](https://travis-ci.org/IBM-APM/node-ibmapm-embed)
[![codebeat badge](https://codebeat.co/badges/f7a857b8-a6c0-49e9-994d-1c1cc10a37f9)](https://codebeat.co/projects/github-com-ibm-apm-node-ibmapm-embed-master)
[![codecov](https://codecov.io/gh/IBM-APM/node-ibmapm-embed/branch/master/graph/badge.svg)](https://codecov.io/gh/IBM-APM/node-ibmapm-embed)

# Node.js Data Collector for IBM Application Performance Management (APM)

The Node.js data collector helps you manage the performance and availability of your Bluemix and local Node.js applications. By using the data collector, you are provided with visibility and control of your applications, ensuring optimal performance and efficient use of resources. You can reduce and prevent application crashes and slowdowns around the clock, as the data collector assists you in detecting, diagnosing and isolating performance issues.

## Configuring Node.js monitoring using the `Cloud APM server`

With a Cloud APM subscription, you can download a pre-configured data collector package that can connect to the Cloud APM server. To sign up for trial or purchace a subscription, go to the [Cloud APM](https://www.ibm.com/us-en/marketplace/application-performance-management) page on IBM Market place.

If you want to connect the data collector to your on-premises Cloud APM server (which means you are using **Cloud APM, Private**) and you haven't configured the downloaded image during server installation, you must run some scripts to prepare the data collector package before you continue with the following tasks. For more details, see [Configuring the installation images](https://www.ibm.com/support/knowledgecenter/SSHLNR_8.1.4/com.ibm.pm.doc/install/install_agent_preconfig.htm).


If you are a **Cloud APM** user, complete the following steps according to your needs:

- [Configuring the data collector for Bluemix applications](https://www.ibm.com/support/knowledgecenter/SSMKFH/com.ibm.apmaas.doc/install/bluemix_nodejs_config_dc.htm)
- [Configuring the data collector for local applications](https://www.ibm.com/support/knowledgecenter/SSMKFH/com.ibm.apmaas.doc/install/nodejs_config_dc.htm)
- [Configuring method trace and transaction tracking](readme-topics/nodejsdc_mt_tt.md)

If you are a **Cloud APM, Private** user, complete the following steps according to your needs:

- [Configuring the data collector for Bluemix applications](https://www.ibm.com/support/knowledgecenter/SSHLNR_8.1.4/com.ibm.pm.doc/install/bluemix_nodejs_config_dc.htm)
- [Configuring the data collector for local applications](https://www.ibm.com/support/knowledgecenter/SSHLNR_8.1.4/com.ibm.pm.doc/install/nodejs_config_dc.htm)
- [Configuring method trace and transaction tracking](readme-topics/nodejsdc_mt_tt.md)

To change the behavior of your data collector, see [**Advanced configurations**](readme-topics/nodejs_dc_advanced_config.md). You can set the variables described in this section to change connection information and data collector behavior.

## Configuring Node.js monitoring using the `BAM server`

To connect the data collector to a BAM server, choose **one of the following options**:

- [Bind the Availability Monitoring service](readme-topics/connect_bam_service.md).

- [Set the environment variables directly](readme-topics/set_var_bam.md).
    
    *Tip*: If you do not want to bind the Availability Monitoring service to the data collector, choose this option.

## Configuring data collection for Node.js-based microservices in `IBM Cloud Private`

You can configure the Node.js data collector to monitor your
Node.js-based microservices or Node.js applications in IBM Cloud
Private. The data collector can connect and send data to either
the Cloud APM server or the APM for DevOps server.

### Prerequisites

* The Node.js data collector can connect either to the Cloud APM server or the APM for DevOps server. Prepare the following server information for data collector configuration depending on the server you want it to connect to:
    *  For the data collector to connect to the APM for DevOps
        server:

        *  The URL of the APM for DevOps server

            **Tip**: The server URL is in the format of `http://ingress_service_name.kube_namespace.svc.cluster.local/1.0/data`, where `ingress_service_name` is the ingress service name in the am-server Helm chart deployment and `kube_namespace` is your namespace of the APM for DevOps
            server. 
            
            You can use the `kubectl get svc --namespace=kube_namespace` to get the ingress service name.

   *  For the data collector to connect to the Cloud APM server

      *  The URL of the target Cloud APM server

      *  The location of the key file, either a URL to download
         the key file or a local file directory (required only by
         secure HTTPS connection)

      *  The key file password that is paired with the key file
         (required only by secure HTTPS connection)

*  If you use Microservice Builder to deploy your Node.js-based microservies, it is assumed that the development environment for Microservice Builder is set up. If not, follow the instructions in [Setting up your development environment](https://www.ibm.com/support/knowledgecenter/SS5PWC/setup.html).

* The service account that you use to install and configure the data collector must have access to Kubernetes resources. You can run the following commands on the Kubernetes master node to determine if the data collector has access to resources by using your service account:
    
    ```
    kubectl auth can-i list nodes --as system:serviceaccount:<namespace>:<service_account_name>
    kubectl auth can-i get pods --as system:serviceaccount:<namespace>:<service_account_name>
    kubectl auth can-i list services --as system:serviceaccount:<namespace>:<service_account_name>
    ```
    
    Remember to change the `<namespace>` and `<service_account_name>` in the commands to the namespace of your environment and the name for the service account that you use to configure the data collector. By default, the `<service_account_name>` is `default`.

    If your service account does not have access to Kubernetes resources, follow the instructions in [Configuring the data collector to access Kubernetes resources](readme-topics/nodejsdc_config_access.md).

### Procedure

Follow the instructions based on your microservice type:

* [Deploying a Node.js-based microservice using Microservice Builder with the Node.js data collector enabled](readme-topics/nodejsdc_icp_msb.md)

    If you used IBM Microservice Builder to create your Node.js
microservices, the APM for DevOps Node.js data collector is
automatically instrumented in the microservice for you to start
monitoring at ease.

* [Manually configuring data collection for Node.js-based microservices and Node.js applications](readme-topics/nodejsdc_icp_manual.md)

    If your Node.js-based microservices or Node.js applications are
not deployed using Microservice Builder, manually configure the
Node.js data collector for data collection.

### What to do next

*  If the Node.js data collector is configured to connect to the
   APM for DevOps server, log in to the APM for DevOps console
   from your browser to review the health status of your Node.js
   services in the dashboards. For instructions, see [Starting the
   APM for DevOps console](https://developer.ibm.com/apm/docs/viewing-service-dependencies/).

*  If the Node.js data collector is configured to connect to the
   V8.1.4 Cloud APM server, log in to the Performance Management
   console from your browser to review the health status of your
   services in the dashboards. For instructions, see [Starting the
   Performance Management console](https://www.ibm.com/support/knowledgecenter/SSHLNR_8.1.4/com.ibm.pm.doc/install/admin_console_start.htm).
