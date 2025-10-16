// Local storage helpers
const store = {
  get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch{ return def }},
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
  remove(key){ localStorage.removeItem(key) }
};

if(!store.get('reservations')) store.set('reservations', []);

window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', render);

function go(hash){ location.hash = hash }

function render(){
  const route = (location.hash.replace('#','') || 'auth').split('?')[0];
  const app = document.getElementById('app');
  app.innerHTML = '';
  if(route==='auth') return screenAuth(app);
  if(route==='home') return screenHome(app);
  if(route==='form') return screenForm(app);       // Form kamar (JS Hotel)
  if(route==='contact') return screenContact(app); // Form kontak + Kirim
  return screenAuth(app);
}

/* ---------------- AUTH ---------------- */
function screenAuth(root){
  const wrap = el('div',{class:'card', style:'max-width:520px;margin:40px auto;position:relative'});
  const title = el('h2',{class:'section-title', textContent:'Masuk'});

  // Fields
  const nameField = field('Nama','text','reg_name'); // only visible in register
  nameField.group.style.display='none';

  const email = field('Email','email','email');
  const pass  = field('Password','password','password');

  const btn = el('button',{class:'btn btn-block mt-16', textContent:'Login'});
  const toggle = el('p',{class:'center mt-8', innerHTML:'Belum punya akun? <a id=\"tog\" href=\"#\">Daftar</a>'});

  let isReg=false;
  toggle.querySelector('#tog').onclick = (e)=>{
    e.preventDefault();
    isReg=!isReg;
    title.textContent = isReg ? 'Daftar' : 'Masuk';
    btn.textContent   = isReg ? 'Daftar' : 'Login';
    nameField.group.style.display = isReg ? 'block' : 'none';
    toggle.innerHTML = isReg ? 'Sudah punya akun? <a id=\"tog\" href=\"#\">Login</a>' : 'Belum punya akun? <a id=\"tog\" href=\"#\">Daftar</a>';
    toggle.querySelector('#tog').onclick = arguments.callee;
  };

  btn.onclick = ()=>{
    const creds = { email: email.input.value.trim(), password: pass.input.value };
    if(isReg){
      const full = { ...creds, name: nameField.input.value.trim() };
      if(!full.name || !full.email || !full.password) return alert('Lengkapi semua kolom');
      store.set('user', full);
      alert('Registrasi berhasil. Silakan login.');
      // Switch to login
      isReg=false; title.textContent='Masuk'; btn.textContent='Login'; nameField.group.style.display='none';
    }else{
      const s = store.get('user');
      if(s && s.email===creds.email && s.password===creds.password){ go('home') }
      else alert('Email atau password salah');
    }
  };

  wrap.append(title, nameField.group, email.group, pass.group, btn, toggle);
  root.append(wrap);
}

/* ---------------- HOME ---------------- */
function screenHome(root){
  const u = store.get('user');
  if(!u) return go('auth');

  const container = el('div',{class:'list'});
  const header = el('div',{class:'header-pad'});
  header.append(el('h1',{textContent:'Reservasi Hotel'}));
  container.append(header);

  const section = el('div',{class:'card', style:'margin-top:20px'});
  section.append(el('h2',{class:'section-title', textContent:'Reservasi Saya'}));

  const box = el('div');
  const reservations = store.get('reservations',[]);

  if(reservations.length===0){
    box.append(el('p',{class:'item-sub',textContent:'Belum ada reservasi. Tekan tombol di bawah untuk menambah.'}));
  }else{
    reservations.forEach((r, idx)=>{
      const item = el('div',{class:'card-item'});
      const left = el('div',{class:'item-left'});
      left.append(el('div',{class:'hotel-icon', textContent:'🏨'}));
      const text = el('div');
      text.append(el('div',{class:'item-title', textContent:'Hotel Santika' in r ? 'Hotel Santika' : r.hotel})); // backward safety
      text.append(el('div',{class:'item-sub', textContent:`(${r.room})`}));
      text.append(el('div',{class:'item-sub', textContent:`${r.checkIn} ➔ ${r.checkOut}`}));
      text.append(el('div',{class:'item-sub', textContent:`${r.guests} tamu`}));
      left.append(text);

      const actions = el('div',{class:'actions'});
      const edit = el('button',{class:'btn gray', textContent:'Edit'});
      const del  = el('button',{class:'btn danger', textContent:'Hapus'});
      edit.onclick=()=>{
        store.set('draft', r);
        store.set('editIndex', idx);
        go('form');
      };
      del.onclick=()=>{
        const next = reservations.filter((_,i)=>i!==idx);
        store.set('reservations', next);
        render();
      };
      actions.append(edit, del);

      item.append(left, actions);
      box.append(item);
    });
  }

  section.append(box);
  section.append(el('button',{class:'btn btn-block mt-16', textContent:'+ Tambah Reservasi', onclick:()=>{
    store.set('draft', { hotel:'JS Hotel' }); // start fresh draft
    store.remove('editIndex');
    go('form');
  }}));
  container.append(section);
  root.append(container);
}

/* ----------- FORM 1: Kamar/ Tanggal (JS Hotel tetap) ----------- */
function screenForm(root){
  const wrap = el('div',{class:'card', style:'max-width:560px; position:relative'});
  wrap.append(el('h2',{class:'section-title',textContent:'Reservasi Hotel'}));

  const hotelLabel = el('p',{class:'item-sub', textContent:'Hotel: JS Hotel'}); // fixed
  const roomType  = selectField('Standard','Tipe Kamar',['Standard','Deluxe','Suite']);

  const dates = el('div',{class:'row'});
  const ci = field('Check-in','date','checkin');
  const co = field('Check-out','date','checkout');

  // defaults + draft restore
  const d = store.get('draft', { hotel:'JS Hotel' });
  if(d.checkIn){ ci.input.value=d.checkIn } else ci.input.value=new Date().toISOString().slice(0,10);
  if(d.checkOut){ co.input.value=d.checkOut } else co.input.value=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
  if(d.room){ roomType.select.value=d.room }
  const guests = field('Jumlah Tamu','number','guests'); guests.input.min=1; guests.input.value=d.guests||2;

  dates.append(ci.group, co.group);

  const row = el('div',{class:'row mt-12'});
  const save = el('button',{class:'btn col', textContent:'Simpan'});
  const cancel = el('button',{class:'btn secondary col', textContent:'Batal', onclick:()=>go('home')});

  save.onclick=()=>{
    const partial = {
      hotel: 'JS Hotel',
      room: roomType.select.value,
      checkIn: ci.input.value,
      checkOut: co.input.value,
      guests: Number(guests.input.value||1)
    };
    store.set('draft', { ...store.get('draft',{}), ...partial });
    go('contact');
  };

  row.append(save,cancel);
  wrap.append(hotelLabel, roomType.group, dates, guests.group, el('hr',{class:'sep'}), row);
  root.append(wrap);
}

/* ----------- FORM 2: Kontak (Kirim) ---------- */
function screenContact(root){
  const wrap = el('div',{class:'card', style:'max-width:520px; position:relative'});
  wrap.append(el('h2',{class:'section-title',textContent:'Buat Reservasi'}));
  wrap.append(el('p',{class:'item-sub',textContent:'Isi data di bawah ini untuk melanjutkan'}));

  const d = store.get('draft', {});
  const name = field('Nama','text','name'); name.input.value = d.contact?.name || '';
  const email = field('Email','email','email'); email.input.value = d.contact?.email || '';
  const phone = field('Nomor HP','tel','phone'); phone.input.value = d.contact?.phone || '';

  const row = el('div',{class:'row mt-12'});
  const send = el('button',{class:'btn col', textContent:'Kirim'});
  const back = el('button',{class:'btn secondary col', textContent:'Kembali', onclick:()=>go('form')});

  send.onclick = ()=>{
    const payload = {
      contact: { name: name.input.value.trim(), email: email.input.value.trim(), phone: phone.input.value.trim() }
    };
    if(!payload.contact.name || !payload.contact.email || !payload.contact.phone) return alert('Lengkapi semua kolom');
    const final = { ...store.get('draft',{}), ...payload };

    const editIndex = store.get('editIndex', null);
    const list = store.get('reservations',[]);
    if(Number.isInteger(editIndex)){
      list[editIndex] = final;
    }else{
      list.push(final);
    }
    store.set('reservations', list);
    store.remove('draft'); store.remove('editIndex');
    go('home');
  };

  row.append(send, back);
  wrap.append(name.group, email.group, phone.group, el('hr',{class:'sep'}), row);
  root.append(wrap);
}

/* ---------------- UI helpers ---------------- */
function el(tag, attrs={}, ...children){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') node.className=v;
    else if(k==='style') node.setAttribute('style',v);
    else if(k.startsWith('on')) node[k]=v;
    else if(k==='textContent') node.textContent=v;
    else if(k==='innerHTML') node.innerHTML=v;
    else node.setAttribute(k,v);
  });
  children.forEach(c=> node.append(c));
  return node;
}
function field(labelText, type, id){
  const group = document.createElement('div'); group.className='mt-12';
  const label = document.createElement('label'); label.setAttribute('for', id); label.textContent=labelText;
  const input = document.createElement('input'); input.id=id; input.type=type; input.placeholder=labelText;
  group.append(label,input);
  return {group, input};
}
function selectField(value, labelText, options){
  const group = document.createElement('div'); group.className='mt-12';
  const label = document.createElement('label'); label.textContent=labelText;
  const select = document.createElement('select');
  options.forEach(o=>{ const op=document.createElement('option'); op.value=o; op.textContent=o; select.append(op); });
  select.value=value;
  group.append(label, select);
  return {group, select};
}
