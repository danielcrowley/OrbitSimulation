export const LonLatToCart = (radius, lon, lat, return_array) => {
    const lonRad = (lon+180) * Math.PI / 180;
    const latRad = (90-lat) * Math.PI / 180;
    
    let res = {
        x:-radius * Math.cos(lonRad) * Math.sin(latRad),
        z:radius * Math.sin(lonRad) * Math.sin(latRad),
        y:radius * Math.cos(latRad)
       }   ;
    if (return_array)  return [res.x, res.y, res.z];
    else  return res;
}
export const DegtoLon = (deg)=>{
    return deg > 180 ? deg - 360 : deg;
} 

//http://en.homasim.com/orbitsimulation.php

// Function to convert degrees to radians
const degToRad = (degrees) => degrees * (Math.PI / 180);

// Function to solve Kepler's Equation for Eccentric Anomaly
const solveKepler = (M, e, tolerance = 1e-6) => {
    let E = M;
    let delta = 1;
    while (Math.abs(delta) > tolerance) {
        delta = E - e * Math.sin(E) - M;
        E -= delta / (1 - e * Math.cos(E));
    }
    return E;
};

// Function to calculate the position in the orbital plane
const calculateOrbitalPosition = (a, e, i, Ω, ω, M) => {
    // Solve Kepler's Equation
    const E = solveKepler(M, e);

    // Calculate the true anomaly
    const ν = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

    // Calculate the distance
    const r = a * (1 - e * Math.cos(E));

    // Position in the orbital plane
    const x_orb = r * Math.cos(ν);
    const y_orb = r * Math.sin(ν);

    // Rotation matrices
    const R1 = new THREE.Matrix4().makeRotationY(degToRad(Ω)); // z and y are swapped to match the coordinate system
    const R2 = new THREE.Matrix4().makeRotationX(degToRad(i));
    const R3 = new THREE.Matrix4().makeRotationY(degToRad(ω)); // z and y are swapped to match the coordinate system

  
    // Position vector in the orbital plane
    const positionOrbitalPlane = new THREE.Vector3(x_orb,0,-y_orb); // z and y are swapped to match the coordinate system

    // Transform to the inertial frame
    positionOrbitalPlane.applyMatrix4(R1).applyMatrix4(R2).applyMatrix4(R3);

    return positionOrbitalPlane;
};

// Function to get the incremented Cartesian position based on elapsed time
export const getIncrementedPosition = (orbitalParams, elapsedTime, n) => {
    const { a, e, i, Ω, ω, M0 } = orbitalParams;


    // Mean anomaly at elapsed time
    const M = M0 + n * elapsedTime;

    // Calculate the position in the inertial frame
    const position = calculateOrbitalPosition(a, e, i, Ω, ω, M);

    return position;
};