// Fit a complete composition inside the available graph area. Endpoints share
// the same protected rectangle, so linear interpolation also stays inside it.
export function fitLayout(frame, dimensions, {width, height, padding=16, maxScale=1}) {
  let unit=maxScale;
  frame.forEach(([x,y,scale],i)=>{
    const halfW=dimensions[i].width*scale/2;
    const halfH=dimensions[i].height*scale/2;
    unit=Math.min(unit,(x*width-padding)/halfW,((1-x)*width-padding)/halfW,
      (y*height-padding)/halfH,((1-y)*height-padding)/halfH);
  });
  unit=Math.max(0,unit);
  return frame.map(([x,y,scale,opacity])=>({x:x*width,y:y*height,scale:scale*unit,opacity}));
}

// Retiring nodes follow the lower-left orbit, with all rotated corners kept
// inside the graph. The same deterministic path plays backwards on scroll-up.
export function orbitPose(from,to,t,{width,height,nodeWidth,nodeHeight,padding=16,depthFrom=0,depthTo=0}) {
  const mix=(a,b)=>a+(b-a)*t;
  const depth=mix(depthFrom,depthTo);
  const bend=depthTo>depthFrom?Math.sin(Math.PI*t):0;
  const angle=-Math.min(28,depth*14),r=angle*Math.PI/180;
  const rawWidth=Math.abs(Math.cos(r))*nodeWidth+Math.abs(Math.sin(r))*nodeHeight;
  const rawHeight=Math.abs(Math.sin(r))*nodeWidth+Math.abs(Math.cos(r))*nodeHeight;
  const s=Math.max(0,Math.min(mix(from.scale,to.scale),(width-padding*2)/rawWidth,(height-padding*2)/rawHeight));
  const halfW=rawWidth*s/2,halfH=rawHeight*s/2;
  const x=Math.max(padding+halfW,Math.min(width-padding-halfW,mix(from.x,to.x)-width*.07*bend));
  const y=Math.max(padding+halfH,Math.min(height-padding-halfH,mix(from.y,to.y)+height*.13*bend));
  return {x,y,s,o:mix(from.opacity,to.opacity),angle};
}
