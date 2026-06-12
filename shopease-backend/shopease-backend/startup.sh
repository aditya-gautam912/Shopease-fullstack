#!/usr/bin/env bash
set -e

# Run pending migrations
npx sequelize-cli db:migrate

# Seed only if database is empty (first deploy)
PRODUCT_COUNT=$(node -e "const{sequelize}=require('./src/config/db');(async()=>{await sequelize.authenticate();const[r]=await sequelize.query(\"SELECT COUNT(*)::int AS c FROM products\");console.log(r[0].c);process.exit(0)})()" 2>/dev/null || echo "0")
if [ "$PRODUCT_COUNT" = "0" ]; then
  echo "🌱  Empty database detected — seeding..."
  node seed/seed.js
fi

exec node server.js
