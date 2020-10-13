var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

let catFace;
let catIsSad = false;

let babySound = new Audio('./baby crying.mp3');
let jermaSound = new Audio('./jerma.mp3');

let blueToothConnected = false;
let bluetoothChar;

let speechIndex = 0;

let swears = [];

window.onload = () => {
    checkUserPermission().then(userConsent => {
        if (userConsent) {
            LoadJson('./swears.json')
            .then(jsonData => {
                swears = jsonData;
                let recognition = new SpeechRecognition();
                SetupVoiceEvent(recognition);
            })
            .catch(err => console.error(err))
        }
    });
}

let SetupVoiceEvent = function (recognition) {
    recognition.continuous = true;
    recognition.start();
    recognition.onresult = function (event) {
        console.log(event.results[speechIndex][0].transcript)
        let words = event.results[speechIndex][0].transcript.split(' ');
        let playCrying = false;
        words.forEach(w => {
            swears.forEach(toCompare => {
                if (w == toCompare) {
                    playCrying = true;
                }
            })
        })
        if (playCrying) {
            babySound.play();
            jermaSound.play();
        }
        speechIndex++
    }
    recognition.onspeechend = () => {
        console.log('ended stopping to restart');
        speechIndex = 0;
        recognition.stop();
    };

    recognition.onend = () => {
        console.log('restarting');
        recognition.start();
    }
}


let GetBlueToothChar = function () {
    let promise = new Promise((res, rej) => {
        navigator.bluetooth.requestDevice({
            filters: [{
                name: 'HMSoft'
            }],
            optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
        })
            .then(device => { return device.gatt.connect(); })
            .then(server => { return server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb'); })
            .then(service => { return service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb'); })
            .then(characteristic => { return characteristic.startNotifications() })
            .then(characteristic => {
                console.log('connected');

                blueToothConnected = true;
                bluetoothChar = characteristic;

                res(characteristic);
            })
            .catch(err => rej(err));
    })
    return promise;
}

let checkUserPermission = function () {

    let centerBox = document.getElementById('centerBox')
    let yesButton = document.getElementById('yesButton');
    let noButton = document.getElementById('noButton');

    let promise = new Promise((res, rej) => {
        yesButton.onclick = function () {
            centerBox.innerHTML = '';

            catFace = document.createElement('img');
            if (screen.width > screen.height)
                catFace.style = "height:80vh ;display: block; margin-left: auto; margin-right: auto;";
            else
                catFace.style = "width:80vw ;display: block; margin-left: auto; margin-right: auto;";
            CatSmile();
            centerBox.appendChild(catFace);

            let blueToothButton = document.createElement('button');
            blueToothButton.style = "display: block; margin-left: auto; margin-right: auto;";
            blueToothButton.innerHTML = '블루투스 연결';
            blueToothButton.onclick = () => { GetBlueToothChar().catch(err => console.error(err)) };
            document.body.appendChild(blueToothButton);

            res(true);
        }
        noButton.onclick = function () {
            centerBox.innerHTML = '';

            let okMessage = document.createElement('p');
            okMessage.style = "color: white;";
            okMessage.innerHTML = '알았어요 ㄷㄷ';

            centerBox.appendChild(okMessage)

            res(false);
        }
    })

    return promise;
}


let LoadJson = function (pathTofile) {
    promise = new Promise((response, reject) => {
        fetch(pathTofile)
            .then(res => {
                if (res.ok) {
                    res.text()
                        .then(txt => {
                            response(JSON.parse(txt));
                        })
                        .catch(err => { reject(err); });
                }
                else {
                    throw new Error(res.statusText);
                }
            })
            .catch(err => {
                reject(err);
            });
    });
    return promise;
}

let CatCry = function () {
    catFace.src = "./cat-sad.svg";
    catIsSad = true;
}

let CatSmile = function () {
    catFace.src = "./cat-smile.svg";
    catIsSad = true;
}

