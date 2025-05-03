const mqttAssemblyName = "MqttDashboard";

window.onscroll = function () {
    if (window.scrollInfoService != null)
        window.scrollInfoService.invokeMethodAsync('OnScroll', window.pageYOffset);
}

window.RegisterScrollInfoService = (scrollInfoService) => {
    window.scrollInfoService = scrollInfoService;
}

window.scrollFromTop = function scrollFromTop(fromTop) {
    window.scrollTo(0, fromTop);
}

window.getLocation = function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(window.showAddress);
    } else {
        var x = document.getElementById("demo");
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

window.getDemoValue = function getDemoValue() {
    var x = document.getElementById("demo");
    return x.innerHTML;
}

window.topic = "";

window.sendLocation = function sendLocation(topic) {
    if (navigator.geolocation) {
        window.topic = topic;
        navigator.geolocation.getCurrentPosition(window.sendAddress);
    } else {
        var x = document.getElementById("demo");
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

window.showLatLong = function showLatLong(position) {
    var x = document.getElementById("demo");
    x.innerHTML = "Latitude: " + position.coords.latitude +
        "<br>Longitude: " + position.coords.longitude;
}

window.showAddress = function showAddress(position) {
    var x = document.getElementById("demo");

    // https://stackoverflow.com/questions/66506483/how-to-get-the-address-from-coordinates-with-open-street-maps-api
    fetch("https://nominatim.openstreetmap.org/search.php?q=" + position.coords.latitude + "," + position.coords.longitude + "&polygon_geojson=1&format=json")
        .then(response => response.json())
        .then(j => {
            x.innerHTML = j[0].display_name;
        })
}

window.sendAddress = function sendAddress(position) {
    var x = document.getElementById("demo");

    // https://stackoverflow.com/questions/66506483/how-to-get-the-address-from-coordinates-with-open-street-maps-api
    fetch("https://nominatim.openstreetmap.org/search.php?q=" + position.coords.latitude + "," + position.coords.longitude + "&polygon_geojson=1&format=json")
        .then(response => response.json())
        .then(j => {
            x.innerHTML = j[0].display_name;
            window.mqttFunctions.publish(window.topic, window.mqttFunctions.encryptMsg(x.innerHTML, window.topic + window.topic), 1, true);
        })
}

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

    encryptMsg: function (msg, passphrase) {
        return CryptoJS.AES.encrypt(msg, passphrase).toString();
    },
    decryptMsg: function (encrypted, passphrase) {
        return CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);
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