// ThreeJS and Third-party deps
import * as THREE from "three"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Core boilerplate code deps
import { createCamera, createRenderer, runApp, updateLoadingProgressBar } from "./core-utils"
import { LonLatToCart,DegtoLon,getIncrementedPosition } from "./utils"
import { Earth } from "./earth"
import { Gui } from "./gui"


// Other deps
import { loadTexture, loadModel } from "./common-utils"
import GaiaSky from "./assets/Gaia_EDR3_darkened.png"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"

//import SatelliteModel from "./assets/GeoSat.gltf"


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
  EarthPeriod:20, // one revolution in seconds
  EarthRotation: 23.5,
  EarthRadius: 6.371, //kkm
  SunOrbit: 151.2*1000, // in thousand km
  SunRadius: 6960.34, // in thousand km
  CloudAltitude: 0.008, //kkm
  AtmosphereAltitude: 0.01, //kkm
  metalness: 0.3,
  atmOpacity: { value: 0.7 },
  atmPowFactor: { value: 4.1 },
  atmMultiplier: { value: 9.5 },
  solarFarmLocation: {lat:-12.46, lon:130.8444},//{lat:-100.4637, lon:130.8444} 12.4637° S, 130.8444
  cameraSatelliteOffset: {r:0.1, lon:-0.1, lat:0.1},
  geosynchronousAltitude: 42.3, // in Earth radii (not kilometers for simplicity)
}
const orbitalParams = {
  a: params.geosynchronousAltitude, // Semi-major axis in km
  e: 0, // Eccentricity
  i: 0, // Inclination in degrees
  Ω: 10, // Right ascension of ascending node in degrees
  ω: 0, // Argument of perigee in degrees
  M0: 0, // Mean anomaly at epoch in degrees
};

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
let camera = createCamera(45, 0.1, 1000000, LonLatToCart(params.geosynchronousAltitude+params.cameraSatelliteOffset.r, params.solarFarmLocation.lon+params.cameraSatelliteOffset.lon,params.solarFarmLocation.lat+params.cameraSatelliteOffset.lat,false))




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
    this.sunLight.position.set(...LonLatToCart(params.SunOrbit,90,0,true))
    
    

    let SunGeo = new THREE.SphereGeometry(params.SunRadius, 64, 64)
    let SunMat = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        atmOpacity: params.atmOpacity,
        atmPowFactor: params.atmPowFactor,
        atmMultiplier: params.atmMultiplier
    },
    // notice that by default, Three.js uses NormalBlending, where if your opacity of the output color gets lower, the displayed color might get whiter
    blending: THREE.AdditiveBlending, // works better than setting transparent: true, because it avoids a weird dark edge around the earth
    side: THREE.BackSide // such that it does not overlays on top of the earth; this points the normal in opposite direction in vertex shader
    })
    this.Sun = new THREE.Mesh(SunGeo, SunMat)
    this.Sun.position.set(...LonLatToCart(params.SunOrbit,90,0,true))

    scene.add(this.sunLight)
    scene.add(this.Sun)


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
    this.solarfarm.position.set(...LonLatToCart(params.EarthRadius, params.solarFarmLocation.lon,params.solarFarmLocation.lat,true))
    
    this.earth.group.add(this.solarfarm)

    scene.add(this.earth.group) 
    

  //   //Add Satellite
  //   // Create the satellite
    const loader = new GLTFLoader();
    var url = "" + new URL( './assets/GeoSat.gltf', import.meta.url );
    this.satelliteGroup = new THREE.Group()
    let glfft = await loadModel(url)
    this.satellite = glfft.model
    // this.satellite = loader.load(url, function(gltf) { 
    //   gltf.scene.scale.set(1, 1, 1);
    //   return gltf.scene;
    // });
    //this.satellite.scale.set(1, 1, 1);
    this.satellite.position.set(...LonLatToCart(params.geosynchronousAltitude, params.solarFarmLocation.lon,params.solarFarmLocation.lat,true)); // Adjust accordingly
    this.satellite.rotateX(Math.PI/2)
    this.satellite.rotateZ(-Math.PI/2)

    this.satelliteGroup.add(this.satellite);
    
    // Create the laser beam
    const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.lasertarget = new THREE.Vector3(0,0,0)
    this.lasersource = new THREE.Vector3(0,0,0)
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([
        this.lasertarget,
        this.lasersource 
      ]);
    this.laser = new THREE.Line(laserGeometry, laserMaterial);
    
    scene.add(this.laser)
    scene.add(this.satelliteGroup)
    
      


    
    Gui(scene, camera, document.body,params,orbitalParams)

    
    this.markerg = new THREE.SphereGeometry(0.1, 32, 32); // Small sphere
    this.markerm = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
    

   

    await updateLoadingProgressBar(1.0, 100)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    
    //this.solarfarm.position.set(...LonLatToCart(params.EarthRadius, params.solarFarmLocation.lon, params.solarFarmLocation.lat,true))
    this.controls.update()
    //this.stats1.update()



    

    
    // this.sunLight.position.set(...LonLatToCart(params.SunOrbit,DegtoLon((-elapsed / params.EarthPeriod * 360) % 360),0,true));
    // this.sunLight.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure the light always points towards the Earth

    // camera.position.set(...LonLatToCart(30,0,-DegtoLon((elapsed / 10 * 360) % 360),true));
    // camera.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure the light always points towards the Earth


    // camera.position.set(this.satelliteGroup.position.x,this.satelliteGroup.position.y,this.satelliteGroup.position.z)

    this.earth.group.rotateY(2*Math.PI/(params.EarthPeriod/interval))
    this.earth.clouds.rotateY(2*Math.PI/(params.EarthPeriod/interval)/10)
    let satellitePosition = getIncrementedPosition(orbitalParams, elapsed, 2*Math.PI/params.EarthPeriod) // Mean motion in degrees per second))
    this.satellite.position.set(satellitePosition.x,satellitePosition.y,satellitePosition.z)
    // this.satellite.position.set(...LonLatToCart(params.geosynchronousAltitude,
    //                                                   DegtoLon(((elapsed / params.EarthPeriod * 360) % 360))+params.solarFarmLocation.lon-180,
    //                                                   0,
    //                                                   true));
    this.satelliteGroup.lookAt(this.sunLight.position); // Ensure the light always points towards the Earth
    this.solarfarm.getWorldPosition(this.lasertarget)
    this.satellite.getWorldPosition(this.lasersource)
    scene.remove(this.laser)
    const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    // this.lasertarget = new THREE.Vector3(0,0,0)
    //this.lasersource = new THREE.Vector3(50,0,0)
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([
        this.lasertarget,
        this.lasersource // End at the Earth's center
      ]);
    this.laser = new THREE.Line(laserGeometry, laserMaterial);
    scene.add(this.laser)
    let marker = new THREE.Mesh(this.markerg, this.markerm);
    marker.position.set(this.lasersource.x,this.lasersource.y,this.lasersource.z)
    scene.add(marker)

    // camera.position.set(...LonLatToCart(params.geosynchronousAltitude+1,
    //                             (DegtoLon((elapsed / params.EarthPeriod * 360) % 360)+params.solarFarmLocation.lon)+0.4,
    //                             0.4,
    //                             true));                              
    // camera.lookAt(new THREE.Vector3(0, 0, 0)); // Ensure the light always points towards the Earth

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
