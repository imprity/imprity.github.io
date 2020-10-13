var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

let catFace;
let catIsSad = false;

let babySound;
let jermaSound;

let blueToothConnected = false;
let blueToothChar;

let isChecking = false;

let speechIndex = 0;

let swears = [];

window.onload = () => {
    checkUserPermission().then(userConsent => {
        if (userConsent) {
            babySound = new Howl({
                src : ['./baby crying.mp3'],
                loop: false,
                autoplay: false
            })
            jermaSound = new Howl({
                src : ['./jerma.mp3'],
                loop: false,
                autoplay: false
            })
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

let StartCheckForCoin = function(){
    if(blueToothConnected && !isChecking){
        isChecking = true;

        let EventFunction = function(event){
            let decoder = new TextDecoder('utf-8');
            let text = decoder.decode(event.target.value);
            if(text == 't'){
                CatSmile();
                isChecking = false;
                blueToothChar.writeValue(new TextEncoder('utf-8').encode('done'));
                blueToothChar.removeEventListener('characteristicvaluechanged', EventFunction);
            }
        }

        setTimeout(()=>{
            CatSmile();
            isChecking = false;
            blueToothChar.writeValue(new TextEncoder('utf-8').encode('done'));
            blueToothChar.removeEventListener('characteristicvaluechanged', EventFunction);
        }, 60 *1000);


        blueToothChar.addEventListener('characteristicvaluechanged', EventFunction);
        blueToothChar.writeValue(new TextEncoder('utf-8').encode('check'));
    }
    else if(!isChecking){
        setTimeout(()=>{
            CatSmile();
            isChecking = false;
        }, 30 *1000);
    }
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
            CatCry();
            StartCheckForCoin();
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
                blueToothChar = characteristic;

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
            catFace.src = "./cat-smile.svg";
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
    jermaSound.loop(blueToothConnected);
    babySound.loop(blueToothConnected);
    jermaSound.play();
    babySound.play();
}

let CatSmile = function () {
    catFace.src = "./cat-smile.svg";
    catIsSad = true;
    jermaSound.stop();
    babySound.stop();
}

