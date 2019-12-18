var Harvest = (function () {

  // Instance stores a reference to the Singleton
  var instance;

  function startGame() {

    // Singleton

	var camera, scene, renderer;
	var geometry, material, mesh;
	var controls;
	var boxes = [];
	var objects = [];

	var WON = false;
	var timer;
    var fog = 100;


	init();
	animate();

	var prevTime = performance.now();
	var velocity = new THREE.Vector3();


	function init() {

		initialiseTimer();
		eventHandlers();
		scene = new THREE.Scene();
		scene.fog = new THREE.Fog( 0xffffff, 0, fog + 1000 );

		// Sky
		var pwd = window.location.href.substring(0, window.location.href.indexOf('/'));
		var sky = new THREE.SphereGeometry(8000, 32, 32); // radius, widthSegments, heightSegments

		skyBox = new THREE.Mesh(sky);
		skyBox.scale.set(-1, 1, 1);
		skyBox.eulerOrder = 'XZY';
		skyBox.renderDepth = 1000.0;
		scene.add(skyBox);

		// Floor
		var floorHeight = 7000;
		geometry = new THREE.SphereGeometry(floorHeight, 10, 6, 0, (Math.PI * 2), 0, 0.8);
		geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0, -floorHeight, 0) );
		
		var texture = THREE.ImageUtils.loadTexture('assets/cc1.jpg', null, loaded);

        // load two other textures we'll use to make the map look more real
        var detailTexture = THREE.ImageUtils.loadTexture("assets/cc3.jpg", null, loaded);


        // the following configuration defines how the terrain is rendered
        var terrainShader = THREE.ShaderTerrain[ "terrain" ];
        var uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);

        // how to treat abd scale the normal texture
        uniformsTerrain[ "tNormal" ].texture = detailTexture;
        uniformsTerrain[ "uNormalScale" ].value = 1;
 
        // the displacement determines the height of a vector, mapped to
        // the heightmap
        uniformsTerrain[ "tDisplacement" ].texture = texture;
        uniformsTerrain[ "uDisplacementScale" ].value = 1100;
 
        // the following textures can be use to finetune how
        // the map is shown. These are good defaults for simple
        // rendering
        uniformsTerrain[ "tDiffuse1" ].texture = detailTexture;
        uniformsTerrain[ "tDetail" ].texture = detailTexture;
        uniformsTerrain[ "enableDiffuse1" ].value = true;
        uniformsTerrain[ "enableDiffuse2" ].value = true;
        uniformsTerrain[ "enableSpecular" ].value = true;
 
        // diffuse is based on the light reflection
        uniformsTerrain[ "uDiffuseColor" ].value.setHex(0xcccccc);
        uniformsTerrain[ "uSpecularColor" ].value.setHex(0xff0000);
        // is the base color of the terrain
        uniformsTerrain[ "uAmbientColor" ].value.setHex(0x0000cc);
 
        // how shiny is the terrain
        uniformsTerrain[ "uShininess" ].value = 4;
 
        // handles light reflection
        uniformsTerrain[ "uRepeatOverlay" ].value.set(1, 1);
 
        // configure the material that reflects our terrain
        var material = new THREE.ShaderMaterial({
            uniforms:uniformsTerrain,
            vertexShader:terrainShader.vertexShader,
            fragmentShader:terrainShader.fragmentShader,
            lights:true,
            fog:false
        });

        // we use a plain to render as terrain
        var geometryTerrain = new THREE.PlaneGeometry(4600, 3100, 256, 256);
        geometryTerrain.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        geometryTerrain.computeFaceNormals();
        geometryTerrain.computeVertexNormals();
        geometryTerrain.computeTangents();

        // create a 3D object to add
        terrain = new THREE.Mesh(geometryTerrain, material, geometry);
        terrain.position.set(0, -125, 0);

        // add the terrain
        scene.add(terrain);
		



		camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 9000 );
		controls = new THREE.PointerLockControls( camera, 100, 30, true, objects );
		scene.add( controls.getPlayer() );

		renderer = new THREE.WebGLRenderer({ antialias: true }); //new THREE.WebGLRenderer();
		renderer.setClearColor( 0xffffff );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		ScreenOverlay(controls); //
		document.body.appendChild( renderer.domElement );

	}

	function animate() {

		requestAnimationFrame( animate );

		if ( controls.enabled ) {

            controls.updateControls();

		}
		renderer.render( scene, camera );

	}

	function randomTexture(maxTextures) {
		return Math.floor(Math.random() * maxTextures) + 1;
	}

	function initialiseTimer() {
		var sec = 0;
		function pad ( val ) { return val > 9 ? val : "0" + val; }

		timer = setInterval( function(){
			document.getElementById("seconds").innerHTML = String(pad(++sec%60));
			document.getElementById("minutes").innerHTML = String(pad(parseInt(sec/60,10)));
		}, 1000);
	}

	function eventHandlers() {

		// Keyboard press handlers
		var onKeyDown = function ( event ) { event.preventDefault(); event.stopPropagation(); handleKeyInteraction(event.keyCode, true); };
		var onKeyUp = function ( event ) { event.preventDefault(); event.stopPropagation(); handleKeyInteraction(event.keyCode, false); };
		document.addEventListener( 'keydown', onKeyDown, false );
		document.addEventListener( 'keyup', onKeyUp, false );

		// Resize Event
		window.addEventListener( 'resize', onWindowResize, false );
	}

	// HANDLE KEY INTERACTION
	function handleKeyInteraction(keyCode, boolean) {
		var isKeyDown = boolean;

		switch(keyCode) {
			case 38: // up
			case 87: // w
				controls.movements.forward = boolean;
				break;

			case 40: // down
			case 83: // s
				controls.movements.backward = boolean;
				break;

			case 37: // left
			case 65: // a
				controls.movements.left = boolean;
				break;

			case 39: // right
			case 68: // d
				controls.movements.right = boolean;
				break;

			case 32: // space
				if (!isKeyDown) {
					controls.jump();
				}
				break;

            case 16: // shift
                controls.walk(boolean);
                break;

            case 67: // crouch (CTRL + W etc destroys tab in Chrome!)
                controls.crouch(boolean);

		}
	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}


	function fallingBoxes(cube, pos, delay) {
		//console.log(cube,pos,delay)
		setTimeout(function() { cube.position.setY(pos); }, delay);
	}

    return {
		// Public methods and variables
		setFog: function (setFog) {
			fog = setFog;
		},
		setJumpFactor: function (setJumpFactor) {
			jumpFactor = setJumpFactor;
		}

    };

  };

  return {

    // Get the Singleton instance if one exists
    // or create one if it doesn't
    getInstance: function () {

      if ( !instance ) {
        instance = startGame();
      }

      return instance;
    }

  };

})();

harvest = Harvest.getInstance();
