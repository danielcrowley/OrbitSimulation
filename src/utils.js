export const LonLatToCart = (radius, lon, lat, return_array) => {
    const lonRad = (lon+180) * Math.PI / 180;
    const latRad = (90-lat) * Math.PI / 180;
    
    res = {
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
