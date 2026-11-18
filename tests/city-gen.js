const { load } = require('./harness'); const C = load({ seed: 3 }); const t = Date.now(); C.newState(process.env.ERA || 'ww2'); console.log('gen ms', Date.now() - t);
