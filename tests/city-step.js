const { load } = require('./harness'); const C = load({ seed: 3 }); const S = C.newState(process.env.ERA || 'modern'); S.over = false; C.run(10);
const t = Date.now(); C.run(+process.env.SECS || 30); console.log('step ms', ((Date.now() - t) / ((+process.env.SECS || 30) * 60)).toFixed(3), 'men', S.men.length, 'in', S.men.filter(m => m.cbo && m.cbin).length);
