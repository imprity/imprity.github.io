var index = 0;
var trigger = window.innerHeight/1.3;
function vertcheck(){
	var verts = [];
	verts.push(document.getElementById('twilightBg').getBoundingClientRect().top);
	verts.push(document.getElementById('applejackBg').getBoundingClientRect().top);
	verts.push(document.getElementById('rarityBg').getBoundingClientRect().top);
	verts.push(document.getElementById('fluttershyBg').getBoundingClientRect().top);
	verts.push(document.getElementById('rainbowBg').getBoundingClientRect().top);
	verts.push(document.getElementById('pinkieBg').getBoundingClientRect().top);
	verts.push(document.getElementById('laurenImg').getBoundingClientRect().top);
	if(verts[index] < trigger){
		switch(index){
			case 0: console.log("reached");
					twilight.classList.add("fadeIns2");
					twilightBg.classList.add("twilightBg");
					twilightImg.classList.add("left_slideIns");
					twilight_Info.classList.add("left_slideIns");
					twilightSubh.classList.add("left_slideIns");
					index++;
					break;
			case 1: console.log("reached");
					applejack.classList.add("fadeIns2");
					applejackBg.classList.add("applejackBg");
					applejackImg.classList.add("right_slideIns");
					applejack_Info.classList.add("right_slideIns");
					applejackSubh.classList.add("right_slideIns");
					index++;
					break;
			case 2: console.log("reached");
					rarity.classList.add("fadeIns2");
					rarityBg.classList.add("rarityBg");
					rarityImg.classList.add("right_slideIns");
					rarity_Info.classList.add("right_slideIns");
					raritySubh.classList.add("right_slideIns");
					index++;
					break;
			case 3: console.log("reached");
					fluttershy.classList.add("fadeIns2");
					fluttershyBg.classList.add("fluttershyBg");
					fluttershyImg.classList.add("left_slideIns");
					fluttershy_Info.classList.add("left_slideIns");
					fluttershySubh.classList.add("left_slideIns");
					index++;
					break;
			case 4: console.log("reached");
					rainbow.classList.add("fadeIns2");
					rainbowBg.classList.add("rainbowBg");
					rainbowImg.classList.add("right_slideIns");
					rainbow_Info.classList.add("right_slideIns");
					rainbowSubh.classList.add("right_slideIns");
					index++;
					break;
			case 5: console.log("reached");
					pinkie.classList.add("fadeIns2");
					pinkieBg.classList.add("pinkieBg");
					pinkieBg2.classList.add("pinkieBg2");
					pinkieImg.classList.add("right_slideIns");
					pinkie_Info.classList.add("right_slideIns");
					pinkieSubh.classList.add("right_slideIns");
					index++;
					break;
			case 6: console.log("reached");
					lauren.classList.add("fadeIns2");
					laurenImg.classList.add("fadeIns");
					lauren_Info.classList.add("fadeIns");
					index++;
					break;
		}
	}
}
function sizeCheck() {
	if(window.innerWidth > 450){
		trigger = window.innerHeight/2;
		twilightBg.src = "background2/twilight.png";
		applejackBg.src = "background2/applejack.jpeg";
		rarityBg.src = "background2/rarity.png";
		fluttershyBg.src = "background2/fluttershy.png";
		rainbowBg.src = "background2/rainbow.jpg";
		pinkieBg.src = "background2/pinkie.png";
	}
	else{
		trigger = window.innerHeight/1.3;
		twilightBg.src = "background/twilight.svg";
		applejackBg.src = "background/applejack.svg";
		rarityBg.src = "background/rarity.svg";
		fluttershyBg.src = "background/fluttershy.svg";
		rainbowBg.src = "background/rainbow.svg";
		pinkieBg.src = "background/pinkie.svg";
	}
}
setInterval(sizeCheck, 10);
setInterval(vertcheck, 10);
