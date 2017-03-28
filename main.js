const Vector3 = gr.lib.math.Vector3;
gr.registerComponent('Gravity', {
	attributes: {
		mass: {
			default: "1",
			converter: "Number",
		}
	},
	$mount: function() {
		this.mass = this.getAttribute("mass");
		this.node.setAttribute("scale", 8 + this.mass * 2);
	}
});

gr.registerComponent('Rotate', {
	attributes: {
	},
	$mount: function() {
		this.ry = 0;
	},
	$update: function() {
		this.node.setAttribute("rotation", "y(" + this.ry + "d)");
		this.ry += 0.5;
	}
});

gr.registerNode("planet", ["Gravity", "Rotate"], {
	geometry: "sphere",
}, "mesh");

gr.registerComponent("Arrow", {
	attributes: {
		angle: {
			default: "0",
			converter: "Number"
		}
	},
	$mount: function() {
		this.__bindAttributes();
		// console.log(this.node.getAttribute("scale"));
		// console.log(this.node._parent);
	},
	$update: function() {
		const a = -90 - document.getElementById("angle").value;
		this.node.setAttribute("rotation", "z(" + a + "d)");
	}
});

gr.registerNode("arrow", ["Arrow"], {
	geometry: "quad",
	position: "0,0,10",
	texture: "./img/arrow.png",
}, "mesh");

gr.registerComponent("SteliteMotion", {
	attributes: {
		velocity: {
			default: "0,0,0",
			converter: "Vector3"
		},
		run: {
			default: false,
			converter: "Boolean"
		}
	},
	$mount: function() {
		this.__bindAttributes();
		this.initZPos = this.node.getAttribute("position").Z;
		console.log(this.node.tree("scene").first().children.map(function(v) { return v._root.element; }));
		// this.planets = this.node.tree("scene").first().getComponentsInChildren("Gravity");
	},
	$update: function() {
		// const gravityConst = 6.67259 * Math.pow(10, -11);
		const gravityConst = 6.67259;
		const scene = this.node.tree("scene").first();
		const gravities = scene.getComponentsInChildren("Gravity");
		const stars = scene.getComponentsInChildren("Star");
		const selfPos = this.node.getAttribute("position");
		selfPos.Z = 0;	// 表示の都合上Z正方向にずらしているため、Z方向の加速度を計算しない -> なんか無い方がいい感じ
		let colDet = false;
		let reached = false;
		this.acceleration = new Vector3(0,0,0);
		gravities.forEach((v, i) => {
			const posDifference = v.node.getComponent("Transform").globalPosition.subtractWith(selfPos);
			if(v.node.element.id === "earth") {
				this.earth = v.node;
				this.earth.distSatelite = posDifference.magnitude;
			}
			// console.log(posDifference.rawElements);
			this.acceleration = this.acceleration.addWith(posDifference.normalized.multiplyWith(gravityConst * v.mass / (Math.pow(posDifference.magnitude, 2))));
			// this.acceleration = posDifference.normalized.multiplyWith(gravityConst * v.mass / (Math.pow(posDifference.magnitude, 2)));
			// console.log(this.acceleration.rawElements);
			if(posDifference.magnitude < 2) {
				colDet = true;
			}
			if(v.node.element.id === "saturn" && posDifference.magnitude < v.node.getAttribute("scale").magnitude * 0.7)reached = true;
		});
		// debug ui
		this.run = document.getElementById("isRunning").checked;
		if(!this.run) {
			const angle = - Number(document.getElementById("angle").value);
			const elementalVector = new Vector3(Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180), 0);
			const initSpeed = Number(document.getElementById("speed").value) * 0.01 + Math.sqrt(2 * gravityConst / this.earth.distSatelite);
			const earthPos = this.earth.getComponent("Transform").globalPosition;
			const initPosition = earthPos.addWith(elementalVector.multiplyWith(Math.sqrt(Math.pow(this.earth.getAttribute("scale").magnitude, 2) / 3)));
			initPosition.Z = this.initZPos;
			this.velocity = elementalVector.multiplyWith(initSpeed);
			this.node.setAttribute("position", initPosition);
		}
		// end debug ui
		if(this.run) {
			this.velocity = this.velocity.addWith(this.acceleration);		
			const nextPos = this.node.getAttribute("position").addWith(this.velocity);
			nextPos.Z = this.initZPos;	// 表示の都合上Z正方向にずらしているため、Z方向の加速度を計算しない
			if(reached) {
				let failedStarsNum = 0;
				stars.forEach(function(v, i) {
					if(v.node.isActive)failedStarsNum++;
				});
				if(failedStarsNum === 0) {
					gameover("clear");
				} else {
					gameover("leftStars", failedStarsNum);
				}
				return;
			}
			if(colDet) {
				gameover("collision");
				return;
			}
			this.node.setAttribute("position", nextPos);
		}
	}
});

gr.registerNode("satelite", ["SteliteMotion"], {}, "mesh");

gr.registerComponent("Star", {
	attributes: {
	},
	$mount: function() {
		this.rz = 0;
		this.initZPos = this.node.getAttribute("position").Z;
	},
	$update: function() {
		this.node.setAttribute("rotation", "z(" + this.rz + "d)");
		this.rz += 1;
		const scaleAve = Math.sqrt(Math.pow(this.node.getAttribute("scale").magnitude, 2) / 3);
		let satPos = gr("#main")("#satelite").getAttribute("position");
		satPos.Z = this.initZPos;
		this.distSatelite = satPos.subtractWith(this.node.getAttribute("position")).magnitude;
		if(this.distSatelite < scaleAve * 1.5)this.node.enabled = false;
	}
});

gr.registerNode("star", ["Star"], {
	geometry: "quad",
	scale: "5",
	position: "0,0,30",
	texture: "./img/star.png",
}, "mesh");


gr(function() {
	const saturnScale = gr("#main")("#saturn").getAttribute("scale");
	const saturnScaleAve = Math.sqrt(Math.pow(saturnScale.magnitude, 2) / 3);
	gr("#main")("#saturn_ring").setAttribute("scale", saturnScale.multiplyWith(1.7));
	gr("#main")("#octopus").setAttribute("scale", saturnScale.multiplyWith(0.7));
	gr("#main")("#octopus").setAttribute("position", new Vector3(0, saturnScaleAve * 1.4, saturnScaleAve));
	const balloonScale = new Vector3(saturnScaleAve * 3, saturnScaleAve * 1.5, 0);
	gr("#main")("#balloon").setAttribute("scale", balloonScale);
	gr("#main")("#balloon").setAttribute("position", new Vector3(-saturnScaleAve * 3.5, saturnScaleAve * 3.5, saturnScaleAve + 10));

	const starPosArray = [[-116,40,0],[-3,17,0],[127,26,0],[173,-10,0]];	// for debugging -> angle = 12, velocity = 11    54, 11 ?
	gr("#main")("#starGroup").nodes[0][0].tree("scene").first().getComponentsInChildren("Star").forEach(function(v, i) {
		const initZPos = v.node.getAttribute("position").Z;
		v.node.setAttribute("position", new Vector3(starPosArray[i][0],starPosArray[i][1],initZPos));
	});
});

function gameover(type, failedStarsNum) {
	let msg = "例外";
	// gr("#main")("#satelite").nodes[0][0].tree("scene").first().getComponentsInChildren("SteliteMotion")[0].run = false;
	switch(type) {
		case "clear":
			msg = "おめでとう！目的の惑星に到達しました。\nCongratulations! Satelite has reached goal.";
			break;
		case "leftStars":
			msg = "おめでとう！" + failedStarsNum + "個の星を残しました。\nCongratulations! But you didn't get " + failedStarsNum + " stars.";
			break;
		case "collision":
			msg = "衝突しました。\nSatelite has collided.";
			break;
	}
	alert(msg);
	// gr("#main")("#balloon").nodes[0][0].enabled = true;
	console.log(msg);
	document.getElementById("isRunning").checked = false;
}
