import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import {LonLatToCart,DegtoLon} from "./utils.js"

export const Gui = (scene, camera, container,params,orbitalParams)=>{
    // GUI controls
    const gui = new dat.GUI()
    // gui.add(params, "sunIntensity", 0.0, 5.0, 0.1).onChange((val) => {
    //   scene.sunLight.intensity = val
    // }).name("Sun Intensity")
    // gui.add(params, "metalness", 0.0, 1.0, 0.05).onChange((val) => {
    //   earthMat.metalness = val
    // }).name("Ocean Metalness")
    gui.add(params, "EarthPeriod", 1, 30.0, 1).name("Rotation Period")
    gui.add(params.solarFarmLocation, "lon", -180, 180, 0.1).name("Longitude")
    gui.add(params.solarFarmLocation, "lat", -90, 90, 0.1).name("Latitude")
    
    gui.add(params.cameraSatelliteOffset, "r", -2, 2, 0.1).onChange((val) => {
      camera.position.set(...LonLatToCart(params.geosynchronousAltitude+val, params.solarFarmLocation.lon,params.solarFarmLocation.lat,true))
    }).name("r")
    gui.add(params.cameraSatelliteOffset, "lon", -2, 2, 0.1).onChange((val) => {
      camera.position.set(...LonLatToCart(params.geosynchronousAltitude+params.cameraSatelliteOffset.r, params.solarFarmLocation.lon+val,params.solarFarmLocation.lat,true))
    }).name("lon")
    gui.add(params.cameraSatelliteOffset, "lat", -2, 2, 0.1).onChange((val) => {
      camera.position.set(...LonLatToCart(params.geosynchronousAltitude+params.cameraSatelliteOffset.r, params.solarFarmLocation.lon,params.solarFarmLocation.lat-val,true))
    }).name("lat")


    const Orbitfolder = gui.addFolder('Orbit')
    Orbitfolder.add(orbitalParams, "e", 0, 1, 0.01).name("Eccentricity")
    Orbitfolder.add(orbitalParams, "i", -180, 180, 0.1).name("Inclination")
    Orbitfolder.add(orbitalParams, "Ω", 0, 360, 0.1).name("Right Ascension of Ascending Node")
    Orbitfolder.add(orbitalParams, "ω", 0, 360, 0.1).name("Argument of Perigee")
    Orbitfolder.add(orbitalParams, "M0", 0, 2*Math.PI, 0.1).name("Mean Anomaly at Epoch")
    
    Orbitfolder.open()

    // gui.add(params.atmOpacity, "value", 0.0, 1.0, 0.05).name("atmOpacity")
    // gui.add(params.atmPowFactor, "value", 0.0, 20.0, 0.1).name("atmPowFactor")
    // gui.add(params.atmMultiplier, "value", 0.0, 20.0, 0.1).name("atmMultiplier")

    // Stats - show fps
    // this.stats1 = new Stats()
    // this.stats1.showPanel(0) // Panel 0 = fps
    // this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // // this.container is the parent DOM element of the threejs canvas element
    // container.appendChild(this.stats1.domElement)
}