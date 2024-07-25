// ThreeJS and Third-party deps
import * as THREE from "three"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Core boilerplate code deps
import { createCamera, createRenderer, runApp, updateLoadingProgressBar } from "./core-utils"
import { LonLatToCart,DegtoLon } from "./utils"
import { Earth } from "./earth"
import { Gui } from "./gui"


// Other deps
import { loadTexture } from "./common-utils"
import GaiaSky from "./assets/Gaia_EDR3_darkened.png"

//import Satelite_model from "url:./assets/GEO_Assembly.gltf"


global.THREE = THREE
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  sunIntensity: 1.3, // brightness of the sun
  beamIntensity: 3,
  speedFactor: 20.0, // rotation speed of the earth
  EarthPeriod:10, // one revolution in seconds
  EarthRotation: 23.5,
  EarthRadius: 6.371, //kkm
  SunOrbit: 151.2*1000, // in million km
  CloudAltitude: 0.005, //kkm
  AtmosphereAltitude: 0.01, //kkm
  metalness: 0.3,
  atmOpacity: { value: 0.7 },
  atmPowFactor: { value: 4.1 },
  atmMultiplier: { value: 9.5 },
  solarFarmLocation: {lat:-12.46, lon:130.8444},//{lat:-100.4637, lon:130.8444} 12.4637° S, 130.8444
  cameraSatelliteOffset: {r:0.1, lon:-0.1, lat:0.1},
  geosynchronousAltitude: 35.786, // in Earth radii (not kilometers for simplicity)
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 0.1, 1000, LonLatToCart(params.geosynchronousAltitude+params.cameraSatelliteOffset.r, params.solarFarmLocation.lon+params.cameraSatelliteOffset.lon,params.solarFarmLocation.lat+params.cameraSatelliteOffset.lat,false))




/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true


    // adding a virtual sun using directional light
    this.sunLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity)
    this.sunLight.position.set(...LonLatToCart(params.SunOrbit,0,0,true))
    scene.add(this.sunLight)

    // // adding satellite laser beam
    // this.satBeam = new THREE.DirectionalLight(0xffffff, params.beamIntensity)
    // this.satBeam.position.set(50, 0, 30)
    // scene.add(this.satBeam)

    // updates the progress bar to 10% on the loading UI
    await updateLoadingProgressBar(0.1)
    this.earth =  await new Earth(params).create()
    await updateLoadingProgressBar(0.3)
    const envMap = await loadTexture(GaiaSky)
    envMap.mapping = THREE.EquirectangularReflectionMapping
    await updateLoadingProgressBar(0.7)
    scene.background = envMap
  
    
    
    let solarfarmGEO = new THREE.SphereGeometry(0.1, 32, 32); // Small sphere
    let solarfarmMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    this.solarfarm = new THREE.Mesh(solarfarmGEO, solarfarmMat);
    this.solarfarm.position.set(...LonLatToCart(9, params.solarFarmLocation.lon,params.solarFarmLocation.lat,true))
    
    this.earth.group.add(this.solarfarm)

    scene.add(this.earth.group) 
    

  //   //Add Satellite
  //   // Create the satellite
        const loader = new GLTFLoader();
        var url = "" + new URL( './assets/GEOSat.gltf', import.meta.url );

    loader.load(url, function(gltf) {
  //     // This function is called once the model is  loaded
  //     // gltf.scene contains the scene graph for the loaded model
  //    this.satelliteGroup = new THREE.Group()
       gltf.scene.scale.set(1, 1, 1);
       this.satelite=gltf.scene;
       gltf.scene.position.set(...LonLatToCart(params.geosynchronousAltitude, params.solarFarmLocation.lon,params.solarFarmLocation.lat,true)); // Adjust accordingly
       scene.add(gltf.scene);
      //  this.satelliteGroup.add(gltf.scene); // Assuming this.satelliteGroup is where you want to add your model
  
  //     console.log(gltf.scene.position)
  //     console.log(this.satelliteGroup.position)
      // Create the laser beam
      const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const laserGeometry = new THREE.BufferGeometry().setFromPoints([
          this.satelite.position,
          new THREE.Vector3(0,0,0) // End at the Earth's center
        ]);
      const laser = new THREE.Line(laserGeometry, laserMaterial);
      scene.add(laser);
  }, undefined, function(error) {
      // This function is called if an error occurs
      console.error('An error happened while loading the GLTF model:', error);
  });

    // Set the satellite's position to be geosynchronous


    // Create the ground position marker
    // const GroundPositionMarkerMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    // const GroundPositionMarkerGeometry = new THREE.BufferGeometry().setFromPoints([
    //     this.satellite.position,
    //     new THREE.Vector3(0,0,0) // End at the Earth's center
    //   ]);
    // const GroundPositionMarker = new THREE.Line(GroundPositionMarkerGeometry, GroundPositionMarkerMaterial);
    // this.satelliteGroup.add(GroundPositionMarker)




    


    
    Gui(scene, camera, document.body,params)

    


    

    await updateLoadingProgressBar(1.0, 100)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    
    this.solarfarm.position.set(...LonLatToCart(params.EarthRadius, params.solarFarmLocation.lon, params.solarFarmLocation.lat,true))
    this.controls.update()
    //this.stats1.update()
    

    // use rotateY instead of rotation.y so as to rotate by axis Y local to each mesh

    // this.satelliteGroup.rotateY()
    
    this.sunLight.position.set(...LonLatToCart(params.SunOrbit,DegtoLon((-elapsed / params.EarthPeriod * 360) % 360),0,true));
    this.sunLight.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure the light always points towards the Earth

    // camera.position.set(...LonLatToCart(30,0,-DegtoLon((elapsed / 10 * 360) % 360),true));
    // camera.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure the light always points towards the Earth


    // camera.position.set(this.satelliteGroup.position.x,this.satelliteGroup.position.y,this.satelliteGroup.position.z)

    this.earth.update(interval)
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined)
