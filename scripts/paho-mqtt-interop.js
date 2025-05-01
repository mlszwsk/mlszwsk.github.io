const mqttAssemblyName = "MqttDashboard";

// https://stackoverflow.com/questions/60494746/blazor-navigation-update-url-without-changing-reloading-page
window.ChangeUrl = function (url) {
    history.pushState(null, '', url);
}

// https://chrissainty.com/copy-to-clipboard-in-blazor/
window.clipboardCopy = {
    copyText: function (codeElement) {
        navigator.clipboard.writeText(codeElement.textContent).then(function () {
            alert("Copied to clipboard!");
        })
            .catch(function (error) {
                alert(error);
            });
    }
}

window.mqttFunctions = {

    encryptMsg: function (msg) {
        return CryptoJS.AES.encrypt(msg, "Secret Passphrase").toString();
    },
    decryptMsg: function (encrypted) {
        return CryptoJS.AES.decrypt(encrypted, "Secret Passphrase").toString(CryptoJS.enc.Utf8);
    },

    createClient: function (wsHost, wsPort, clientId) {
        if (!clientId) {
            clientId = "anonymousclient_" + parseInt(Math.random() * 100, 10);
        } else {
            clientId = clientId + parseInt(Math.random() * 100, 10);
        }

        pahoClient = new Paho.MQTT.Client(wsHost, wsPort, "/mqtt", clientId);

        pahoClient.onConnectionLost = function (responseObject) {
            console.log(responseObject);
            DotNet.invokeMethodAsync(mqttAssemblyName, "OnConnectionChanged_Handler", "Connection Lost");
        };

        pahoClient.onMessageArrived = function (message) {
            console.log("RECEIVE ON " + message.destinationName + " PAYLOAD " + message.payloadString);
            DotNet.invokeMethodAsync(mqttAssemblyName, "OnMessageReceived_Handler", message.destinationName, message.payloadString);
        };

        pahoClient.onMessageDelivered = function (message) {
            console.log(message);
            console.log("PUBLISHED ON " + message.destinationName + " PAYLOAD " + message.payloadString);
        };
    },

    connect: function (topic, qos, timeout, username, password) {
        var options = {
            timeout: timeout,
            userName: username,
            password: password,
            reconnect: true,
            onSuccess: function () {
                pahoClient.subscribe(topic, { qos: qos });
                DotNet.invokeMethodAsync(mqttAssemblyName, "OnConnectionChanged_Handler", "Connected");
            },
            onFailure: function (message) {
                DotNet.invokeMethodAsync(mqttAssemblyName, "OnConnectionChanged_Handler", "Connection Failure");
            }
        };

        //if (pahoClient.host.toLowerCase().startsWith("https")) {
            options.useSSL = true;
        //}
        pahoClient.connect(options);
    },

    disconnect: function () {
        pahoClient.disconnect();
    },

    publish: function (topic, payload, qos, retained) {
        pahoClient.publish(topic, payload, qos, retained);
    },

    pahoClient: any = null
};