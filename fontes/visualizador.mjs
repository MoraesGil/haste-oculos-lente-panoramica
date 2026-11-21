import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

function parseStl(buffer) {
  const data = new DataView(buffer), triangles=data.getUint32(80,true);
  if (buffer.byteLength !== 84 + 50*triangles || !triangles) throw new Error("Malha STL incompleta.");
  const xyz = new Float32Array(triangles*9);
  for(let i=0; i<triangles; i++) for(let n=0; n<9; n++) xyz[i*9+n]=data.getFloat32(96+i*50+n*4,true);
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(xyz,3)); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

window.makeViewer = function(canvas, onPick) {
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(0xf8f7f2,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(), group=new T.Group();
  scene.add(group);
  const camera=new T.OrthographicCamera(-120,120,80,-80,0.05,2200);
  camera.up.set(0,0,1);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;controls.minZoom=.25;controls.maxZoom=28;
  let markSpec=null;
  const overlay=document.getElementById('marks');
  function render(){
    renderer.render(scene,camera);
    if(markSpec && window.renderLensMarkers) {
      window.renderLensMarkers(overlay,markSpec,point=>{
        const v=new T.Vector3(...point).project(camera);
        return [(v.x+1)*canvas.clientWidth/2,(1-v.y)*canvas.clientHeight/2];
      });
    } else if(overlay.childNodes.length)overlay.replaceChildren();
  }
  controls.addEventListener('change',render);
  scene.add(new T.HemisphereLight(0xfffcf0,0x8f9fa0,2.25));
  for(const [x,y,z,power] of [[-100,-120,155,2],[50,130,100,1.1]]) {
    const light=new T.DirectionalLight(0xffffff,power);
    light.position.set(x,y,z);scene.add(light);
  }
  const materials={};
  for(const [key,color] of Object.entries({barra:0x32474a,haste_d:0x53696b,haste_e:0x53696b,pino:0xeb7c40,gabarito:0x47746d,lente:0x85bfc0})) {
    materials[key]=new T.MeshStandardMaterial({color,roughness:.56,metalness:.07,
      side:key==='lente'?T.DoubleSide:T.FrontSide,transparent:key==='lente',opacity:key==='lente'?.46:1,depthWrite:key!=='lente'});
  }
  let rightFold=0,leftFold=0;
  let lensOffset=0;
  let span=110, name='conjunto', state=null, explode=false, direction='iso', camReady=false;
  const geos=new Map(), outlines=new Map();
  const outlineMaterial = new T.LineBasicMaterial({color:0x335b56,transparent:true,opacity:.57});
  function size() {
    const w=canvas.clientWidth||400,h=canvas.clientHeight||320;
    renderer.setSize(w,h,false);
    camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;
    camera.updateProjectionMatrix();render();
  }
  const resizeObserver=new ResizeObserver(size);resizeObserver.observe(canvas);
  function configureCamera(view=direction) {
    direction=view;
    const bounds=new T.Box3().setFromObject(group);
    if(bounds.isEmpty())return;
    const centre=bounds.getCenter(new T.Vector3()), extent=bounds.getSize(new T.Vector3());
    const focus=markSpec ? new T.Vector3(...markSpec.a).lerp(new T.Vector3(...markSpec.b),.5) : new T.Vector3(0,5,12);
    const detail=view==='detalhe' && ['conjunto','barra','gabarito','lente'].includes(name);
    const vectors={iso:[.64,-1,.73],frente:[0,-1,.005],topo:[0,-.003,1],interna:[.025,1,-.62],detalhe:markSpec?[.83,-1,.45]:[.72,-1,.30]};
    const v=new T.Vector3(...(vectors[view]||vectors.iso)).normalize();
    const target=detail?focus:centre;
    camera.up.set(0,0,1);
    camera.position.copy(target).addScaledVector(v,320);camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const horizontal=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const vertical=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    const screenExtent=(d)=>Math.abs(d.x)*extent.x+Math.abs(d.y)*extent.y+Math.abs(d.z)*extent.z;
    const aspect=(canvas.clientWidth||400)/(canvas.clientHeight||320);
    span=detail?Math.max(18,30/aspect):Math.max(5,screenExtent(vertical),screenExtent(horizontal)/aspect)*1.12;
    controls.target.copy(target);camera.zoom=1;size();controls.update();camReady=true;
  }
  const add=(key,geom,pos=[0,0,0],flip=false)=>{if(!geom)return;const m=new T.Mesh(geom,materials[key]);m.position.set(...pos);if(flip)m.scale.x=-1;m.userData.part=key;
    if(name==='conjunto' && (key==='haste_d'||key==='haste_e'))m.rotation.z=key==='haste_d'?rightFold:-leftFold;
    if(key==='lente'&&name==='lente'){
      if(!outlines.has(geom))outlines.set(geom,new T.EdgesGeometry(geom,21));
      const edges=new T.LineSegments(outlines.get(geom),outlineMaterial);edges.renderOrder=2;m.add(edges);
    }group.add(m)};
  function rebuild() {
    group.clear();if(!state)return;
    if(name==='conjunto') {
      const px=73.64*state.chord/150.5, delta=explode?15:0;
      add('barra',geos.get('barra'));
      add('lente',geos.get('lente'),[0,lensOffset,0]);
      for(const s of [-1,1]) {
        add(s===1?'haste_d':'haste_e',geos.get('haste_d'),[s*(px+delta),45+(explode?14:0),15],s<0);

      }
    } else add(name,geos.get(name==='haste_e'?'haste_d':name),[0,0,0],name==='haste_e');
    render();
  }
  let down;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  canvas.addEventListener('dblclick',e=>{
    if(name!=='conjunto'||!down)return;
    const r=canvas.getBoundingClientRect();const p=new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    const ray=new T.Raycaster();ray.setFromCamera(p,camera);
    const hit=ray.intersectObjects(group.children)[0];if(hit)onPick(hit.object.userData.part);
  });
  return {present(next,p,showExploded,meshes,fit=false){
    const changed=next!==name||showExploded!==explode;
    for(const [key,data] of Object.entries(meshes)){
      if(geos.get(key)?.userData.source===data)continue;
      const geom=parseStl(data);geom.userData.source=data;const old=geos.get(key);if(outlines.has(old)){outlines.get(old).dispose();outlines.delete(old);}old?.dispose();geos.set(key,geom);
    }
    name=next;state=p;explode=showExploded;rebuild();
    if(changed||!camReady||fit)configureCamera(direction);
  },
  fold(right,left){rightFold=T.MathUtils.degToRad(right);leftFold=T.MathUtils.degToRad(left);
    if(name==='conjunto')for(const m of group.children){
      if(m.userData.part==='haste_d')m.rotation.z=rightFold;
      if(m.userData.part==='haste_e')m.rotation.z=-leftFold;
    }
    render();
  },travel(dy){lensOffset=dy;const lens=group.children.find(m=>m.userData.part==='lente');if(name==='conjunto'&&lens){lens.position.y=dy;render();}},mark(spec){markSpec=spec;render();},view:configureCamera, count:()=>group.children.length};
};
