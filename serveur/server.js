/*
Le backend a 2 routes pour les posts : add et all.
2 routes pour les commentaires : add et all.
2 routes pour les comptes : add et all.
Et 3 routes pour les likes : add, all et delete.

La table commentaire contient l’ID du post et l’ID du compte qui l’a écrit.

La table likes contient l’ID du post et l’ID du compte qui a liké.

Les likes vont être comptés selon le nombre de fois où l’ID du compte est répété.
*/
const express = require('express');
const path = require('path');

const {db, createTable} = require('./db')

const app = express();
const PORT = 3000;

app.use(express.json())

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "index.html"));
});

// Ajout d'un post
app.post('/addPost', async (req, res) => {
    try {
        const { image, id_compte } = req.body;

        const post = {
        id: crypto.randomUUID(),
        image: String(image || "https://picsum.photos/400/280?random=" + Math.floor(Math.random()* 1000)),
        id_compte
    }
        await db("posts").insert(post);
        res.status(201).json(post);
    } catch(err) {
        console.error("Erreur /addPost", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation des posts
app.get('/allPost', async (req, res) => {
    try {
        const posts = await db("posts").select("*").orderBy("created_at", "desc");
        res.status(200).json(posts)
    } catch(err){
        console.error("Erreur /allPost", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});
/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un like
app.post('/addLike', async (req, res) => {
    try {
        const { id_post, id_compte } = req.body;

        const like = {
            id: crypto.randomUUID(),
            id_post,
            id_compte
        }

        await db("likes").insert(like);
        res.status(201).json(like);
    } catch(err) {
        console.error("Erreur /addLike", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation des likes
app.get('/allLike', async (req, res) => {
    try {
        const likes = await db("likes").select("*").orderBy("created_at", "desc");
        res.status(200).json(likes)
    } catch(err){
        console.error("Erreur /allLike", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Delete like
app.delete("/deletelike/:id", async(req, res) => {
    try {
        const { id } = req.params
        const deleted =  await db("likes").where({ id }).del()
        if (deleted == 0) {
            return res.status(404).json({error: "like Introuvable.."})
        }
        res.status(200).json({message: "like retirer.."})
    } catch(err) {
        res.status(500).json({error: "Erreur serveur.."})
    }
})
/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un commentaire
app.post('/addCommentaire', async (req, res) => {
    try {
        const { id_post, id_compte, commentaire } = req.body;

        const commentaire_tmp = {
            id: crypto.randomUUID(),
            id_post,
            id_compte,
            commentaire
        }

        await db("commentaires").insert(commentaire_tmp);
        res.status(201).json(commentaire_tmp);
    } catch(err) {
        console.error("Erreur /addCommentaire", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation des commentaires
app.get('/allCommentaire', async (req, res) => {
    try {
        const likes = await db("commentaires").select("*").orderBy("created_at", "desc");
        res.status(200).json(likes)
    } catch(err){
        console.error("Erreur /allCommentaire", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});
/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un compte
app.post('/addcompte', async (req, res) => {
    try {
        const { name, email, mdp } = req.body;

        const compte = {
            id: crypto.randomUUID(),
            name,
            email,
            mdp
        }

        await db("comptes").insert(compte);
        res.status(201).json(compte);
    } catch(err) {
        console.error("Erreur /addcompte", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation des commentaires
app.get('/allcompte', async (req, res) => {
    try {
        const likes = await db("comptes").select("*").orderBy("created_at", "desc");
        res.status(200).json(likes)
    } catch(err){
        console.error("Erreur /allcompte", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});
/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
createTable()
.then(()=>{
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
})
.catch((err)=>{
    console.error("Erreur au demarrage du schema", err);
    process.exit(1);
})
