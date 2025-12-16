// URL de test pour récupérer des images aléatoires (utilisé seulement comme fallback)
const API_URL = 'https://picsum.photos/v2/list?page=1&limit=40';

// tags d'exemple utilisés pour générer des tags aléatoires si nécessaire
const sampleTags = ['#nature','#travel','#photo','#city','#people','#food','#art','#cute','#landscape','#pets','#sunset','#fashion'];

// raccourcis DOM : sélection d'un seul élément
function $(sel){return document.querySelector(sel)}

// Raccourci DOM : sélection de plusieurs éléments (retourne un tableau)
function $all(sel){return Array.from(document.querySelectorAll(sel))}

// compte à partir du serveur 
// objet représentant le compte courant (stocké en localStorage après login)
let currentAccount = null; 

// tableau contenant les posts récupérés depuis le serveur (cache côté client)
let latestPosts = [];

// affiche une notification temporaire en haut du feed
// msg: texte à afficher
// kind: classe Bulma pour le style 
function showAlert(msg, kind='is-info'){
  const container = $('#alertContainer');
  if(container) container.innerHTML = `<div class="notification ${kind}">${msg}</div>`;
  
  setTimeout(()=>{ if(container) container.innerHTML=''; },3000);
}


function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// genere ensemble de tags pour le test 
function randomTags(){
  const shuffled = sampleTags.sort(()=>0.5-Math.random());
  const count = Math.floor(Math.random()*3)+1;
  return shuffled.slice(0,count);
}

// récupère le compte courant depuis localStorage.
// si aucun compte n'est présent, redirige vers la page de login.
async function fetchCurrentAccount(){
  try{
    // supprime uniquement la clé 'currentAccount'
    // localStorage.clear();
    // récupère le compte depuis localStorage (défini lors du login)
    const storedAccount = localStorage.getItem('currentAccount');
    if(storedAccount){
      currentAccount = JSON.parse(storedAccount);
    } else {
      // Si pas de compte stocké, rediriger vers login
      window.location.href = '/login.html';
      return;
    }
  }catch(err){
    console.error('fetchCurrentAccount error', err);
    currentAccount = null;
    window.location.href = '/login.html';
  }
  renderUserInfo();
}

// récupère la liste des posts sur le serveur 
// et met à jour `latestPosts` puis le rendu du feed.
async function fetchPostsFromServer(){
  try{
    const res = await fetch('/allPost');
    if(!res.ok) throw new Error('Failed to fetch posts from server');
    const serverPosts = await res.json();
    latestPosts = (serverPosts || []).map(p=>({
      id: p.id,
      url: p.url,
      author: p.author,
      avatar: p.avatar || (`https://i.pravatar.cc/80?u=${encodeURIComponent(p.author)}`),
      caption: p.caption || '',
      tags: p.tags || [],
      likes: p.likes || [],
      comments: (p.comments||[]).map(c=>({ user: c.user, text: c.text }))
    }));
    renderFeed(latestPosts);
  }catch(err){
    console.error('fetchPostsFromServer error', err);
    showAlert('Impossible de charger les posts depuis le serveur','is-danger');
  }
}


function renderFeed(posts, filter=''){
  const feed = $('#feed');
  const user = currentAccount;
  const q = (filter||'').trim().toLowerCase();
  let filtered = posts || [];
  if(q){
    filtered = filtered.filter(p=> (p.caption||'').toLowerCase().includes(q) || (p.tags||[]).some(t=>t.toLowerCase().includes(q)) );
  }
  if(!feed) return;
  feed.innerHTML = '';
  filtered.forEach(post=>{
    const wrapper = document.createElement('div');
    wrapper.className = 'post-wrapper';
    wrapper.innerHTML = renderPostCard(post,user);
    feed.appendChild(wrapper);
  });
  attachPostHandlers();
}


function renderPostCard(post,user){
  const liked = user && post.likes && post.likes.includes(user.name);
  const isOwner = user && post.author === user.name;
  return `
  <div class="card post-card" data-id="${post.id}">
    <div class="card-header">
      <div class="card-header-title">
        <div class="post-meta">
          <figure class="image is-32x32"><img src="${post.avatar}"/></figure>
          <strong>${escapeHtml(post.author)}</strong>
        </div>
        ${isOwner ? `<button class="delete is-medium delete-post-btn" data-id="${post.id}" aria-label="delete" title="Supprimer ce post"></button>` : ''}
      </div>
    </div>
    <div class="card-image">
      <figure class="image is-4by3">
        <img src="${post.url}" alt="${escapeHtml(post.caption)}">
      </figure>
    </div>
    <div class="card-content">
      <div class="content">
        <div class="buttons is-small">
          <button class="button like-btn ${liked? 'is-active':''}" data-id="${post.id}"><span class="icon"><i class="fas fa-heart"></i></span></button>
          <button class="button comment-open" data-id="${post.id}"><span class="icon"><i class="fas fa-comment"></i></span></button>
          <button class="button share-btn" data-id="${post.id}"><span class="icon"><i class="fas fa-share"></i></span></button>
        </div>
        <div class="likes"><strong>${post.likes?post.likes.length:0}</strong> likes</div>
        <div class="caption">${escapeHtml(post.caption)}</div>
        <div class="hashtags">${(post.tags||[]).map(t=>`<span class="tag hashtag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ')}</div>
        <div class="show-more-wrap"><button class="show-more-btn" data-id="${post.id}">Show more</button></div>
        <div class="comments" id="c_${post.id}">${(post.comments||[]).map(c=>`<div class="comment"><strong>${escapeHtml(c.user)}:</strong> ${escapeHtml(c.text)}</div>`).join('')}</div>
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



function attachPostHandlers(){
  $all('.like-btn').forEach(b=>b.onclick=()=>toggleLike(b.dataset.id));
  $all('.comment-submit').forEach(b=>b.onclick=()=>submitComment(b.dataset.id));
  $all('.comment-open').forEach(b=>{b.onclick=()=>{const el=document.querySelector(`#c_${b.dataset.id}`);el && el.scrollIntoView({behavior:'smooth',block:'center'});} });
  $all('.hashtag').forEach(h=>h.onclick=()=>{ $('#searchInput').value = h.dataset.tag; renderFeed(latestPosts,h.dataset.tag); });
  $all('.share-btn').forEach(b=>b.onclick=()=>sharePost(b.dataset.id));
  $all('.delete-post-btn').forEach(b=>b.onclick=()=>deletePost(b.dataset.id));
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

// basculer le like pour le post donné pour l'utilisateur courant.
// envoie la requête au serveur et recharge le feed après succès.
async function toggleLike(postId){
  if(!currentAccount){ showAlert('pas de compte disponible ','is-warning'); return }
  try{
    const res = await fetch(`/toggleLike/${encodeURIComponent(postId)}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id_compte: currentAccount.id })
    });
    if(!res.ok) throw new Error('Erreur like');
    await fetchPostsFromServer();
  }catch(err){
    console.error('toggleLike error', err);
    showAlert('Impossible de liker pour le moment','is-danger');
  }
}

// envoie un commentaire pour le post donné et recharge le feed.
async function submitComment(postId){
  if(!currentAccount){ showAlert('No account available to comment','is-warning'); return }
  const input = document.querySelector(`.comment-input[data-id="${postId}"]`);
  if(!input) return;
  const text = input.value.trim(); if(!text) return;
  try{
    const res = await fetch(`/addCommentaire/${encodeURIComponent(postId)}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id_compte: currentAccount.id, commentaire: text })
    });
    if(!res.ok) throw new Error('Erreur commentaire');
    input.value='';
    await fetchPostsFromServer();
  }catch(err){
    console.error('submitComment error', err);
    showAlert("Impossible d'envoyer le commentaire",'is-danger');
  }
}


function sharePost(postId){
  const p = latestPosts.find(x=>x.id===postId); if(!p) return;
  const url = p.url;
  if(navigator.share){navigator.share({title:p.caption,text:(p.tags||[]).join(' '),url}).then(()=>showAlert('Shared'))}else{
    navigator.clipboard.writeText(url).then(()=>showAlert('Image link copied to clipboard'))
  }
}


async function deletePost(postId){
  if(!currentAccount){ showAlert('No account available','is-warning'); return }
  if(!confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) return;
  
  try{
    const res = await fetch(`/deletePost/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id_compte: currentAccount.id })
    });
    if(!res.ok) {
      const error = await res.json();
      showAlert(error.error || 'Impossible de supprimer le post','is-danger');
      return;
    }
    showAlert('Post supprimé avec succès','is-success');
    await fetchPostsFromServer();
  }catch(err){
    console.error('deletePost error', err);
    showAlert('Impossible de supprimer le post','is-danger');
  }
}

// met à jour la zone de navigation utilisateur (`#profileNav`) avec
// l'avatar et le nom du `currentAccount`.
function renderUserInfo(){
  const profileNav = $('#profileNav');
  if(!profileNav) return;
  if(currentAccount){
    const avatarUrl = currentAccount.avatar || `https://i.pravatar.cc/40?u=${encodeURIComponent(currentAccount.name)}`;
    profileNav.innerHTML = `<figure class="image is-40x40"><img src="${avatarUrl}" alt="${escapeHtml(currentAccount.name)}"/></figure><div class="profile-info"><strong>${escapeHtml(currentAccount.name)}</strong></div>`;
  } else {
    profileNav.innerHTML = `<div class="profile-info"><strong>Guest</strong></div>`;
  }
}

function setupDom(){
  
  function openModal(sel){document.querySelector(sel).classList.add('is-active')}
  function closeModal(sel){document.querySelector(sel).classList.remove('is-active')}
  
  function wireModal(id){
    $all(`${id} .delete, ${id} .cancel, ${id} .modal-background`).forEach(el=>el.onclick=()=>closeModal(id));
  }
  wireModal('#modalSettings');
  wireModal('#modalNewPost');

  $all('.menu-list a').forEach(a => a.onclick = async (e)=>{
    e.preventDefault();
    $all('.menu-list a').forEach(x => x.classList.remove('is-active'));
    a.classList.add('is-active');
    const id = a.id;
    if(id === 'menuHome') renderFeed(latestPosts,'');
    else if(id === 'menuDiscover') showAlert('Feature coming soon','is-info');
    else if(id === 'menuSearch'){ const q = prompt('Search posts:'); if(q) renderFeed(latestPosts,q); }
    else if(id === 'menuNewPost'){
      if(!currentAccount){ showAlert('pas de compte disponible ','is-warning'); return; }
      
      const npc = $('#newpostFormContainer');
      if(npc){
        npc.style.display = 'block';
        const img = $('#newpostImageUrl'); if(img) img.focus();
        // scroll to form
        npc.scrollIntoView({behavior:'smooth', block:'start'});
      } else {
        showAlert('Formulaire de publication introuvable','is-danger');
      }
    }
    else if(id === 'menuSettings') {
      if(!currentAccount){ showAlert('No account available','is-warning'); return; }
      // Pre-fill the settings form
      $('#settingsUsername').value = currentAccount.name || '';
      $('#settingsEmail').value = currentAccount.email || '';
      $('#settingsAvatar').value = currentAccount.avatar || '';
      openModal('#modalSettings');
    }
  });


  // Settings submit handler
  const submitSettings = $('#submitSettings');
  if(submitSettings) submitSettings.onclick = async ()=>{
    if(!currentAccount) return;
    const name = $('#settingsUsername').value.trim();
    const email = $('#settingsEmail').value.trim();
    const avatar = $('#settingsAvatar').value.trim();
    
    try{
      const res = await fetch(`/updatecompte/${currentAccount.id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, avatar })
      });
      if(!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      currentAccount = updated;
      renderUserInfo();
      closeModal('#modalSettings');
      showAlert('Profil mis à jour avec succès!','is-success');
      await fetchPostsFromServer(); // Refresh posts to show updated author names
    }catch(err){
      console.error('updatecompte error', err);
      showAlert('Impossible de mettre à jour le profil','is-danger');
    }
  };


  // Logout handler
  const btnLogout = $('#btnLogout');
  if(btnLogout) btnLogout.onclick = ()=>{
    currentAccount = null;
    localStorage.clear();
    latestPosts = [];
    // Redirect to login page
    window.location.href = '/login.html';
  };

  // search - trigger on every keystroke for live search
  const search = $('#searchInput'); 
  if(search) {
    search.addEventListener('keyup',()=>{ 
      renderFeed(latestPosts, search.value||''); 
    });
  }

  // info sur le compte 
  const profileNav = $('#profileNav');
  if(profileNav){
    profileNav.onclick = ()=>{
      if(!currentAccount){ showAlert('No account selected from server','is-info'); }
      else showAlert(`Logged as ${currentAccount.name}`,'is-info');
    };
  }

  // --- Inline newpost form handlers (top of feed) ---
  const newpostForm = $('#newpostFormContainer');
  const newpostImageUrl = $('#newpostImageUrl');
  const newpostCaption = $('#newpostCaption');
  const newpostPreview = $('#newpostPreview');
  const newpostCancel = $('#newpostCancel');
  const newpostSubmit = $('#newpostSubmit');

  if(newpostCancel && newpostForm){
    newpostCancel.addEventListener('click', ()=>{
      // clear inputs but keep form visible
      if(newpostImageUrl) newpostImageUrl.value = '';
      if(newpostCaption) newpostCaption.value = '';
      if(newpostPreview) newpostPreview.src = `https://picsum.photos/400/280?random=${Math.floor(Math.random()*1000)}`;
      newpostImageUrl && newpostImageUrl.focus();
    });
  }

  if(newpostImageUrl && newpostPreview){
    newpostImageUrl.addEventListener('input', ()=>{
      const v = newpostImageUrl.value.trim();
      if(v) newpostPreview.src = v;
      else newpostPreview.src = `https://picsum.photos/400/280?random=${Math.floor(Math.random()*1000)}`;
    });
  }

  if(newpostSubmit){
    newpostSubmit.addEventListener('click', async ()=>{
      if(!currentAccount){ showAlert('Vous devez être connecté pour publier','is-warning'); return; }
      const image = newpostImageUrl.value.trim();
      const caption = newpostCaption.value.trim();
      if(!image){ showAlert("Veuillez saisir l'URL de l'image","is-warning"); return; }
      try{
        const res = await fetch('/addPost',{
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ image, id_compte: currentAccount.id, caption })
        });
        if(!res.ok) throw new Error('Erreur création post');
        const created = await res.json();
        showAlert('Publication créée','is-success');
        // reset inputs but keep form visible
        newpostImageUrl.value = '';
        newpostCaption.value = '';
        newpostPreview.src = `https://picsum.photos/400/280?random=${Math.floor(Math.random()*1000)}`;
        await fetchPostsFromServer();
      }catch(err){
        console.error('newpost submit error', err);
        showAlert('Impossible de créer la publication','is-danger');
      }
    });
  }
}

// init
document.addEventListener('DOMContentLoaded',async ()=>{
  await fetchCurrentAccount();
  setupDom();
  await fetchPostsFromServer();
});