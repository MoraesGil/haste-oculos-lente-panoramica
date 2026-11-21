// Vistas ortográficas da lente. X é transversal, +Y aponta para o rosto e +Z para cima.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs = {}, value) {
    const element = document.createElementNS(ns, tag);
    for (const [key, v] of Object.entries(attrs)) element.setAttribute(key, v);
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function painter(id, params, edit) {
    const svg = document.getElementById(id);
    svg.replaceChildren();
    const defs = el('defs');
    const marker = el('marker', {id: id+'-arrow', viewBox:'0 0 7 6', refX:6, refY:3, markerWidth:7, markerHeight:6, markerUnits:'userSpaceOnUse', orient:'auto-start-reverse'});
    marker.append(el('path', {d:'M0 0 L7 3 L0 6 L1.7 3Z',fill:'#93421e'}));
    defs.append(marker); svg.append(defs);
    function add(tag, attrs, value) { const node = el(tag, attrs, value); svg.append(node); return node; }
    function contour(points, cls) { return add('polygon', {points:points.map(p=>p.join(',')).join(' '),class:cls}); }
    function line(x1,y1,x2,y2,cls='witness') { return add('line',{x1,y1,x2,y2,class:cls}); }
    function arrow(x1,y1,x2,y2) {
      const url='url(#'+id+'-arrow)';
      return add('line',{x1,y1,x2,y2,class:'dimline','marker-start':url,'marker-end':url});
    }
    function caption(x,y,text,anchor='middle') {return add('text',{x,y,'text-anchor':anchor,class:'view-caption'},text);}
    function label(key,x,y,display,description) {
      const derived = key === 'near_distance';
      const txt = display;
      const w = Math.max(37,txt.length*7.6+17);
      const g=add('g',{class:derived?'dim-tag derived':'dim-tag',transform:'translate('+x+' '+y+')'});
      {
        g.setAttribute('tabindex','0'); g.setAttribute('role','button');g.dataset.measure=key;
        g.setAttribute('aria-label','Editar '+description+', '+txt);
        const open=()=>edit(key,g);
        g.addEventListener('click',open);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
      }
      g.append(el('title',{},description),el('rect',{x:-w/2-3,y:-14,width:w+6,height:28,fill:'transparent'}),el('rect',{x:-w/2,y:-10.5,width:w,height:21,rx:4,class:'tag-face'}),el('text',{'text-anchor':'middle',y:4.2},txt));
      return g;
    }
    const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:3});
    function tag(key,x,y,description){ return label(key,x,y,fmt(params[key]),description); }
    return {contour,line,arrow,caption,tag,label,fmt};
  }
  function samples(a,b,n,fn){ return Array.from({length:n+1},(_,i)=>fn(a+(b-a)*i/n)); }
  function front(p, edit) {
    const g=painter('draw-front',p,edit), half=p.chord/2, scale=292/150, cx=182, top=99, x=v=>cx+scale*v;
    const lower=v=>{
      const u=Math.min(1,Math.abs(v)/half), side=p.insertion+3.8;
      return top+scale*(side+(p.nose+16-side)*Math.sqrt(Math.max(0,1-u**3))-16*Math.exp(-((u/.15)**2)));
    };
    g.contour([[x(-half),top],[x(half),top],...samples(half,-half,175,v=>[x(v),lower(v)])],'lens-outline');
    const crest=top-scale*(p.raised-p.edge);
    for(const c of [-p.spacing,0,p.spacing]) {
      const l=x(c-p.boss_width/2),r=x(c+p.boss_width/2);
      g.contour([[l,top],[l,crest],[r,crest],[r,top]],'boss-outline');
      g.line(x(c),57,x(c),crest-2);
    }
    const l=x(-half),r=x(half),left=x(-p.spacing),right=x(p.spacing);
    g.line(l,top-3,l,22);g.line(r,top-3,r,22);g.arrow(l,25,r,25);g.tag('chord',cx,25,'Largura da lente em X');
    g.arrow(left,58,cx,58);g.arrow(cx,58,right,58);
    g.tag('spacing',(left+cx)/2,58,'Distância do centro à trava esquerda em X');
    g.tag('spacing',(right+cx)/2,58,'Distância do centro à trava direita em X');
    const bwl=x(-p.spacing-p.boss_width/2),bwr=x(-p.spacing+p.boss_width/2);
    g.line(bwl,crest,bwl,120);g.line(bwr,crest,bwr,120);g.arrow(bwl,117,bwr,117);
    g.line(bwl-1,117,bwl-11,129,'leader');g.tag('boss_width',bwl-23,139,'Largura da trava em X');
    const ny=lower(0);
    g.line(cx,ny,x(20),ny);g.arrow(x(17),top,x(17),ny);g.tag('nose',x(17),(top+ny)/2,'Altura do topo da aba ao recorte do nariz');
    g.caption(cx,201,'Eixo X · entre os centros das três travas');
  }
  function plan(p,edit) {
    const g=painter('draw-plan',p,edit),half=p.chord/2,s=292/150,cx=182;
    const rail=window.lensPlanTrace(p.chord,p.sag);
    // +Y para cima nesta vista: o centro da lente fica à frente das pontas.
    const pt=(x,d)=>[cx+s*x,140-s*(rail.y(x)-rail.y(0)+d)];
    const band=(a,b,lo,hi,n)=>[...samples(a,b,n,x=>pt(x,lo)),...samples(b,a,n,x=>pt(x,hi))];
    const tip=p.insertion, face=tip-p.shoulder;
    g.contour(band(-half,half,tip-p.side_depth,tip,120),'lens-outline');
    for(const c of [-p.spacing,0,p.spacing])g.contour(band(c-p.boss_width/2,c+p.boss_width/2,face,face+p.boss_depth,12),'boss-outline');
    const l=pt(-half,tip),r=pt(half,tip),center=pt(0,tip);
    g.line(l[0],l[1],r[0]+4,r[1],'construction');
    g.caption(cx,r[1]-12,'Régua entre as pontas');
    g.line(cx+7,r[1],cx+7,r[1]+7,'leader');g.line(cx+7,r[1]+7,cx,r[1]+7,'leader');
    g.arrow(cx,r[1],cx,center[1]);g.tag('sag',cx,(center[1]+r[1])/2,'Flecha estimada, vão a 90 graus da régua até o meio da borda livre da lente');
    g.line(l[0],l[1]+3,l[0],168);g.line(r[0],r[1]+3,r[0],168);g.arrow(l[0],166,r[0],166);
    g.tag('chord',cx,166,'Largura da lente em X');
    g.caption(cx,201,'Vão da régua até o meio da lente · estimado');
  }
  function section(p,edit) {
    const g=painter('draw-section',p,edit),s=29,tip=259, x=d=>tip-(p.insertion-d)*s, z=h=>146-h*16;
    const front=p.insertion-p.side_depth, face=p.insertion-p.shoulder, near=face+p.boss_depth;
    const xa=x(front),xb=x(face),xc=x(near),floor=z(0),flat=z(p.edge),crest=z(p.raised);
    g.contour([[xa,flat],[xb,flat],[xb,crest],[xc,crest],[xc,flat],[tip,flat],[tip,floor],[x(front+p.edge),floor],[x(front+p.edge),floor+9],[xa,floor+9]],'lens-outline');
    g.contour([[xb,flat],[xb,crest],[xc,crest],[xc,flat]],'boss-outline');
    g.line(xb,crest-2,xb,24);g.line(tip,flat-2,tip,24);g.arrow(xb,26,tip,26);g.tag('shoulder',(tip+xb)/2,26,'Da ponta livre à face distante da trava em Y');
    g.line(xc,crest-3,xc,55);g.arrow(xb,57,xc,57);g.line(xb,57,xb-13,57,'leader');g.tag('boss_depth',xb-34,57,'Comprimento da trava em Y');
    g.line(xc,flat+3,xc,84);g.line(tip,flat-1,tip,84);g.arrow(xc,81,tip,81);
    g.label('near_distance',(xc+tip)/2,81,g.fmt(p.shoulder-p.boss_depth),'Distância calculada da ponta livre ao início da trava');
    g.line(xa,flat,49,flat);g.line(xa,floor,49,floor);g.arrow(52,flat,52,floor);g.tag('edge',52,(flat+floor)/2,'Espessura da aba lisa em Z');
    g.line(xc+1,crest,306,crest);g.line(tip+2,floor,306,floor);g.arrow(303,crest,303,floor);g.tag('raised',303,(crest+floor)/2,'Espessura total com a trava em Z');
    g.line(x(0),floor+9,x(0),175);g.line(tip,floor+1,tip,175);g.arrow(x(0),173,tip,173);g.tag('insertion',(x(0)+tip)/2,173,'Entrada em Y a partir da boca da canaleta');
    g.caption(x(0),201,'Boca do canal');g.caption(tip,201,'Ponta livre');
    document.getElementById('near-note').textContent='Ponta livre até a face próxima = '+g.fmt(p.shoulder)+' − '+g.fmt(p.boss_depth)+' = '+g.fmt(p.shoulder-p.boss_depth)+' mm.';
  }
  window.drawSheets=(p,edit)=>{front(p,edit);plan(p,edit);section(p,edit);};
})();
