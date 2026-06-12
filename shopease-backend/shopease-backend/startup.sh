#!/usr/bin/env bash
# Run pending migrations, then start the server
npx sequelize-cli db:migrate
exec node server.js
