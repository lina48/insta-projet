let comptes = [];

// DOM
const formLogin = document.querySelector('form');
const emailOrNameInput = document.getElementById('emailOrName');
const passwordInput = document.getElementById('password');

// Crée un petit conteneur pour les erreurs
let errorMsg = document.createElement('p');
errorMsg.id = 'errorMsg';
errorMsg.style.color = 'red';
formLogin.prepend(errorMsg);

// Fonction utilitaire pour afficher erreur
function showError(msg){
    errorMsg.textContent = msg;
}

// Détecte si c’est un email
function isEmail(str){
    return /\S+@\S+\.\S+/.test(str);
}

// Login
async function login(event){
    event.preventDefault();

    const emailOrName = emailOrNameInput.value.trim();
    const mdp = passwordInput.value.trim();

    if(!emailOrName || !mdp){
        showError("Veuillez remplir tous les champs");
        return;
    }

    // Préparer le body
    const bodyData = isEmail(emailOrName) 
        ? { email: emailOrName, mdp }
        : { name: emailOrName, mdp };

    try{
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await res.json();
        console.log("Donnée récupérer")
        if(res.ok){
            // Stocke le compte complet dans localStorage
            localStorage.setItem('currentAccount', JSON.stringify(data));

            // Redirection vers index.html
            window.location.href = '/index.html';
        } else {
            showError(data.error || "Erreur inconnue");
        }
    } catch(err){
        console.error("Erreur login :", err);
        showError("Impossible de se connecter au serveur");
    }
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
    formLogin.addEventListener('submit', login);
});