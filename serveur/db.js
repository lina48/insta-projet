const knex = require('knex');

const db = knex({
    client: 'sqlite3',
    connection: { 
       filename: "./db_insta.sqlite3",
    },
    useNullAsDefault: true
});

// Active les foreign keys
db.raw('PRAGMA foreign_keys = ON');

async function createTable(){

    // Table comptes
    const exist_compte = await db.schema.hasTable("comptes");
    if(!exist_compte){
       await db.schema.createTable("comptes", (table)=>{
             table.string("id").primary();
             table.string("name").notNullable();
             table.decimal("email").notNullable();
             table.string("mdp").notNullable();
             table.timestamp("created_at").defaultTo(db.fn.now());
       });
    }

    // Table posts
    const exist_posts = await db.schema.hasTable("posts");
    if(!exist_posts){
        await db.schema.createTable("posts", (table)=>{
             table.string("id").primary();
             table.string("image").notNullable();
             table.decimal("id_compte").notNullable()
                  .references("id").inTable("comptes")
                  .onDelete("CASCADE")
             table.timestamp("created_at").defaultTo(db.fn.now());
       });
    }

    // Table commentaires
    const exist_commentaire = await db.schema.hasTable("commentaires");
    if(!exist_commentaire){
        await db.schema.createTable("commentaires", (table)=>{
             table.string("id").primary();
             table.string("id_post").notNullable()
                  .references("id").inTable("posts")
                  .onDelete("CASCADE")
             table.string("id_compte").notNullable()
                  .references("id").inTable("comptes")
                  .onDelete("CASCADE")
             table.string("commentaire").notNullable();
             table.timestamp("created_at").defaultTo(db.fn.now());
       });
    }
    
    // Table likes
    const exist_likes = await db.schema.hasTable("likes");
    if(!exist_likes){
        await db.schema.createTable("likes", (table)=>{
             table.string("id").primary();
             table.string("id_post").notNullable()
                  .references("id").inTable("posts")
                  .onDelete("CASCADE")
             table.string("id_compte").notNullable()
                  .references("id").inTable("comptes")
                  .onDelete("CASCADE")
             table.timestamp("created_at").defaultTo(db.fn.now());
       });
    }
}
module.exports = {db, createTable};