import * as T from 'three';
export function createTrain(){
 const root=new T.Group(),body=new T.Group();root.add(body);
 const materials={orange:new T.MeshStandardMaterial({color:0xc35d3d,roughness:.85,flatShading:true}),roof:new T.MeshStandardMaterial({color:0x343b3d,roughness:1,flatShading:true}),blue:new T.MeshStandardMaterial({color:0x81959d,roughness:.9,flatShading:true}),glass:new T.MeshStandardMaterial({color:0xdde9e6,roughness:.5,flatShading:true}),gold:new T.MeshStandardMaterial({color:0xc6ac7a,metalness:.25,roughness:.7}),wheel:new T.MeshStandardMaterial({color:0x343637,roughness:1,flatShading:true})};
 function box(parent:T.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function cylinder(parent:T.Group,r1:number,r2:number,h:number,x:number,y:number,z:number,mat:T.Material,axis='y'){const mesh=new T.Mesh(new T.CylinderGeometry(r1,r2,h,12),mat);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 // Engine faces right. A single blue carriage follows behind it.
 box(body,74,6,22,27,15,0,materials.roof);
 cylinder(body,13,13,37,42,29,0,materials.orange,'x');
 cylinder(body,11,11,3,62,29,0,materials.roof,'x');
 box(body,24,30,25,8,31,0,materials.orange);
 box(body,31,4,30,8,48,0,materials.roof);
 box(body,11,13,1,10,36,13,materials.glass);
 box(body,1,13,14,21,36,0,materials.glass);
 cylinder(body,4,5,16,51,48,0,materials.roof);
 cylinder(body,7,6,4,51,57,0,materials.roof);
 cylinder(body,5,5,5,32,44,0,materials.gold);
 box(body,10,4,26,69,14,0,materials.orange);
 box(body,43,24,24,-48,28,0,materials.blue);
 box(body,49,4,28,-48,42,0,materials.roof);
 for(const x of [-59,-44])box(body,10,10,1,x,31,12.5,materials.glass);
 box(body,50,5,25,-48,15,0,materials.roof);
 box(root,19,3,4,-13,13,0,materials.gold);
 const wheels:T.Group[]=[];
 for(const [x,r] of [[3,9],[25,9],[50,9],[-62,8],[-35,8]])for(const z of [-13,13]){
  const wheel=new T.Group();wheel.position.set(x,r,z);cylinder(wheel,r,r,4,0,0,0,materials.wheel,'z');cylinder(wheel,2.2,2.2,4.5,0,0,0,materials.gold,'z');
  box(wheel,r*1.4,1.5,4.6,0,0,0,materials.gold);wheel.userData.radius=r;root.add(wheel);wheels.push(wheel);
 }
 const rod=box(root,49,2,3,26,9,16,materials.gold);
 const smoke=Array.from({length:4},(_,i)=>{const m=new T.Mesh(new T.IcosahedronGeometry(3.5,0),new T.MeshBasicMaterial({color:0xa7aaa3,transparent:true,opacity:.15,depthWrite:false}));m.userData.phase=i/4;root.add(m);return m;});
 root.rotation.y=-.18;
 return {root,body,wheels,rod,smoke};
}
