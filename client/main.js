const API_URL = 'https://picsum.photos/v2/list?page=1&limit=40';
const STORAGE = {
  USERS: 'insta_users_v1',
  CURRENT: 'insta_current_v1',
  POSTS: 'insta_posts_v1'
};

const sampleTags = ['#nature','#travel','#photo','#city','#people','#food','#art','#cute','#landscape','#pets','#sunset','#fashion'];

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

function save(key, val){localStorage.setItem(key, JSON.stringify(val))}
function load(key, def=null){const v=localStorage.getItem(key);return v?JSON.parse(v):def}

function showAlert(msg, kind='is-info'){
  const container = $('#alertContainer');
  container.innerHTML = `<div class="notification ${kind}">${msg}</div>`;
  setTimeout(()=>container.innerHTML='',3000);
}

// User management
function initUsers(){if(!load(STORAGE.USERS)) save(STORAGE.USERS, []);} 
function signup(username,password){
  const users = load(STORAGE.USERS) || [];
  if(!username||!password) return {ok:false,msg:'Enter username and password'};
  if(users.find(u=>u.username===username)) return {ok:false,msg:'Username exists'};
  users.push({username,password,avatar:`https://i.pravatar.cc/80?u=${encodeURIComponent(username)}`});
  save(STORAGE.USERS,users);
  return {ok:true,msg:'Account created'};
}
function login(username,password){
  const users = load(STORAGE.USERS) || [];
  const u = users.find(x=>x.username===username && x.password===password);
  if(!u) return {ok:false,msg:'Invalid credentials'};
  save(STORAGE.CURRENT,u);
  return {ok:true,msg:'Logged in',user:u};
}
function logout(){localStorage.removeItem(STORAGE.CURRENT);} 
function currentUser(){return load(STORAGE.CURRENT,null)}

// Posts management
function initPosts(){
  if(load(STORAGE.POSTS)) return; // keep existing
  fetch(API_URL).then(r=>r.json()).then(data=>{
    const posts = data.map((img,i)=>({
      id:`p_${img.id}_${i}`,
      imgId:img.id,
      url:`https://picsum.photos/id/${img.id}/800/800`,
      author: img.author,
      avatar:`https://i.pravatar.cc/80?u=${encodeURIComponent(img.author)}`,
      caption:`Photo by ${img.author}`,
      tags: randomTags(),
      likes:[],
      comments:[]
    }));
    save(STORAGE.POSTS,posts);
    renderFeed();
  }).catch(err=>{
    showAlert('Failed to fetch images, try again later','is-danger');
  });
}

function randomTags(){
  const shuffled = sampleTags.sort(()=>0.5-Math.random());
  const count = Math.floor(Math.random()*3)+1;
  return shuffled.slice(0,count);
}

function renderFeed(filter=''){
  const feed = $('#feed');
  const posts = load(STORAGE.POSTS,[]);
  const user = currentUser();
  const q = filter.trim().toLowerCase();
  let filtered = posts;
  if(q){
    filtered = posts.filter(p=> p.caption.toLowerCase().includes(q) || p.tags.some(t=>t.toLowerCase().includes(q)) );
  }
  feed.innerHTML = '';
  filtered.forEach(post=>{
    const wrapper = document.createElement('div');
    wrapper.className = 'post-wrapper';
    wrapper.innerHTML = renderPostCard(post,user);
    feed.appendChild(wrapper);
  });
  attachPostHandlers();
  renderUserInfo();
}

function renderPostCard(post,user){
  const liked = user && post.likes.includes(user.username);
  return `
  <div class="card post-card" data-id="${post.id}">
    <div class="card-header">
      <div class="card-header-title">
        <div class="post-meta">
          <figure class="image is-32x32"><img src="${post.avatar}"/></figure>
          <strong>${post.author}</strong>
        </div>
      </div>
    </div>
    <div class="card-image">
      <figure class="image is-4by3">
        <img src="${post.url}" alt="${post.caption}">
      </figure>
    </div>
    <div class="card-content">
      <div class="content">
        <div class="buttons is-small">
          <button class="button like-btn ${liked? 'is-active':''}" data-id="${post.id}"><span class="icon"><i class="fas fa-heart"></i></span></button>
          <button class="button comment-open" data-id="${post.id}"><span class="icon"><i class="fas fa-comment"></i></span></button>
          <button class="button share-btn" data-id="${post.id}"><span class="icon"><i class="fas fa-share"></i></span></button>
        </div>
        <div class="likes"><strong>${post.likes.length}</strong> likes</div>
        <div class="caption">${post.caption}</div>
        <div class="hashtags">${post.tags.map(t=>`<span class="tag hashtag" data-tag="${t}">${t}</span>`).join(' ')}</div>
        <div class="show-more-wrap"><button class="show-more-btn" data-id="${post.id}">Show more</button></div>
        <div class="comments" id="c_${post.id}">${post.comments.map(c=>`<div class="comment"><strong>${c.user}:</strong> ${escapeHtml(c.text)}</div>`).join('')}</div>
        <div class="pt-3">
          <div class="field has-addons">
            <div class="control is-expanded"><input class="input comment-input" placeholder="Add a comment..." data-id="${post.id}"/></div>
            <div class="control"><button class="button is-info comment-submit" data-id="${post.id}">Post</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function attachPostHandlers(){
  $all('.like-btn').forEach(b=>b.onclick=()=>toggleLike(b.dataset.id));
  $all('.comment-submit').forEach(b=>b.onclick=()=>submitComment(b.dataset.id));
  $all('.comment-open').forEach(b=>{b.onclick=()=>{const el=document.querySelector(`#c_${b.dataset.id}`);el && el.scrollIntoView({behavior:'smooth',block:'center'});} });
  $all('.hashtag').forEach(h=>h.onclick=()=>{ $('#searchInput').value = h.dataset.tag; renderFeed(h.dataset.tag); });
  $all('.share-btn').forEach(b=>b.onclick=()=>sharePost(b.dataset.id));
  $all('.show-more-btn').forEach(btn=>btn.onclick=()=>{
    const id = btn.dataset.id;
    const card = document.querySelector(`.post-card[data-id="${id}"]`);
    if(!card) return;
    const content = card.querySelector('.card-content');
    if(!content) return;
    const expanded = content.classList.toggle('expanded');
    btn.textContent = expanded ? 'Show less' : 'Show more';
  });
}

function toggleLike(postId){
  const user = currentUser();
  if(!user){showAlert('Login to like posts','is-warning'); return}
  const posts = load(STORAGE.POSTS,[]);
  const p = posts.find(x=>x.id===postId); if(!p) return;
  const idx = p.likes.indexOf(user.username);
  if(idx>=0) p.likes.splice(idx,1); else p.likes.push(user.username);
  save(STORAGE.POSTS,posts); renderFeed($('#searchInput').value||'');
}

function submitComment(postId){
  const user = currentUser();
  if(!user){showAlert('Login to comment','is-warning'); return}
  const input = document.querySelector(`.comment-input[data-id="${postId}"]`);
  if(!input) return;
  const text = input.value.trim(); if(!text) return;
  const posts = load(STORAGE.POSTS,[]);
  const p = posts.find(x=>x.id===postId); if(!p) return;
  p.comments.push({user:user.username,text});
  save(STORAGE.POSTS,posts); input.value=''; renderFeed($('#searchInput').value||'');
}

function sharePost(postId){
  const posts = load(STORAGE.POSTS,[]);
  const p = posts.find(x=>x.id===postId); if(!p) return;
  const url = p.url;
  if(navigator.share){navigator.share({title:p.caption,text:p.tags.join(' '),url}).then(()=>showAlert('Shared'))}else{
    navigator.clipboard.writeText(url).then(()=>showAlert('Image link copied to clipboard'))
  }
}

// UI wiring
function renderUserInfo(){
  // Always show static profile name and avatar per request
  const profileNav = $('#profileNav');
  profileNav.innerHTML = `<figure class="image is-40x40"><img src="https://i.pravatar.cc/40?u=lina_nour" alt="lina nour"/></figure><div class="profile-info"><strong>lina nour</strong></div>`;
  // hide new-post for this simplified demo
  $all('.is-logged-out').forEach(el => el.classList.add('is-hidden'));
  if($('#menuNewPost')) $('#menuNewPost').classList.add('is-hidden');
}

function setupDom(){
  // modals
  function openModal(sel){document.querySelector(sel).classList.add('is-active')}
  function closeModal(sel){document.querySelector(sel).classList.remove('is-active')}
  function wireModal(id, openBtn, submitBtn){
    const btn = $(openBtn);
    if(btn) btn.onclick = ()=>openModal(id);
    $all(`${id} .delete, ${id} .cancel, ${id} .modal-background`).forEach(el=>el.onclick=()=>closeModal(id));
  }
  wireModal('#modalSignup','#btnSignup','#submitSignup');
  wireModal('#modalLogin','#btnLogin','#submitLogin');

  // signup
  $('#submitSignup').onclick = ()=>{
    const u = $('#suUsername').value.trim(); const p = $('#suPassword').value;
    const res = signup(u,p);
    showAlert(res.msg, res.ok? 'is-success':'is-danger');
    if(res.ok){ closeModal('#modalSignup'); $('#suUsername').value=''; $('#suPassword').value=''; }
  };
  // login
  $('#submitLogin').onclick = ()=>{
    const u = $('#liUsername').value.trim(); const p = $('#liPassword').value;
    const res = login(u,p);
    showAlert(res.msg, res.ok? 'is-success':'is-danger');
    if(res.ok){ closeModal('#modalLogin'); $('#liUsername').value=''; $('#liPassword').value=''; renderFeed($('#searchInput').value||''); }
  };

  // sidebar menu
  $all('.menu-list a').forEach(a => a.onclick = (e)=>{
    e.preventDefault();
    $all('.menu-list a').forEach(x => x.classList.remove('is-active'));
    a.classList.add('is-active');
    const id = a.id;
    if(id === 'menuHome') renderFeed('');
    else if(id === 'menuDiscover') showAlert('Feature coming soon','is-info');
    else if(id === 'menuSearch'){ const q = prompt('Search posts:'); if(q) renderFeed(q); }
    else if(id === 'menuNewPost'){
      const url = prompt('Enter image URL:');
      if(url){
        const user = currentUser();
        if(!user) return;
        const posts = load(STORAGE.POSTS,[]);
        posts.unshift({
          id:`p_${Date.now()}`,
          imgId:Date.now(),
          url,
          author: user.username,
          avatar: user.avatar,
          caption: prompt('Add a caption:') || '',
          tags: randomTags(),
          likes:[],
          comments:[]
        });
        save(STORAGE.POSTS,posts);
        renderFeed('');
        showAlert('Post created!','is-success');
      }
    }
    else if(id === 'menuSettings') showAlert('Settings feature coming soon','is-info');
  });

  // search
  $('#searchInput').addEventListener('keyup',e=>{ if(e.key==='Enter'){ renderFeed($('#searchInput').value||''); } });

  // profileNav click behaviour: open login modal if not logged
  const profileNav = $('#profileNav');
  if(profileNav){
    profileNav.onclick = ()=>{
      const u = currentUser();
      if(!u){
        // open login modal
        const modal = document.querySelector('#modalLogin'); if(modal) modal.classList.add('is-active');
      } else {
        // if logged, clicking avatar toggles logout link focus
        const logout = $('#btnLogout'); if(logout) logout.scrollIntoView({behavior:'smooth',block:'center'});
      }
    };
  }
}

// init
document.addEventListener('DOMContentLoaded',()=>{
  initUsers();
  setupDom();
  const posts = load(STORAGE.POSTS);
  if(!posts) initPosts(); else renderFeed();
});
