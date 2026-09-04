import { syncCommands } from './sync-commands.js';
console.log('Synchronizing Discord slash commands before startup...');
await syncCommands();
await import('./index.js');
