/*
La table commentaire contient l’ID du post et l’ID du compte qui l’a écrit.

La table likes contient l’ID du post et l’ID du compte qui a liké.

Les likes vont être comptés selon le nombre de fois où l’ID du compte est répété.
*/
const express = require('express');
const path = require('path');

const {db, createTable} = require('./db')
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.json())

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "login.html"));
});

/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un post
app.post('/addPost', async (req, res) => {
    try {
        const { image, id_compte, caption } = req.body;

        // Vérifier si le compte existe
        const compte = await db("comptes").where({ id: id_compte }).first();
        if (!compte) {
            return res.status(400).json({ error: "id_compte n'existe pas" });
        }

        // Création du post
        const post = {
        id: crypto.randomUUID(),
        image: String(image || "https://picsum.photos/400/280?random=" + Math.floor(Math.random()* 1000)),
        id_compte,
        caption: caption || `Photo by ${compte.name}`
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
        // Récupère tous les posts puis enrichit avec info compte, likes et commentaires
        const rawPosts = await db('posts').select('*').orderBy('created_at', 'desc');

        const posts = await Promise.all(rawPosts.map(async (p) => {
            // récupère le compte auteur
            const compte = await db('comptes').where({ id: p.id_compte }).first();
            const author = compte ? compte.name : 'unknown';
            // Utilise l'avatar personnalisé de la BD, sinon Pravatar par défaut
            const avatar = (compte && compte.avatar) ? compte.avatar : `https://i.pravatar.cc/80?u=${encodeURIComponent(author)}`;

            // récupère les likes (liste des comptes qui ont liké)
            const likesRows = await db('likes').where({ id_post: p.id }).select('id_compte');
            const likes = await Promise.all(likesRows.map(async (lr) => {
                const c = await db('comptes').where({ id: lr.id_compte }).first();
                return c ? c.name : lr.id_compte;
            }));

            // récupère les commentaires
            const commentairesRows = await db('commentaires').where({ id_post: p.id }).orderBy('created_at','asc');
            const comments = await Promise.all(commentairesRows.map(async (cmt) => {
                const c = await db('comptes').where({ id: cmt.id_compte }).first();
                return { user: c ? c.name : cmt.id_compte, text: cmt.commentaire };
            }));

            // Extract hashtags from caption if any
            const caption = p.caption || `Photo by ${author}`;
            const hashtagRegex = /#[\wÀ-ÿ]+/g;
            const tags = caption.match(hashtagRegex) || [];

            return {
                id: p.id,
                url: p.image,
                author,
                avatar,
                caption: caption,
                tags: tags,
                likes,
                comments
            };
        }));

        res.status(200).json(posts);
    } catch(err){
        console.error('Erreur /allPost', err);
        res.status(500).json({error: 'Erreur serveur..' })
    }
});

/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un like
app.post('/addLike/:id', async (req, res) => {
    try {
        // L'ID du post
        const id_post = req.params.id;
        const { id_compte } = req.body;

        // Empêche like double
        const alreadyLiked = await db("likes").where({ id_post, id_compte }).first();
        if (alreadyLiked) {
            return res.status(400).json({ error: "Déjà liké" });
        }

        // Vérifier si le compte existe
        const compte = await db("comptes").where({ id: id_compte }).first();
        if (!compte) {
            return res.status(400).json({ error: "id_compte n'existe pas" });
        }

        // Vérifier si le post existe
        const post = await db("posts").where({ id: id_post }).first();
        if (!post) {
            return res.status(400).json({ error: "id_post n'existe pas" });
        }

        // Création du like
        const like = {
            id: crypto.randomUUID(),
            id_post,
            id_compte
        }

        await db("likes").insert(like);
        res.status(201).json(like);
    } catch(err) {
        console.error("Erreur /addLike/:id", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation des likes
app.get('/count_Like/:id', async (req, res) => {
    try {
        // L'ID du post
        const id_post = req.params.id;

        const count = await db("likes").where({ id_post }).count({ nb: "*" }).first();
        res.status(200).json(count.nb)
    } catch(err){
        console.error("Erreur /count_Like/:id", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Delete like
app.delete("/deletelike/:id", async(req, res) => {
    try {
        // Récupérer l'ID du like
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

// Delete post
app.delete('/deletePost/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_compte } = req.body;
        
        // Vérifier que le post appartient à l'utilisateur
        const post = await db('posts').where({ id }).first();
        if(!post) {
            return res.status(404).json({ error: 'Post introuvable' });
        }
        
        if(post.id_compte !== id_compte) {
            return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres posts' });
        }
        
        await db('posts').where({ id }).del();
        res.status(200).json({ message: 'Post supprimé' });
    } catch(err) {
        console.error('Erreur /deletePost/:id', err);
        res.status(500).json({ error: 'Erreur serveur..' });
    }
});

// Toggle like: if user already liked -> remove, else add
app.post('/toggleLike/:id', async (req, res) => {
    try {
        const id_post = req.params.id;
        const { id_compte } = req.body;
        if(!id_compte) return res.status(400).json({ error: 'id_compte requis' });

        const like = await db('likes').where({ id_post, id_compte }).first();
        if(like){
            // delete
            await db('likes').where({ id_post, id_compte }).del();
            const count = await db('likes').where({ id_post }).count({ nb: '*' }).first();
            return res.status(200).json({ liked: false, likesCount: count.nb });
        } else {
            const newLike = { id: crypto.randomUUID(), id_post, id_compte };
            await db('likes').insert(newLike);
            const count = await db('likes').where({ id_post }).count({ nb: '*' }).first();
            return res.status(201).json({ liked: true, likesCount: count.nb });
        }
    } catch(err){
        console.error('Erreur /toggleLike/:id', err);
        res.status(500).json({ error: 'Erreur serveur..' });
    }
});

/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un commentaire
app.post('/addCommentaire/:id', async (req, res) => {
    try {
        const id_post = req.params.id;
        const { id_compte, commentaire } = req.body;

        // Vérifier si le compte existe
        const compte = await db("comptes").where({ id: id_compte }).first();
        if (!compte) {
            return res.status(400).json({ error: "id_compte n'existe pas" });
        }

        // Vérifier si le post existe
        const post = await db("posts").where({ id: id_post }).first();
        if (!post) {
            return res.status(400).json({ error: "id_post n'existe pas" });
        }

        // Création du commentaire
        const commentaire_tmp = {
            id: crypto.randomUUID(),
            id_post,
            id_compte,
            commentaire
        }

        await db("commentaires").insert(commentaire_tmp);
        res.status(201).json(commentaire_tmp);
    } catch(err) {
        console.error("Erreur /addCommentaire/:id", err);
        res.status(500).json({error: "Erreur serveur.." })
    }
});

// Récuperation de la table "commentaires" pour un post
app.get('/allCommentaireByPost/:id', async (req, res) => {
    try {
        const id_post = req.params.id;
        const commentaires = await db("commentaires").where({ id_post }).select( "*" );
        res.status(200).json(commentaires)
    } catch(err){
        console.error("Erreur /allCommentaireByPost/:id", err);
        res.status(500).json({ error: "Erreur serveur.." })
    }
});
/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
// Ajout d'un compte
app.post('/addcompte', async (req, res) => {
    try {
        const { id, name, email, mdp } = req.body;

        const compte = {
            id,
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
// connexion au compte
app.post('/login', async (req, res) => {
    try {
        const { email, name, mdp } = req.body;

        if ((!email && !name) || !mdp) {
            return res.status(400).json({ error: "Email ou nom et mot de passe requis" });
        }

        // Chercher le compte par email OU nom
        const compte = await db("comptes")
            .where(builder => {
                if(email) builder.orWhere({ email });
                if(name) builder.orWhere({ name });
            })
            .first();

        if (!compte) {
            return res.status(401).json({ error: "Compte introuvable" });
        }

        if (compte.mdp !== mdp) {
            return res.status(401).json({ error: "Mot de passe incorrect" });
        }

        // Tout est OK  renvoyer le compte
        res.status(200).json({
            id: compte.id,
            name: compte.name,
            email: compte.email
        });

    } catch (err) {
        console.error("Erreur /login", err);
        res.status(500).json({ error: "Erreur serveur.." });
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

// Update compte profile
app.put('/updatecompte/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, avatar } = req.body;

        const compte = await db("comptes").where({ id }).first();
        if (!compte) {
            return res.status(404).json({ error: "Compte introuvable" });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (avatar !== undefined) updates.avatar = avatar;

        if (Object.keys(updates).length > 0) {
            await db("comptes").where({ id }).update(updates);
        }

        const updatedCompte = await db("comptes").where({ id }).first();
        res.status(200).json(updatedCompte);
    } catch(err) {
        console.error("Erreur /updatecompte/:id", err);
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
