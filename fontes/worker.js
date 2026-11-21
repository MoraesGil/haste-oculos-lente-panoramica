let wasm, body;
self.onmessage = async e=>{
  const m=e.data;
  if(m.init) {
    wasm=m.wasm;
    body=m.body;
    return;
  }
  try {
    const messages=[];
    const api=await OpenSCAD({wasmBinary:wasm,locateFile:()=>"/openscad.wasm",noInitialRun:true,print:()=>{},printErr:t=>messages.push(t)});
    api.FS.writeFile('/edit.scad',m.header+body);
    const code=api.callMain(['--backend=manifold','--export-format=binstl','-o','/export.stl','/edit.scad']);
    const fail=messages.filter(s=>/ERROR:|unknown (variable|function|module)|undefined operation/i.test(s));
    if(code||fail.length)throw new Error(fail.join(' ').slice(0,350)||'O motor CAD não conseguiu fechar esta peça.');
    const bytes=api.FS.readFile('/export.stl').slice().buffer;
    if(bytes.byteLength<134)throw new Error('A malha está vazia.');
    self.postMessage({job:m.job,bytes},[bytes]);
  }catch(error){self.postMessage({job:m.job,error:String(error.message||error)});}
};
