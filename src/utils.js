export const LonLatToCart = (radius, lon, lat, return_array) => {
    const lonRad = (lon) * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    
    res = {
        x:radius * Math.cos(latRad) * Math.cos(lonRad),
        y:radius * Math.cos(latRad) * Math.sin(lonRad),
        z:radius * Math.sin(latRad)
       }   ;
    if (return_array)  return [res.x, res.y, res.z];
    else  return res;
}
export const DegtoLon = (deg)=>{
    return deg > 180 ? deg - 360 : deg;
} 
