const {db, createTable} = require('./db');
const crypto = require('crypto');

async function seed(){
  await createTable();

  // sample comptes
  const accounts = [
    { id: 'u_lina', name: 'lina', email: 'lina@example.com', mdp: 'password123' },
    { id: 'u_william', name: 'william', email: 'william@example.com', mdp: 'password123' },
    { id: 'u_kerian', name: 'kerian', email: 'kerian@example.com', mdp: 'password123' }
  ];

  for(const a of accounts){
    const exists = await db('comptes').where({ id: a.id }).first();
    if(!exists) await db('comptes').insert(a);
  }

  // sample posts (using picsum images)
  const sampleImages = [
    'https://picsum.photos/id/1025/800/800',
    'https://picsum.photos/id/1011/800/800',
    'https://picsum.photos/id/1003/800/800',
    'https://picsum.photos/id/1005/800/800'
  ];

  for(let i=0;i<sampleImages.length;i++){
    const id = `p_seed_${i}`;
    const exists = await db('posts').where({ id }).first();
    if(!exists){
      const post = { id, image: sampleImages[i], id_compte: accounts[i % accounts.length].id };
      await db('posts').insert(post);
    }
  }

  // add sample likes and comments
  const likes = [
    { id: crypto.randomUUID(), id_post: 'p_seed_0', id_compte: 'u_bob' },
    { id: crypto.randomUUID(), id_post: 'p_seed_0', id_compte: 'u_carol' },
    { id: crypto.randomUUID(), id_post: 'p_seed_1', id_compte: 'u_alice' }
  ];
  for(const l of likes){
    const e = await db('likes').where({ id: l.id }).first();
    if(!e){
      // prevent duplicate (unique constraint on id_compte+id_post) - use try/catch
      try{ await db('likes').insert(l); }catch(err){}
    }
  }

  const comments = [
    { id: crypto.randomUUID(), id_post: 'p_seed_0', id_compte: 'u_alice', commentaire: 'Amazing photo!' },
    { id: crypto.randomUUID(), id_post: 'p_seed_1', id_compte: 'u_bob', commentaire: 'Love this!' }
  ];
  for(const c of comments){
    const e = await db('commentaires').where({ id: c.id }).first();
    if(!e) await db('commentaires').insert(c);
  }

  console.log('Seeding completed');
  process.exit(0);
}

seed().catch(err=>{console.error('Seed error',err); process.exit(1)});
