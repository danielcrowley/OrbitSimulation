// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import {LonLatToCart,DegtoLon} from "./utils.js"



// export class Satellite {
//     constructor(params) {
//         this.params=params
//         this.group = new THREE.Group()
//     }
//     async create(target){
//         const loader = new GLTFLoader();
//         var url = "" + new URL( './assets/GEOSat.gltf', import.meta.url );

//         await loader.loadAsync(url)

//         function(gltf) {
//             //this.satelite = gltf.scene;
//             gltf.scene.scale.set(1, 1, 1);
//             gltf.scene.position.set(...LonLatToCart(this.params.geosynchronousAltitude, this.params.solarFarmLocation.lon,this.params.solarFarmLocation.lat,true)); // Adjust accordingly
//             this.group.add(gltf.scene);

//             const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
//             const laserGeometry = new THREE.BufferGeometry().setFromPoints([
//                 this.satelite.position,
//                 new LonLatToCart(this.params.geosynchronousAltitude, this.params.solarFarmLocation.lon,this.params.solarFarmLocation.lat,false) // End at the Earth's center
//                 ]);
//             this.laser = new THREE.Line(laserGeometry, laserMaterial);
//             this.group.add(laser)
//         }, undefined, function(error) {
//             // This function is called if an error occurs
//             console.error('An error happened while loading the GLTF model:', error);
//         })
//     return this
//     }
// }