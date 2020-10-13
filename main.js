var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

let speechIndex = 0;

let babySound = new Audio('./baby crying.mp3');
let jermaSound = new Audio('./jerma.mp3')
babySound.loop = true;
jermaSound.loop = true;
let swears =[];

babySound.onload = function(){
jermaSound.onload = function(){
window.onload = function () {
    LoadJson('./swears.json')
        .then((res) => {
            swears = res;
            let consoleElement = document.getElementById('tempConsole');
            let bluetoothButton = document.getElementById('bluetoothButton');

            let recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.start();
            recognition.onresult = function (event) {
                console.log(event.results[speechIndex][0].transcript)
                let words = event.results[speechIndex][0].transcript.split(' ');
                let playCrying = false;
                words.forEach(w=>{
                    swears.forEach(toCompare=>{
                        if(toCompare.includes(w)){
                            playCrying = true;
                        }
                    })
                })
                if(playCrying){
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

            bluetoothButton.onclick = function () {
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
                        characteristic.addEventListener('characteristicvaluechanged', event => {
                            let decoder = new TextDecoder('utf-8');
                            console.log(decoder.decode(event.target.value));
                        });
                        let textfiield = document.createElement('textarea');
                        let sendButton = document.createElement('button');
                        sendButton.innerText = 'Send';
                        document.body.appendChild(textfiield);
                        document.body.appendChild(sendButton);
                        sendButton.onclick = function () {
                            let toSend = textfiield.value;
                            characteristic.writeValue(new TextEncoder('utf-8').encode(toSend));
                        }
                    })
                    .catch(error => {
                        consoleElement.innerHTML = error;
                        console.error(error);
                    });
            }
        })
}
}
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