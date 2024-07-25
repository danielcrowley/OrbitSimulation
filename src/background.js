import { loadTexture } from "./common-utils"
import GaiaSky from "./assets/Gaia_EDR3_darkened.png"


export class Background {
    constructor() {
        
    }
    async init(){
        const envMap = await loadTexture(GaiaSky)
        envMap.mapping = THREE.EquirectangularReflectionMapping
    return envMap
    }
}
