import { updateLoadingProgressBar } from "./core-utils"
import { loadTexture, loadModel } from "./common-utils"
import Albedo from "./assets/Albedo.jpg"
import Bump from "./assets/Bump.jpg"
import Clouds from "./assets/Clouds.png"
import Ocean from "./assets/Ocean.png"
import NightLights from "./assets/night_lights_modified.png"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"


export class Earth {
    constructor(params) {
        this.params=params
    }
    async create(){
        // loads earth's color map, the basis of how our earth looks like
        const albedoMap = await loadTexture(Albedo)
        albedoMap.colorSpace = THREE.SRGBColorSpace
        // await updateLoadingProgressBar(0.2)

        const bumpMap = await loadTexture(Bump)
        // await updateLoadingProgressBar(0.3)
        
        const cloudsMap = await loadTexture(Clouds)
        // await updateLoadingProgressBar(0.4)

        const oceanMap = await loadTexture(Ocean)
        // await updateLoadingProgressBar(0.5)

        const lightsMap = await loadTexture(NightLights)
        // await updateLoadingProgressBar(0.6)


        this.group = new THREE.Group()
        // earth's axial tilt is 23.5 degrees
        
        
        let earthGeo = new THREE.SphereGeometry(this.params.EarthRadius, 64, 64)
        let earthMat = new THREE.MeshStandardMaterial({
        map: albedoMap,
        bumpMap: bumpMap,
        bumpScale: 0.1, // must be really small, if too high even bumps on the back side got lit up
        roughnessMap: oceanMap, // will get reversed in the shaders
        metalness: this.params.metalness, // gets multiplied with the texture values from metalness map
        metalnessMap: oceanMap,
        emissiveMap: lightsMap,
        emissive: new THREE.Color(0xffff88),
        })
        this.earth = new THREE.Mesh(earthGeo, earthMat)
    this.group.add(this.earth)
        
        let cloudGeo = new THREE.SphereGeometry(this.params.EarthRadius+this.params.CloudAltitude, 64, 64)
        let cloudsMat = new THREE.MeshStandardMaterial({
        alphaMap: cloudsMap,
        transparent: true,
        })
        this.clouds = new THREE.Mesh(cloudGeo, cloudsMat)
    this.group.add(this.clouds)
        
        // set initial rotational position of earth to get a good initial angle
        // this.earth.rotateY(0)
        // this.clouds.rotateY(-0.3)

        let atmosGeo = new THREE.SphereGeometry(this.params.EarthRadius+this.params.AtmosphereAltitude+1.5, 64, 64)
        let atmosMat = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            atmOpacity: this.params.atmOpacity,
            atmPowFactor: this.params.atmPowFactor,
            atmMultiplier: this.params.atmMultiplier
        },
        // notice that by default, Three.js uses NormalBlending, where if your opacity of the output color gets lower, the displayed color might get whiter
        blending: THREE.AdditiveBlending, // works better than setting transparent: true, because it avoids a weird dark edge around the earth
        side: THREE.BackSide // such that it does not overlays on top of the earth; this points the normal in opposite direction in vertex shader
        })
        this.atmos = new THREE.Mesh(atmosGeo, atmosMat)
        this.group.add(this.atmos)

    

        // this.earth.rotation.z = 23.5 / 360 * 2 * Math.PI
        // this.solarfarm.rotateZ = 23.5 / 360 * 2 * Math.PI

        // meshphysical.glsl.js is the shader used by MeshStandardMaterial: https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js
        // shadowing of clouds, from https://discourse.threejs.org/t/how-to-cast-shadows-from-an-outer-sphere-to-an-inner-sphere/53732/6
        // some notes of the negative light map done on the earth material to simulate shadows casted by clouds
        // we need uv_xOffset so as to act as a means to calibrate the offset of the clouds shadows on earth(especially when earth and cloud rotate at different speeds)
        // the way I need to use fracts here is to get a correct calculated result of the cloud texture offset as it moves,
        // arrived at current method by doing the enumeration of cases (writing them down truly helps, don't keep everything in your head!)
        earthMat.onBeforeCompile = function( shader ) {
            shader.uniforms.tClouds = { value: cloudsMap }
            shader.uniforms.tClouds.value.wrapS = THREE.RepeatWrapping;
            shader.uniforms.uv_xOffset = { value: 0 }
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
            #include <common>
            uniform sampler2D tClouds;
            uniform float uv_xOffset;
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
            float roughnessFactor = roughness;
    
            #ifdef USE_ROUGHNESSMAP
    
                vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
                // reversing the black and white values because we provide the ocean map
                texelRoughness = vec4(1.0) - texelRoughness;
    
                // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
                roughnessFactor *= clamp(texelRoughness.g, 0.5, 1.0);
    
            #endif
            `);
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #ifdef USE_EMISSIVEMAP
    
                vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
    
                // Methodology of showing night lights only:
                //
                // going through the shader calculations in the meshphysical shader chunks (mostly on the vertex side),
                // we can confirm that geometryNormal is the normalized normal in view space,
                // for the night side of the earth, the dot product between geometryNormal and the directional light would be negative
                // since the direction vector actually points from target to position of the DirectionalLight,
                // for lit side of the earth, the reverse happens thus emissiveColor would be multiplied with 0.
                // The smoothstep is to smoothen the change between night and day
                
                emissiveColor *= 1.0 - smoothstep(-0.02, 0.0, dot(vNormal, directionalLights[0].direction));
                
                totalEmissiveRadiance *= emissiveColor.rgb;
    
            #endif
    
            // Methodology explanation:
            //
            // Our goal here is to use a “negative light map” approach to cast cloud shadows,
            // the idea is on any uv point on earth map(Point X),
            // we find the corresponding uv point(Point Y) on clouds map that is directly above Point X,
            // then we extract color value at Point Y.
            // We then darken the color value at Point X depending on the color value at Point Y,
            // that is the intensity of the clouds at Point Y.
            //
            // Since the clouds are made to spin twice as fast as the earth,
            // in order to get the correct shadows(clouds) position in this earth's fragment shader
            // we need to minus earth's UV.x coordinate by uv_xOffset,
            // which is calculated and explained in the updateScene()
            // after minus by uv_xOffset, the result would be in the range of -1 to 1,
            // we need to set RepeatWrapping for wrapS of the clouds texture so that texture2D still works for -1 to 0
    
            float cloudsMapValue = texture2D(tClouds, vec2(vMapUv.x - uv_xOffset, vMapUv.y)).r;
            
            // The shadow should be more intense where the clouds are more intense,
            // thus we do 1.0 minus cloudsMapValue to obtain the shadowValue, which is multiplied to diffuseColor
            // we also clamp the shadowValue to a minimum of 0.2 so it doesn't get too dark
            
            diffuseColor.rgb *= max(1.0 - cloudsMapValue, 0.2 );
            
            // adding small amount of atmospheric coloring to make it more realistic
            // fine tune the first constant for stronger or weaker effect
            float intensity = 1.4 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );
            vec3 atmosphere = vec3( 0.3, 0.6, 1.0 ) * pow(intensity, 5.0);
            diffuseColor.rgb += atmosphere;
            `)
    
            // need save to userData.shader in order to enable our code to update values in the shader uniforms,
            // reference from https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_modified.html
           earthMat.userData.shader = shader
        }
    return this
    };
    update (interval){
        const shader = this.earth.material.userData.shader
        if ( shader ) {
          // As for each n radians Point X has rotated, Point Y would have rotated 2n radians.
          // Thus uv.x of Point Y would always be = uv.x of Point X - n / 2π.
          // Dividing n by 2π is to convert from radians(i.e. 0 to 2π) into the uv space(i.e. 0 to 1).
          // The offset n / 2π would be passed into the shader program via the uniform variable: uv_xOffset.
          // We do offset % 1 because the value of 1 for uv.x means full circle,
          // whenever uv_xOffset is larger than one, offsetting 2π radians is like no offset at all.
          let offset = (2*Math.PI/(this.params.EarthPeriod/interval)/10)
          shader.uniforms.uv_xOffset.value += offset % 1
        }

        // // this.group.rotateY(interval * 0.005 * params.speedFactor)
        // this.clouds.rotateY(interval * 0.005 * this.params.speedFactor)
    }
}