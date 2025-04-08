@echo off
set HOSTNAME=localhost
set APP=pcdc
set NODE_ENV=development
set STORYBOOK_PROJECT_ID=search
set REACT_APP_PROJECT_ID=search
set REACT_APP_DISABLE_SOCKET=true

npm run schema
npm run graphviz-layout
npm run relay
npm run params
npm run sanity-check
npx webpack serve
