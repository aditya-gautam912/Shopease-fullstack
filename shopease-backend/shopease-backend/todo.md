# Migration: MongoDB → PostgreSQL

Files to change:
1. package.json - replace mongoose with sequelize + pg
2. .env + .env.example - update MONGO_URI → DATABASE_URL
3. src/config/db.js - rewrite for Sequelize
4. src/models/*.js - all 11 models rewrite
5. src/controllers/*.js - update all DB queries
6. src/middleware/errorHandler.js - update error handling (remove Mongoose-specific)
7. server.js - update imports
8. seed/seed.js - rewrite
9. tests - update as needed
