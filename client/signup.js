//Le code est en anglais parce-qu'on avait initialement créé le site en anglais. Seuls les charactères visibles dans le site est en français.

const passwordInput = document.getElementById('password');
const createButton = document.getElementById('enterBtn');
const feedbackEl = document.getElementById('passwordFeedback');
const form = document.querySelector('form.box');
const formEmail = document.getElementById("email");
const formName = document.getElementById("name");


let attemptedSubmit = false; //pour que les requirements ne s'affichent pas au première essai.

function getMissingPasswordRequirements(pw) {
  const missing = []; //Variable
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/; //Liste des charactères spéciaux
  const uppercaseRegex = /[A-Z]/; //Liste des majuscules

  //Si requirements is not good, affiche requirement non-respecté
  if (!specialCharRegex.test(pw)) missing.push('Au moins un charactère spécial');
  if (!uppercaseRegex.test(pw)) missing.push('Au moins une lettre majuscule');
  if ((pw || '').length < 8) missing.push('Au minimum 8 charactères');

  return missing;
}

//Si s'est ok ou pas
function renderPasswordFeedback(show) {
  const pw = passwordInput.value || '';
  const missing = getMissingPasswordRequirements(pw);

  if (missing.length === 0) { //Si la liste de missing requirements est vide = password complète!
    feedbackEl.textContent = 'Mot de passe est correct!';
    feedbackEl.classList.remove('is-danger');
    feedbackEl.classList.add('is-success');
    feedbackEl.style.display = show ? 'block' : 'none';
  } else {
    feedbackEl.classList.remove('is-success');
    feedbackEl.classList.add('is-danger');
    feedbackEl.innerHTML =
      '<strong>Nécessités du mot de passe:</strong><br><ul style="margin:0;padding-left:1.25em;">' +
      missing.map(m => `<li>${m}</li>`).join('') +
      '</ul>';
    feedbackEl.style.display = show ? 'block' : 'none';
  }
}

function onPasswordInput() {
  renderPasswordFeedback(attemptedSubmit);
}

if (passwordInput) {
  passwordInput.addEventListener('input', onPasswordInput);
  renderPasswordFeedback(false);
}

function interceptIfInvalid(event) {
  const missing = getMissingPasswordRequirements(passwordInput.value || '');
  if (missing.length > 0) {
    attemptedSubmit = true;
    renderPasswordFeedback(true);
    passwordInput.focus();
    event.preventDefault();
    return true;
  }
  return false;
}

if (form) { //N'execute pas la commande du bouton si les password ne sont pas based
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    console.log('Form submitted!');
    
    if(interceptIfInvalid(event)) {
      console.log('Password validation failed');
      return;
    }
    
    // Récupérer les valeurs du formulaire
    const email = document.getElementById('email').value.trim();
    const name = document.getElementById('name').value.trim();
    const mdp = passwordInput.value.trim();
    
    console.log('Form data:', { email, name, mdp: '***' });
    
    if(!email || !name || !mdp) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      console.log('Sending request to /addcompte...');
      // Créer le compte via l'API
      const res = await fetch('/addcompte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mdp })
      });
      
      console.log('Response status:', res.status);
      
      if(!res.ok) {
        const error = await res.json();
        console.error('Server error:', error);
        alert(error.error || 'Erreur lors de la création du compte');
        return;
      }
      
      const newAccount = await res.json();
      console.log('Account created:', newAccount);
      
      // Stocker le compte dans localStorage
      localStorage.setItem('currentAccount', JSON.stringify(newAccount));
      console.log('Account stored in localStorage');
      
      // Rediriger vers index.html
      console.log('Redirecting to index.html...');
      window.location.href = '/index.html';
      
    } catch(err) {
      console.error('Erreur signup:', err);
      alert('Impossible de créer le compte. Veuillez réessayer.');
    }
  });
} else if (createButton) {
  createButton.addEventListener('click', function (event) {
    interceptIfInvalid(event);
  });
}




// Function to handle image clicks and display descriptions
function handleImageClick(event) {
  const description = event.target.getAttribute('data-description');
  if (description) {
    alert(description);
  }
}

// Attach event listeners to all images with data-description
document.querySelectorAll('img[data-description]').forEach(img => {
  img.addEventListener('click', handleImageClick);
});

