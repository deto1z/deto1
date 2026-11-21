// Crea (una sola vez) la cuenta privada del propietario. La contraseña se pide por teclado y solo se guarda su hash (scrypt).
import readline from 'node:readline';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openDb, now } from '../src/db.js';
import { hashPassword, passwordProblem, audit } from '../src/security.js';

const cfg = loadConfig(); const db = openDb(path.join(cfg.dataDir, 'detonador.db'));
if (db.prepare('SELECT 1 FROM users LIMIT 1').get()) { console.log('Ya existe un propietario. Para cambiar la contraseña, borra el archivo de datos solo si estás seguro.'); process.exit(0); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, hidden) => new Promise((res) => { if (!hidden) return rl.question(q, res); process.stdout.write(q); const onData = (c) => { if (['\n', '\r', '\u0004'].includes(String(c))) { process.stdin.off('data', onData); process.stdout.write('\n'); } }; process.stdin.on('data', onData); rl._writeToOutput = () => {}; rl.question('', (a) => { rl._writeToOutput = rl.constructor.prototype._writeToOutput; res(a); }); });
const user = (await ask('Usuario del propietario: ')).trim().toLowerCase();
const pw = await ask('Contraseña (mínimo 12 caracteres): ', true); const pw2 = await ask('Repite la contraseña: ', true);
rl.close();
if (!/^[a-z0-9._-]{3,30}$/.test(user)) { console.error('Usuario inválido (3-30 letras/números . _ -)'); process.exit(1); }
if (pw !== pw2) { console.error('Las contraseñas no coinciden.'); process.exit(1); }
const prob = passwordProblem(pw); if (prob) { console.error(prob); process.exit(1); }
db.prepare('INSERT INTO users(username,pass_hash,created_at) VALUES(?,?,?)').run(user, hashPassword(pw), now());
audit(db, { actor: 'sistema', action: 'propietario.creado', target: user });
console.log('Propietario creado. Ya puedes iniciar el servidor con:  npm run server');
