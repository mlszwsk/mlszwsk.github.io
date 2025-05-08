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

    encrypt2: function (plaintext, keyHex, ivHex) {
        // Klucz i IV w hex (taki sam jak będziesz używał w openssl do odszyfrowania)

        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);

        // Szyfrowanie
        const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // To string base64
        console.log("Szyfrogram (base64):", encrypted.ciphertext.toString(CryptoJS.enc.Base64));

        // Jeśli potrzebujesz hex:
        // console.log("Szyfrogram (hex):", encrypted.ciphertext.toString());

        return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    },

    decrypt2: function (encryptedBase64, keyHex, ivHex)
    {
        //var ciphertext = "79a247e48ac27ed33ca3f1919067fa64";
        //var key = "6268890F-9B58-484C-8CDC-34F9C6A9";
        //var iv = "6268890F-9B58-48";

        //var key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        //var iv = "0102030405060708090a0b0c0d0e0f10";

        //var ciphertextWA = CryptoJS.enc.Hex.parse(ciphertext);
        ////var ciphertextWA = ciphertext;

        //var keyWA = CryptoJS.enc.Utf8.parse(key);
        //var ivWA = CryptoJS.enc.Utf8.parse(iv);
        //var ciphertextCP = { ciphertext: ciphertextWA };

        //var decrypted = CryptoJS.AES.decrypt(
        //    ciphertextCP,
        //    keyWA,
        //    { iv: ivWA }
        //);

        //return decrypted.toString(CryptoJS.enc.Utf8);




        //const encryptedBase64 = "k6yfBmR2Jp7LU3wKk8Tm+Q==";

        // Klucz i IV w hex (takie same jak w openssl)

        // Konwersja do WordArray
        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const encrypted = CryptoJS.enc.Base64.parse(encryptedBase64);

        // Deszyfrowanie
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encrypted },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        console.log("Odszyfrowany tekst:", decrypted.toString(CryptoJS.enc.Utf8));

        return decrypted.toString(CryptoJS.enc.Utf8);
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